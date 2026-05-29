"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function moveOpportunityToStage(
  opportunityId: string,
  targetStageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user.organizationId) {
    return { ok: false, error: "Unauthorized" };
  }

  const orgId = session.user.organizationId;

  const opportunity = await db.opportunity.findFirst({
    where: { id: opportunityId, prospect: { organizationId: orgId } },
    include: {
      prospect: true,
      stage: true,
      funnel: { include: { stages: true } },
    },
  });

  if (!opportunity) {
    return { ok: false, error: "Opportunity not found" };
  }

  const targetStage = opportunity.funnel.stages.find((s) => s.id === targetStageId);
  if (!targetStage) {
    return { ok: false, error: "Invalid stage" };
  }

  if (opportunity.stageId === targetStageId) {
    return { ok: true };
  }

  await db.$transaction([
    db.opportunity.update({
      where: { id: opportunityId },
      data: { stageId: targetStageId },
    }),
    db.activity.create({
      data: {
        prospectId: opportunity.prospectId,
        userId: session.user.id,
        type: "STAGE_CHANGE",
        title: `Moved to ${targetStage.name}`,
        body: `Pipeline: ${opportunity.stage.name} → ${targetStage.name}`,
        metadata: {
          opportunityId,
          fromStageId: opportunity.stageId,
          toStageId: targetStageId,
          funnelId: opportunity.funnelId,
        },
      },
    }),
  ]);

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/manager/pipeline");
  revalidatePath(`/dashboard/prospects/${opportunity.prospectId}`);
  revalidatePath(`/org/prospects/${opportunity.prospectId}`);

  return { ok: true };
}
