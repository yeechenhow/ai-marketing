import { db } from "@/lib/db";

export type CoachingInsight = {
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
};

export async function generateCoachingInsights(
  organizationId: string,
): Promise<CoachingInsight[]> {
  const insights: CoachingInsight[] = [];
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [
    staleQualified,
    overdueTasks,
    agents,
    sourceStats,
    whatsappProspects,
    messengerProspects,
    logicDrivenCount,
    escalatedConversations,
  ] = await Promise.all([
    db.prospect.count({
      where: {
        organizationId,
        lifecycleStage: "QUALIFIED",
        OR: [{ lastTouchAt: null }, { lastTouchAt: { lt: cutoff48h } }],
      },
    }),
    db.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS"] },
        dueAt: { lt: new Date() },
        prospect: { organizationId },
      },
    }),
    db.organizationMember.findMany({
      where: { organizationId, role: "AGENT", isActive: true },
      include: {
        user: {
          include: {
            assignedProspects: { select: { lifecycleStage: true } },
          },
        },
      },
    }),
    db.prospect.groupBy({
      by: ["source"],
      where: { organizationId },
      _count: true,
    }),
    db.prospect.findMany({
      where: { organizationId, source: "WHATSAPP_CLICK" },
      include: { leadScore: true },
    }),
    db.prospect.findMany({
      where: { organizationId, source: "MESSENGER" },
      include: { leadScore: true },
    }),
    db.personalityProfile.count({
      where: {
        prospect: { organizationId },
        decisionStyle: { contains: "logic" },
      },
    }),
    db.conversation.count({
      where: { organizationId, status: "ESCALATED" },
    }),
  ]);

  if (staleQualified > 0) {
    insights.push({
      title: `${staleQualified} qualified lead${staleQualified > 1 ? "s" : ""} need follow-up`,
      body: "Prospects in QUALIFIED stage with no touch in 48+ hours convert at lower rates. Review agent task completion and assign follow-ups.",
      priority: "high",
    });
  }

  if (overdueTasks > 0) {
    insights.push({
      title: `${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""} across the team`,
      body: "Follow-up SLAs are being missed. Check Team Tasks and rebalance workload if needed.",
      priority: "high",
    });
  }

  const agentStats = agents.map((a) => {
    const prospects = a.user.assignedProspects;
    const won = prospects.filter((p) => p.lifecycleStage === "WON").length;
    return {
      name: a.user.name ?? a.user.email,
      total: prospects.length,
      won,
      rate: prospects.length > 0 ? won / prospects.length : 0,
    };
  });

  const highVolumeLowClose = agentStats
    .filter((a) => a.total >= 2 && a.rate === 0)
    .sort((a, b) => b.total - a.total)[0];

  if (highVolumeLowClose) {
    insights.push({
      title: `${highVolumeLowClose.name} has ${highVolumeLowClose.total} leads but 0 wins`,
      body: "Consider coaching on qualification or closing techniques, or reassigning warm leads.",
      priority: "medium",
    });
  }

  const topAgent = agentStats.sort((a, b) => b.won - a.won)[0];
  if (topAgent && topAgent.won > 0) {
    insights.push({
      title: `${topAgent.name} leads the team with ${topAgent.won} win${topAgent.won > 1 ? "s" : ""}`,
      body: "Review their approach for team coaching — conversation patterns and follow-up timing.",
      priority: "low",
    });
  }

  if (logicDrivenCount > 0) {
    insights.push({
      title: `${logicDrivenCount} logic-driven buyer${logicDrivenCount > 1 ? "s" : ""} in pipeline`,
      body: "These prospects respond better to case studies and proof content before pricing discussions.",
      priority: "medium",
    });
  }

  const avgScore = (prospects: { leadScore: { conversionProb: number } | null }[]) => {
    const scored = prospects.filter((p) => p.leadScore);
    if (scored.length === 0) return 0;
    return scored.reduce((s, p) => s + p.leadScore!.conversionProb, 0) / scored.length;
  };

  const waAvg = avgScore(whatsappProspects);
  const msgAvg = avgScore(messengerProspects);

  if (whatsappProspects.length > 0 && messengerProspects.length > 0 && waAvg !== msgAvg) {
    const better = waAvg > msgAvg ? "WhatsApp" : "Messenger";
    const betterAvg = Math.max(waAvg, msgAvg);
    const worseAvg = Math.min(waAvg, msgAvg);
    if (betterAvg - worseAvg > 0.05) {
      insights.push({
        title: `${better} leads score higher on conversion`,
        body: `${better} prospects average ${Math.round(betterAvg * 100)}% conversion probability vs ${Math.round(worseAvg * 100)}% on the other channel. Prioritize follow-up on ${better}.`,
        priority: "medium",
      });
    }
  }

  const topSource = sourceStats.sort((a, b) => b._count - a._count)[0];
  if (topSource && topSource._count >= 2) {
    insights.push({
      title: `Top lead source: ${topSource.source.replace(/_/g, " ").toLowerCase()}`,
      body: `${topSource._count} prospects from this channel — ensure agents are trained on channel-specific messaging rules.`,
      priority: "low",
    });
  }

  if (escalatedConversations > 0) {
    insights.push({
      title: `${escalatedConversations} escalated conversation${escalatedConversations > 1 ? "s" : ""} need review`,
      body: "Review conversation quality and human takeover speed in the Conversations tab.",
      priority: "high",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Team performance looks healthy",
      body: "No urgent coaching flags detected. Continue monitoring follow-up SLAs and conversion by source.",
      priority: "low",
    });
  }

  return insights;
}
