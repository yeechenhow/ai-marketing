"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessOrgPortal } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireOrgAdmin() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  if (!canAccessOrgPortal(session.user)) throw new Error("Forbidden");
  return session;
}

const stageInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Stage name is required"),
  probability: z.number().min(0).max(1),
  color: z.string().trim().min(1),
});

const saveStagesSchema = z.array(stageInputSchema).min(1, "At least one stage is required");

export async function saveFunnelStages(
  funnelId: string,
  stages: { id?: string; name: string; probability: number; color: string }[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireOrgAdmin();
    const orgId = session.user.organizationId!;

    const parsed = saveStagesSchema.parse(stages);

    const funnel = await db.funnel.findFirst({
      where: { id: funnelId, organizationId: orgId },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    if (!funnel) {
      return { ok: false, error: "Funnel not found" };
    }

    const existingIds = new Set(funnel.stages.map((s) => s.id));
    const keptIds = new Set(
      parsed.filter((s) => s.id && existingIds.has(s.id)).map((s) => s.id as string),
    );
    const deletedStages = funnel.stages.filter((s) => !keptIds.has(s.id));

    await db.$transaction(async (tx) => {
      // Pass 1: park all kept stages at temporary negative orders to avoid
      // colliding with the @@unique([funnelId, order]) constraint while we
      // shuffle / create / delete.
      let temp = -1;
      for (const stage of parsed) {
        if (stage.id && keptIds.has(stage.id)) {
          await tx.funnelStage.update({
            where: { id: stage.id },
            data: { order: temp },
          });
          temp -= 1;
        }
      }

      // Reassign opportunities off deleted stages, then delete those stages.
      if (deletedStages.length > 0) {
        const firstKept = parsed.find((s) => s.id && keptIds.has(s.id));

        for (const deleted of deletedStages) {
          const oppCount = await tx.opportunity.count({
            where: { stageId: deleted.id },
          });

          if (oppCount > 0) {
            if (!firstKept?.id) {
              throw new Error(
                "Cannot delete a stage that still has opportunities without another stage to move them to.",
              );
            }
            await tx.opportunity.updateMany({
              where: { stageId: deleted.id },
              data: { stageId: firstKept.id },
            });
          }

          await tx.funnelStage.delete({ where: { id: deleted.id } });
        }
      }

      // Pass 2: write final order + fields, creating any new stages.
      for (let index = 0; index < parsed.length; index++) {
        const stage = parsed[index]!;
        if (stage.id && keptIds.has(stage.id)) {
          await tx.funnelStage.update({
            where: { id: stage.id },
            data: {
              name: stage.name,
              probability: stage.probability,
              color: stage.color,
              order: index,
            },
          });
        } else {
          await tx.funnelStage.create({
            data: {
              funnelId,
              name: stage.name,
              probability: stage.probability,
              color: stage.color,
              order: index,
            },
          });
        }
      }
    });

    revalidatePath("/org/pipelines");
    revalidatePath(`/org/pipelines/${funnelId}`);
    revalidatePath("/dashboard/pipeline");
    revalidatePath("/manager/pipeline");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save stages",
    };
  }
}
