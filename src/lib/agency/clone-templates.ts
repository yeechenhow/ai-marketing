import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_FUNNEL_STAGES } from "@/lib/constants";

export async function cloneFunnelWithWorkflows(
  sourceFunnelId: string,
  agencyOrgId: string,
  targetOrgId: string,
) {
  const source = await db.funnel.findFirst({
    where: { id: sourceFunnelId, organizationId: agencyOrgId },
    include: {
      stages: { orderBy: { order: "asc" } },
      workflows: true,
    },
  });

  if (!source) throw new Error("Template funnel not found");

  const target = await db.organization.findFirst({
    where: { id: targetOrgId, agencyId: agencyOrgId },
  });
  if (!target) throw new Error("Client organization not found");

  const existingDefault = await db.funnel.findFirst({
    where: { organizationId: targetOrgId, isDefault: true },
  });

  const newFunnel = await db.funnel.create({
    data: {
      organizationId: targetOrgId,
      name: source.name,
      description: source.description,
      channelType: source.channelType,
      entryConfig: source.entryConfig ?? undefined,
      isDefault: !existingDefault,
      stages: {
        create: source.stages.map((stage) => ({
          name: stage.name,
          order: stage.order,
          probability: stage.probability,
          color: stage.color,
        })),
      },
    },
  });

  for (const workflow of source.workflows) {
    await db.workflow.create({
      data: {
        organizationId: targetOrgId,
        funnelId: newFunnel.id,
        name: workflow.name,
        description: workflow.description,
        channelType: workflow.channelType,
        trigger: workflow.trigger as Prisma.InputJsonValue,
        steps: workflow.steps as Prisma.InputJsonValue,
        graph: workflow.graph as Prisma.InputJsonValue | undefined,
        isActive: false,
      },
    });
  }

  return newFunnel;
}

export async function ensureDefaultFunnel(organizationId: string) {
  const existing = await db.funnel.findFirst({
    where: { organizationId, isDefault: true },
  });
  if (existing) return existing;

  return db.funnel.create({
    data: {
      organizationId,
      name: "Default Sales Funnel",
      isDefault: true,
      stages: {
        create: DEFAULT_FUNNEL_STAGES.map((s) => ({
          name: s.name,
          order: s.order,
          probability: s.probability,
        })),
      },
    },
  });
}
