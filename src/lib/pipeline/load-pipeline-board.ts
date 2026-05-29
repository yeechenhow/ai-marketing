import { db } from "@/lib/db";
import { resolveCurrentStepLabel } from "@/lib/pipeline/stage-mapping";
import { FUNNEL_CHANNEL_LABELS } from "@/lib/workflows/types";
import type { FunnelChannel } from "@/generated/prisma/client";

export type PipelineCardBehavior = {
  personaType: string | null;
  decisionStyle: string | null;
  communicationPref: string | null;
  dealReadiness: string;
};

export type PipelineCardLeadScore = {
  conversionProb: number;
  intentScore: number;
  engagementScore: number;
};

export type PipelineCardData = {
  opportunityId: string;
  prospectId: string;
  title: string;
  value: number | null;
  prospectName: string;
  email: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  whatsappName: string | null;
  source: string;
  sourceDetail: string | null;
  location: string | null;
  occupation: string | null;
  tags: string[];
  lifecycleStage: string;
  lastTouchAt: string | null;
  nextTouchAt: string | null;
  registrationCompletedAt: string | null;
  assigneeName: string | null;
  behavior: PipelineCardBehavior | null;
  leadScore: PipelineCardLeadScore | null;
  workflow: {
    enrollmentId: string;
    workflowId: string;
    workflowName: string;
    status: string;
    currentStep: string | null;
    nextRunAt: string | null;
    campaignName: string | null;
  } | null;
};

export type PipelineColumnData = {
  stageId: string;
  stageName: string;
  probability: number;
  color: string | null;
  items: PipelineCardData[];
};

export type PipelineBoardData = {
  funnelId: string;
  funnelName: string;
  channelType: FunnelChannel;
  columns: PipelineColumnData[];
  funnels: { id: string; name: string; channelType: FunnelChannel; isDefault: boolean }[];
};

export async function loadPipelineBoard(
  organizationId: string,
  funnelId?: string,
): Promise<PipelineBoardData | null> {
  const funnels = await db.funnel.findMany({
    where: { organizationId },
    select: { id: true, name: true, channelType: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  if (funnels.length === 0) return null;

  const selected =
    funnels.find((f) => f.id === funnelId) ??
    funnels.find((f) => f.isDefault) ??
    funnels[0]!;

  const funnel = await db.funnel.findFirst({
    where: { id: selected.id, organizationId },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  if (!funnel) return null;

  const opportunities = await db.opportunity.findMany({
    where: { funnelId: funnel.id, status: "OPEN" },
    include: {
      prospect: {
        include: {
          assignedTo: { select: { name: true } },
          personalityProfile: {
            select: {
              personaType: true,
              decisionStyle: true,
              communicationPref: true,
              dealReadiness: true,
            },
          },
          leadScore: {
            select: {
              conversionProb: true,
              intentScore: true,
              engagementScore: true,
            },
          },
          workflowEnrollments: {
            where: { status: "ACTIVE" },
            orderBy: { updatedAt: "desc" },
            take: 1,
            include: {
              workflow: { select: { id: true, name: true, graph: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const campaignIds = opportunities
    .flatMap((o) => o.prospect.workflowEnrollments.map((e) => e.campaignId))
    .filter((id): id is string => !!id);

  const campaigns =
    campaignIds.length > 0
      ? await db.campaign.findMany({
          where: { id: { in: [...new Set(campaignIds)] } },
          select: { id: true, name: true },
        })
      : [];

  const campaignById = new Map(campaigns.map((c) => [c.id, c.name]));

  const columns: PipelineColumnData[] = funnel.stages.map((stage) => ({
    stageId: stage.id,
    stageName: stage.name,
    probability: stage.probability,
    color: stage.color,
    items: opportunities
      .filter((o) => o.stageId === stage.id)
      .map((opp) => {
        const enrollment = opp.prospect.workflowEnrollments[0] ?? null;
        const p = opp.prospect;

        return {
          opportunityId: opp.id,
          prospectId: opp.prospectId,
          title: opp.title,
          value: opp.value,
          prospectName:
            [p.firstName, p.lastName].filter(Boolean).join(" ") ||
            p.whatsappName ||
            p.email ||
            "Unknown",
          email: p.email,
          phone: p.phone,
          whatsappPhone: p.whatsappPhone,
          whatsappName: p.whatsappName,
          source: p.source,
          sourceDetail: p.sourceDetail,
          location: p.location,
          occupation: p.occupation,
          tags: p.tags,
          lifecycleStage: p.lifecycleStage,
          lastTouchAt: p.lastTouchAt?.toISOString() ?? null,
          nextTouchAt: p.nextTouchAt?.toISOString() ?? null,
          registrationCompletedAt: p.registrationCompletedAt?.toISOString() ?? null,
          assigneeName: p.assignedTo?.name ?? null,
          behavior: p.personalityProfile
            ? {
                personaType: p.personalityProfile.personaType,
                decisionStyle: p.personalityProfile.decisionStyle,
                communicationPref: p.personalityProfile.communicationPref,
                dealReadiness: p.personalityProfile.dealReadiness,
              }
            : null,
          leadScore: p.leadScore
            ? {
                conversionProb: p.leadScore.conversionProb,
                intentScore: p.leadScore.intentScore,
                engagementScore: p.leadScore.engagementScore,
              }
            : null,
          workflow: enrollment
            ? {
                enrollmentId: enrollment.id,
                workflowId: enrollment.workflowId,
                workflowName: enrollment.workflow.name,
                status: enrollment.status,
                currentStep: resolveCurrentStepLabel(
                  enrollment.workflow.graph,
                  enrollment.currentNodeId,
                ),
                nextRunAt: enrollment.nextRunAt?.toISOString() ?? null,
                campaignName: enrollment.campaignId
                  ? campaignById.get(enrollment.campaignId) ?? null
                  : null,
              }
            : null,
        };
      }),
  }));

  return {
    funnelId: funnel.id,
    funnelName: funnel.name,
    channelType: funnel.channelType,
    columns,
    funnels: funnels.map((f) => ({
      id: f.id,
      name: f.name,
      channelType: f.channelType,
      isDefault: f.isDefault,
    })),
  };
}

export function funnelChannelLabel(channel: FunnelChannel) {
  return FUNNEL_CHANNEL_LABELS[channel];
}
