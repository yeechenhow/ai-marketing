import type { FunnelChannel, PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_FUNNEL_STAGES } from "../src/lib/constants";
import { createWhatsAppOnboardingConfig } from "../src/lib/onboarding/campaign-config";
import { buildDefaultNodeData } from "../src/lib/workflows/node-catalog";
import {
  createBranchEdge,
  createDefaultGraph,
  graphToSteps,
  layoutBranchGraph,
} from "../src/lib/workflows/layout";
import type { WorkflowGraph } from "../src/lib/workflows/types";

type ClientSeed = {
  slug: string;
  name: string;
  funnels: { name: string; channelType: FunnelChannel; description?: string }[];
};

const EXTRA_CLIENTS: ClientSeed[] = [
  {
    slug: "gamma-realty",
    name: "Gamma Property Group",
    funnels: [
      { name: "Buyer Inquiries", channelType: "WHATSAPP", description: "Inbound WhatsApp property leads" },
      { name: "Open House RSVP", channelType: "PROMOTION_URL", description: "Tracked promo landing pages" },
    ],
  },
  {
    slug: "delta-auto",
    name: "Delta Auto Care",
    funnels: [
      { name: "Service Booking", channelType: "SMS", description: "SMS appointment reminders" },
      { name: "Email Recall", channelType: "EMAIL", description: "Email recall campaigns" },
    ],
  },
];

const CLIENT_FUNNELS: Record<string, ClientSeed["funnels"]> = {
  "acme-insurance": [
    { name: "WhatsApp Leads", channelType: "WHATSAPP", description: "Primary WhatsApp intake funnel" },
    { name: "Spring Promo", channelType: "PROMOTION_URL", description: "Promotion URL click tracking" },
  ],
  "beta-clinic": [
    { name: "Clinic Intake", channelType: "WHATSAPP", description: "New patient WhatsApp onboarding" },
    { name: "Wellness Newsletter", channelType: "EMAIL", description: "Email nurture sequence" },
  ],
};

function buildNurtureWorkflowGraph(channelType: FunnelChannel, seedKey: string): WorkflowGraph {
  const triggerId = `${seedKey}_trigger`;
  const waitId = `${seedKey}_wait`;
  const condId = `${seedKey}_cond`;
  const yesAiId = `${seedKey}_yes_ai`;
  const noTagId = `${seedKey}_no_tag`;

  const nodes = layoutBranchGraph(
    [
      {
        id: triggerId,
        type: "workflowStep",
        position: { x: 0, y: 80 },
        data: buildDefaultNodeData("trigger", channelType),
        draggable: true,
      },
      {
        id: waitId,
        type: "workflowStep",
        position: { x: 0, y: 260 },
        data: {
          ...buildDefaultNodeData("wait", channelType),
          config: { waitSeconds: 60, waitMode: "delay" as const },
          subtitle: "Wait 60 seconds",
        },
        draggable: true,
      },
      {
        id: condId,
        type: "workflowStep",
        position: { x: 0, y: 440 },
        data: {
          ...buildDefaultNodeData("condition", channelType),
          config: { conditionPreset: "replied", conditionMode: "instant" as const },
          subtitle: "If prospect replied to a message",
        },
        draggable: true,
      },
      {
        id: yesAiId,
        type: "workflowStep",
        position: { x: -400, y: 620 },
        data: buildDefaultNodeData("ai_reply", channelType),
        draggable: true,
      },
      {
        id: noTagId,
        type: "workflowStep",
        position: { x: 400, y: 620 },
        data: {
          ...buildDefaultNodeData("add_tag", channelType),
          config: { tag: "needs-follow-up" },
          subtitle: "Add tag: needs-follow-up",
        },
        draggable: true,
      },
    ],
    [
      createBranchEdge(triggerId, waitId, "default"),
      createBranchEdge(waitId, condId, "default"),
      createBranchEdge(condId, yesAiId, "yes"),
      createBranchEdge(condId, noTagId, "no"),
    ],
  );

  const edges = [
    createBranchEdge(triggerId, waitId, "default"),
    createBranchEdge(waitId, condId, "default"),
    createBranchEdge(condId, yesAiId, "yes"),
    createBranchEdge(condId, noTagId, "no"),
  ];

  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.85 } };
}

function buildLinkClickWorkflowGraph(channelType: FunnelChannel, seedKey: string): WorkflowGraph {
  const triggerId = `${seedKey}_trigger`;
  const waitId = `${seedKey}_wait`;
  const tagId = `${seedKey}_tag`;

  const nodes = layoutBranchGraph(
    [
      {
        id: triggerId,
        type: "workflowStep",
        position: { x: 0, y: 80 },
        data: buildDefaultNodeData("trigger", channelType),
        draggable: true,
      },
      {
        id: waitId,
        type: "workflowStep",
        position: { x: 0, y: 260 },
        data: {
          ...buildDefaultNodeData("wait", channelType),
          config: {
            waitMode: "event" as const,
            waitEvent: "link_clicked" as const,
            waitTimeoutSeconds: 604800,
          },
          subtitle: "Wait until link_clicked",
        },
        draggable: true,
      },
      {
        id: tagId,
        type: "workflowStep",
        position: { x: 0, y: 440 },
        data: {
          ...buildDefaultNodeData("add_tag", channelType),
          config: { tag: "promo-engaged" },
          subtitle: "Add tag: promo-engaged",
        },
        draggable: true,
      },
    ],
    [
      createBranchEdge(triggerId, waitId, "default"),
      createBranchEdge(waitId, tagId, "default"),
    ],
  );

  const edges = [
    createBranchEdge(triggerId, waitId, "default"),
    createBranchEdge(waitId, tagId, "default"),
  ];

  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.85 } };
}

type ProspectSeed = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source: "WHATSAPP_CLICK" | "LANDING_PAGE" | "ADS" | "REFERRAL";
  lifecycleStage: "NEW" | "CONTACTED" | "QUALIFIED" | "NURTURE";
  tags: string[];
};

async function ensureFunnel(
  db: PrismaClient,
  organizationId: string,
  spec: { name: string; channelType: FunnelChannel; description?: string; isDefault?: boolean },
) {
  const existing = await db.funnel.findFirst({
    where: { organizationId, name: spec.name },
    include: { stages: true },
  });
  if (existing) {
    await db.funnel.update({
      where: { id: existing.id },
      data: {
        channelType: spec.channelType,
        description: spec.description,
        isDefault: spec.isDefault ?? existing.isDefault,
      },
    });
    return existing;
  }

  return db.funnel.create({
    data: {
      organizationId,
      name: spec.name,
      description: spec.description,
      channelType: spec.channelType,
      isDefault: spec.isDefault ?? false,
      stages: {
        create: DEFAULT_FUNNEL_STAGES.map((s) => ({
          name: s.name,
          order: s.order,
          probability: s.probability,
        })),
      },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}

async function ensureWorkflow(
  db: PrismaClient,
  input: {
    organizationId: string;
    funnelId: string;
    name: string;
    channelType: FunnelChannel;
    graph: WorkflowGraph;
    isActive?: boolean;
    description?: string;
  },
) {
  const graph = input.graph;
  const existing = await db.workflow.findFirst({
    where: { organizationId: input.organizationId, name: input.name },
  });

  const payload = {
    funnelId: input.funnelId,
    channelType: input.channelType,
    description: input.description,
    trigger: { type: input.channelType, label: input.name },
    steps: graphToSteps(graph),
    graph: graph as object,
    isActive: input.isActive ?? true,
  };

  if (existing) {
    return db.workflow.update({ where: { id: existing.id }, data: payload });
  }

  return db.workflow.create({
    data: { organizationId: input.organizationId, name: input.name, ...payload },
  });
}

async function ensureCampaign(
  db: PrismaClient,
  input: {
    organizationId: string;
    name: string;
    funnelId?: string;
    workflowId?: string;
    description?: string;
    status?: string;
    config?: object;
  },
) {
  const existing = await db.campaign.findFirst({
    where: { organizationId: input.organizationId, name: input.name },
  });

  const data = {
    funnelId: input.funnelId ?? null,
    workflowId: input.workflowId ?? null,
    description: input.description,
    status: input.status ?? "active",
    config: input.config ?? {},
  };

  if (existing) {
    return db.campaign.update({ where: { id: existing.id }, data });
  }

  return db.campaign.create({
    data: { organizationId: input.organizationId, name: input.name, ...data },
  });
}

async function ensureTrackedLink(
  db: PrismaClient,
  input: {
    organizationId: string;
    campaignId: string;
    slug: string;
    destinationUrl: string;
    label: string;
  },
) {
  const client = db as PrismaClient & {
    trackedLink?: {
      upsert: (args: unknown) => Promise<unknown>;
    };
  };
  if (!client.trackedLink?.upsert) return;

  await client.trackedLink.upsert({
    where: { slug: input.slug },
    update: {
      destinationUrl: input.destinationUrl,
      label: input.label,
      campaignId: input.campaignId,
      organizationId: input.organizationId,
    },
    create: {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      slug: input.slug,
      destinationUrl: input.destinationUrl,
      label: input.label,
    },
  });
}

async function ensureProspects(
  db: PrismaClient,
  organizationId: string,
  assigneeId: string | undefined,
  funnelId: string,
  stageId: string,
  prospects: ProspectSeed[],
) {
  for (const p of prospects) {
    const existing = await db.prospect.findFirst({
      where: { organizationId, email: p.email },
    });
    if (existing) continue;

    const prospect = await db.prospect.create({
      data: {
        organizationId,
        assignedToId: assigneeId,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        source: p.source,
        lifecycleStage: p.lifecycleStage,
        tags: p.tags,
        lastTouchAt: new Date(Date.now() - 86400000 * 2),
      },
    });

    await db.opportunity.create({
      data: {
        prospectId: prospect.id,
        funnelId,
        stageId,
        title: `${p.firstName} ${p.lastName} — Opportunity`,
        value: 5000,
      },
    });
  }
}

export async function seedExtendedDemo(db: PrismaClient, agencyId: string, agentId?: string) {
  console.log("==> Seeding extended demo (clients, funnels, workflows, campaigns)…");

  const allClientSlugs = [
    "acme-insurance",
    "beta-clinic",
    ...EXTRA_CLIENTS.map((c) => c.slug),
  ];

  for (const extra of EXTRA_CLIENTS) {
    await db.organization.upsert({
      where: { slug: extra.slug },
      update: { agencyId, isAgency: false, name: extra.name },
      create: {
        name: extra.name,
        slug: extra.slug,
        plan: "STARTER",
        agencyId,
        isAgency: false,
      },
    });
  }

  for (const slug of allClientSlugs) {
    const org = await db.organization.findUnique({ where: { slug } });
    if (!org) continue;

    const funnelSpecs = [
      ...(CLIENT_FUNNELS[slug] ?? []),
      ...(EXTRA_CLIENTS.find((c) => c.slug === slug)?.funnels ?? []),
    ];

    if (funnelSpecs.length === 0) {
      await ensureFunnel(db, org.id, {
        name: "Default Sales Funnel",
        channelType: "GENERIC",
        isDefault: true,
      });
      continue;
    }

    for (let i = 0; i < funnelSpecs.length; i++) {
      const funnel = await ensureFunnel(db, org.id, {
        ...funnelSpecs[i]!,
        isDefault: i === 0,
      });

      const channel = funnelSpecs[i]!.channelType;
      const seedKey = slug.replace(/-/g, "_").slice(0, 12) + "_" + i;

      const workflowName =
        channel === "PROMOTION_URL"
          ? `${funnelSpecs[i]!.name} — Link Click Flow`
          : `${funnelSpecs[i]!.name} — Auto Nurture`;

      const graph =
        channel === "PROMOTION_URL"
          ? buildLinkClickWorkflowGraph(channel, seedKey)
          : buildNurtureWorkflowGraph(channel, seedKey);

      await ensureWorkflow(db, {
        organizationId: org.id,
        funnelId: funnel.id,
        name: workflowName,
        channelType: channel,
        graph,
        isActive: true,
        description: `Demo automation for ${funnelSpecs[i]!.name}`,
      });
    }

    const waFunnel = await db.funnel.findFirst({
      where: { organizationId: org.id, channelType: "WHATSAPP" },
      include: { stages: { orderBy: { order: "asc" }, take: 1 } },
    });
    const promoFunnel = await db.funnel.findFirst({
      where: { organizationId: org.id, channelType: "PROMOTION_URL" },
    });

    const waWorkflow = waFunnel
      ? await db.workflow.findFirst({
          where: { organizationId: org.id, funnelId: waFunnel.id, isActive: true },
        })
      : null;

    const promoWorkflow = promoFunnel
      ? await db.workflow.findFirst({
          where: { organizationId: org.id, funnelId: promoFunnel.id, isActive: true },
        })
      : null;

    let channel = await db.channelConnection.findFirst({
      where: { organizationId: org.id, channel: "WHATSAPP" },
    });
    if (!channel && slug === "acme-insurance") {
      channel = await db.channelConnection.create({
        data: {
          organizationId: org.id,
          channel: "WHATSAPP",
          name: "Acme WhatsApp Line",
          externalId: "+1 555 0100",
          isActive: true,
        },
      });
    }

    if (waFunnel && waWorkflow) {
      await ensureCampaign(db, {
        organizationId: org.id,
        name: `${org.name.split(" ")[0]} WhatsApp Hook`,
        funnelId: waFunnel.id,
        workflowId: waWorkflow.id,
        description: "WhatsApp onboarding + workflow enrollment demo",
        status: "active",
        config:
          slug === "acme-insurance" && channel
            ? createWhatsAppOnboardingConfig({
                prefilledMessage: "Hi, I'd like a quote from Acme Insurance",
                businessPhone: "15550100",
                channelConnectionId: channel.id,
                welcomeMessage: "Welcome to Acme Insurance! Complete your profile below.",
              })
            : {
                kind: "whatsapp_onboarding",
                webhookVerifyToken: `demo_${slug.replace(/-/g, "")}`,
                prefilledMessage: `Hi, I'm interested in ${org.name}`,
              },
      });
    }

    if (promoFunnel && promoWorkflow) {
      const promoCampaign = await ensureCampaign(db, {
        organizationId: org.id,
        name: `${org.name.split(" ")[0]} Spring Promo`,
        funnelId: promoFunnel.id,
        workflowId: promoWorkflow.id,
        description: "Promotion URL with tracked link click workflow",
        status: "active",
      });

      await ensureTrackedLink(db, {
        organizationId: org.id,
        campaignId: promoCampaign.id,
        slug: `demo-${slug.slice(0, 8)}`,
        destinationUrl: "https://example.com/promo",
        label: `${org.name} promo landing page`,
      });
    }

    const defaultFunnel =
      waFunnel ??
      (await db.funnel.findFirst({
        where: { organizationId: org.id },
        include: { stages: { orderBy: { order: "asc" }, take: 1 } },
      }));
    const stageId = defaultFunnel?.stages?.[0]?.id;
    if (defaultFunnel && stageId) {
      const clientProspects: Record<string, ProspectSeed[]> = {
        "acme-insurance": [
          {
            firstName: "Lisa",
            lastName: "Nguyen",
            email: "lisa.nguyen@example.com",
            phone: "+1 555 0201",
            source: "WHATSAPP_CLICK",
            lifecycleStage: "QUALIFIED",
            tags: ["home-insurance", "whatsapp"],
          },
          {
            firstName: "Tom",
            lastName: "Baker",
            email: "tom.baker@example.com",
            source: "LANDING_PAGE",
            lifecycleStage: "NURTURE",
            tags: ["auto-insurance"],
          },
        ],
        "beta-clinic": [
          {
            firstName: "Priya",
            lastName: "Sharma",
            email: "priya.sharma@example.com",
            phone: "+1 555 0301",
            source: "WHATSAPP_CLICK",
            lifecycleStage: "CONTACTED",
            tags: ["new-patient"],
          },
          {
            firstName: "Alex",
            lastName: "Kim",
            email: "alex.kim@example.com",
            source: "REFERRAL",
            lifecycleStage: "NEW",
            tags: ["wellness"],
          },
        ],
        "gamma-realty": [
          {
            firstName: "Jordan",
            lastName: "Lee",
            email: "jordan.lee@example.com",
            phone: "+1 555 0401",
            source: "ADS",
            lifecycleStage: "QUALIFIED",
            tags: ["buyer", "condo"],
          },
          {
            firstName: "Sam",
            lastName: "Rivera",
            email: "sam.rivera@example.com",
            source: "LANDING_PAGE",
            lifecycleStage: "NURTURE",
            tags: ["open-house"],
          },
        ],
        "delta-auto": [
          {
            firstName: "Chris",
            lastName: "Patel",
            email: "chris.patel@example.com",
            phone: "+1 555 0501",
            source: "WHATSAPP_CLICK",
            lifecycleStage: "CONTACTED",
            tags: ["service-booking"],
          },
        ],
      };

      await ensureProspects(
        db,
        org.id,
        agentId,
        defaultFunnel.id,
        stageId,
        clientProspects[slug] ?? [],
      );
    }
  }

  const agencyFunnel = await ensureFunnel(db, agencyId, {
    name: "Agency Master Pipeline",
    channelType: "GENERIC",
    description: "Agency-level demo funnel",
    isDefault: true,
  });

  const agencyGraph = createDefaultGraph("GENERIC");
  const agencyWorkflow = await ensureWorkflow(db, {
    organizationId: agencyId,
    funnelId: agencyFunnel.id,
    name: "Agency Welcome Sequence",
    channelType: "GENERIC",
    graph: agencyGraph,
    isActive: false,
    description: "Draft workflow template for agency demos",
  });

  await ensureCampaign(db, {
    organizationId: agencyId,
    name: "Agency Lead Nurture (draft)",
    funnelId: agencyFunnel.id,
    workflowId: agencyWorkflow.id,
    description: "Sample campaign linked to agency funnel + workflow",
    status: "draft",
  });

  console.log("  Extended demo: 4 client orgs, funnels, workflows, campaigns, tracked links.");
}
