import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_FUNNEL_STAGES } from "../src/lib/constants";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const platformAdmin = await db.user.upsert({
    where: { email: "platform@demo.com" },
    update: { platformRole: "SUPER_ADMIN" },
    create: {
      email: "platform@demo.com",
      name: "Platform Admin",
      passwordHash,
      platformRole: "SUPER_ADMIN",
    },
  });

  const superAdmin = await db.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Demo Admin",
      passwordHash,
      platformRole: "ORG_ADMIN",
    },
  });

  const agent = await db.user.upsert({
    where: { email: "agent@demo.com" },
    update: {},
    create: {
      email: "agent@demo.com",
      name: "Sarah Chen",
      passwordHash,
      platformRole: "AGENT",
      agentProfile: {
        create: {
          bio: "Senior sales agent — property & insurance",
          specialties: ["property", "insurance"],
          languages: ["en", "zh"],
        },
      },
    },
  });

  const manager = await db.user.upsert({
    where: { email: "manager@demo.com" },
    update: {},
    create: {
      email: "manager@demo.com",
      name: "David Park",
      passwordHash,
      platformRole: "AGENT",
    },
  });

  const org = await db.organization.upsert({
    where: { slug: "demo-agency" },
    update: {},
    create: {
      name: "Demo Sales Agency",
      slug: "demo-agency",
      plan: "GROWTH",
    },
  });

  await db.organization.upsert({
    where: { slug: "acme-insurance" },
    update: {},
    create: {
      name: "Acme Insurance Group",
      slug: "acme-insurance",
      plan: "STARTER",
    },
  });

  await db.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: superAdmin.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: superAdmin.id,
      role: "ORG_ADMIN",
    },
  });

  await db.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: agent.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: agent.id,
      role: "AGENT",
    },
  });

  await db.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: manager.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: manager.id,
      role: "MANAGER",
    },
  });

  const existingFunnel = await db.funnel.findFirst({
    where: { organizationId: org.id, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  const funnel =
    existingFunnel ??
    (await db.funnel.create({
      data: {
        organizationId: org.id,
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
      include: { stages: { orderBy: { order: "asc" } } },
    }));

  const existingCount = await db.prospect.count({ where: { organizationId: org.id } });

  const auditCount = await db.auditLog.count();
  if (auditCount === 0) {
    await db.auditLog.createMany({
      data: [
        {
          organizationId: org.id,
          userId: superAdmin.id,
          action: "organization.created",
          entityType: "Organization",
          entityId: org.id,
          details: { name: org.name },
        },
        {
          organizationId: org.id,
          userId: superAdmin.id,
          action: "user.invited",
          entityType: "User",
          entityId: agent.id,
          details: { email: agent.email, role: "AGENT" },
        },
        {
          userId: platformAdmin.id,
          action: "platform.settings.viewed",
          entityType: "Platform",
          details: { section: "overview" },
        },
        {
          organizationId: org.id,
          action: "ai.profile.generated",
          entityType: "Prospect",
          details: { source: "seed" },
        },
      ],
    });
  }

  if (existingCount > 0) {
    const convCount = await db.conversation.count({ where: { organizationId: org.id } });
    if (convCount === 0) {
      const demoProspects = await db.prospect.findMany({
        where: { organizationId: org.id },
        take: 3,
        orderBy: { createdAt: "asc" },
      });

      if (demoProspects.length > 0) {
        let channel = await db.channelConnection.findFirst({
          where: { organizationId: org.id, channel: "WHATSAPP" },
        });
        if (!channel) {
          channel = await db.channelConnection.create({
            data: {
              organizationId: org.id,
              channel: "WHATSAPP",
              name: "Demo WhatsApp Line",
              externalId: "+1 555 0199",
              isActive: true,
            },
          });
        }

        const threads = [
          {
            channel: "WHATSAPP" as const,
            status: "OPEN" as const,
            messages: [
              { direction: "INBOUND" as const, content: "Hi, I'm interested in your property insurance options.", hoursAgo: 48 },
              { direction: "OUTBOUND" as const, content: "Thanks for reaching out! I'd love to help. Are you looking for residential or commercial coverage?", hoursAgo: 47 },
              { direction: "INBOUND" as const, content: "Residential — I just bought a duplex.", hoursAgo: 2 },
            ],
          },
          {
            channel: "MESSENGER" as const,
            status: "ESCALATED" as const,
            messages: [
              { direction: "INBOUND" as const, content: "What's your best price for small business liability?", hoursAgo: 24 },
              { direction: "OUTBOUND" as const, content: "Great question! To give you an accurate quote, could you share your business type and annual revenue?", hoursAgo: 23 },
              { direction: "INBOUND" as const, content: "Retail shop, about $200k revenue. Can someone call me?", hoursAgo: 1 },
            ],
          },
          {
            channel: "WEB_CHAT" as const,
            status: "OPEN" as const,
            messages: [
              { direction: "INBOUND" as const, content: "I downloaded your guide — what are the next steps?", hoursAgo: 6 },
              { direction: "OUTBOUND" as const, content: "Welcome! Based on your profile, I'd recommend a quick 15-min call to discuss your goals.", hoursAgo: 5 },
            ],
          },
        ];

        for (let i = 0; i < demoProspects.length; i++) {
          const prospect = demoProspects[i];
          const thread = threads[i] ?? threads[0];
          const lastMsg = thread.messages[thread.messages.length - 1];

          await db.conversation.create({
            data: {
              organizationId: org.id,
              prospectId: prospect.id,
              channel: thread.channel,
              channelConnectionId: thread.channel === "WHATSAPP" ? channel.id : undefined,
              status: thread.status,
              lastMessageAt: new Date(Date.now() - lastMsg.hoursAgo * 3600000),
              aiHandled: thread.status !== "ESCALATED",
              escalatedAt: thread.status === "ESCALATED" ? new Date() : undefined,
              messages: {
                create: thread.messages.map((m) => ({
                  direction: m.direction,
                  content: m.content,
                  status: "DELIVERED",
                  sentAt: new Date(Date.now() - m.hoursAgo * 3600000),
                })),
              },
            },
          });
        }
        console.log("  Seeded demo inbox conversations.");
      }
    }

    console.log("Seed skipped — demo data already exists.");
    console.log("  Platform: platform@demo.com / demo1234  (Super Admin → /admin)");
    console.log("  Manager:  manager@demo.com / demo1234   (Manager → /manager)");
    return;
  }

  const prospects = [
    {
      firstName: "Marcus",
      lastName: "Webb",
      email: "marcus.webb@example.com",
      phone: "+1 555 0101",
      source: "WHATSAPP_CLICK" as const,
      lifecycleStage: "QUALIFIED" as const,
      occupation: "Real estate investor",
      tags: ["high-value", "whatsapp"],
      personaType: "fast-decider",
      decisionStyle: "logic-driven",
      dealReadiness: "SALES_READY" as const,
      conversionProb: 0.72,
      nextAction: "Send case study — detail-oriented, responds to proof",
    },
    {
      firstName: "Elena",
      lastName: "Rodriguez",
      email: "elena.r@example.com",
      phone: "+1 555 0102",
      source: "MESSENGER" as const,
      lifecycleStage: "NURTURE" as const,
      occupation: "Small business owner",
      tags: ["messenger", "price-sensitive"],
      personaType: "cautious-buyer",
      decisionStyle: "emotion-driven",
      dealReadiness: "NURTURE" as const,
      conversionProb: 0.38,
      nextAction: "Re-engage after 3 days with value-focused message",
    },
    {
      firstName: "James",
      lastName: "Okonkwo",
      email: "james.o@example.com",
      source: "LANDING_PAGE" as const,
      lifecycleStage: "NEW" as const,
      occupation: "Financial advisor",
      tags: ["inbound", "warm"],
      personaType: "social-proof-buyer",
      decisionStyle: "needs-guidance",
      dealReadiness: "WARM" as const,
      conversionProb: 0.55,
      nextAction: "Ask qualification question about timeline",
    },
  ];

  for (const p of prospects) {
    const prospect = await db.prospect.create({
      data: {
        organizationId: org.id,
        assignedToId: agent.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        source: p.source,
        lifecycleStage: p.lifecycleStage,
        occupation: p.occupation,
        tags: p.tags,
        lastTouchAt: new Date(Date.now() - 86400000),
        nextTouchAt: new Date(Date.now() + 172800000),
      },
    });

    await db.personalityProfile.create({
      data: {
        prospectId: prospect.id,
        personaType: p.personaType,
        decisionStyle: p.decisionStyle,
        urgencyScore: 0.6,
        trustScore: 0.5,
        budgetSensitivity: p.tags.includes("price-sensitive") ? 0.8 : 0.3,
        communicationPref: "concise",
        dealReadiness: p.dealReadiness,
        confidenceScore: 0.75,
      },
    });

    await db.leadScore.create({
      data: {
        prospectId: prospect.id,
        profileFitScore: 0.7,
        intentScore: 0.6,
        engagementScore: 0.5,
        urgencyScore: 0.55,
        conversionProb: p.conversionProb,
        churnRiskScore: 0.2,
      },
    });

    await db.recommendation.create({
      data: {
        prospectId: prospect.id,
        action: p.nextAction,
        reason: "AI next-best-action based on personality profile and engagement",
        priority: 1,
      },
    });

    await db.activity.createMany({
      data: [
        {
          prospectId: prospect.id,
          userId: agent.id,
          type: "NOTE",
          title: "Initial contact logged",
          body: "Prospect entered via inbound channel.",
        },
        {
          prospectId: prospect.id,
          type: "AI_INSIGHT",
          title: "Personality profile generated",
          body: `Classified as ${p.personaType} with ${p.decisionStyle} decision style.`,
        },
      ],
    });

    await db.task.create({
      data: {
        prospectId: prospect.id,
        assigneeId: agent.id,
        creatorId: superAdmin.id,
        title: p.nextAction,
        priority: p.dealReadiness === "SALES_READY" ? "HIGH" : "MEDIUM",
        dueAt: new Date(Date.now() + 86400000),
      },
    });

    const stageIndex = Math.min(
      ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL"].indexOf(p.lifecycleStage),
      funnel.stages.length - 1,
    );
    const stage = funnel.stages[Math.max(stageIndex, 0)];

    await db.opportunity.create({
      data: {
        prospectId: prospect.id,
        funnelId: funnel.id,
        stageId: stage.id,
        title: `${p.firstName} ${p.lastName} — Opportunity`,
        value: p.conversionProb * 10000,
      },
    });
  }

  await db.aIAgent.create({
    data: {
      organizationId: org.id,
      name: "Inbound Qualifier",
      persona: "Friendly, professional sales assistant focused on qualification",
      tone: "Professional",
      language: "en",
      isActive: true,
    },
  });

  await db.messageTemplate.create({
    data: {
      organizationId: org.id,
      name: "Welcome — WhatsApp",
      channel: "WHATSAPP",
      category: "UTILITY",
      content: "Hi {{name}}, thanks for reaching out! How can we help you today?",
      variables: ["name"],
      isApproved: true,
    },
  });

  await db.campaign.create({
    data: {
      organizationId: org.id,
      name: "3-Day Nurture Sequence",
      description: "Follow-up cadence for warm inbound leads",
      status: "draft",
    },
  });

  const channel = await db.channelConnection.create({
    data: {
      organizationId: org.id,
      channel: "WHATSAPP",
      name: "Demo WhatsApp Line",
      externalId: "+1 555 0199",
      isActive: true,
    },
  });

  const seededProspects = await db.prospect.findMany({
    where: { organizationId: org.id },
    take: 3,
    orderBy: { createdAt: "asc" },
  });

  const freshThreads = [
    {
      channel: "WHATSAPP" as const,
      status: "OPEN" as const,
      messages: [
        { direction: "INBOUND" as const, content: "Hi, I'm interested in your property insurance options.", hoursAgo: 48 },
        { direction: "OUTBOUND" as const, content: "Thanks for reaching out! Are you looking for residential or commercial coverage?", hoursAgo: 47 },
        { direction: "INBOUND" as const, content: "Residential — I just bought a duplex.", hoursAgo: 2 },
      ],
    },
    {
      channel: "MESSENGER" as const,
      status: "ESCALATED" as const,
      messages: [
        { direction: "INBOUND" as const, content: "What's your best price for small business liability?", hoursAgo: 24 },
        { direction: "INBOUND" as const, content: "Can someone call me?", hoursAgo: 1 },
      ],
    },
    {
      channel: "WEB_CHAT" as const,
      status: "OPEN" as const,
      messages: [
        { direction: "INBOUND" as const, content: "I downloaded your guide — what are the next steps?", hoursAgo: 6 },
        { direction: "OUTBOUND" as const, content: "Welcome! Let's schedule a quick call to discuss your goals.", hoursAgo: 5 },
      ],
    },
  ];

  for (let i = 0; i < seededProspects.length; i++) {
    const prospect = seededProspects[i];
    const thread = freshThreads[i] ?? freshThreads[0];
    const lastMsg = thread.messages[thread.messages.length - 1];

    await db.conversation.create({
      data: {
        organizationId: org.id,
        prospectId: prospect.id,
        channel: thread.channel,
        channelConnectionId: thread.channel === "WHATSAPP" ? channel.id : undefined,
        status: thread.status,
        lastMessageAt: new Date(Date.now() - lastMsg.hoursAgo * 3600000),
        aiHandled: thread.status !== "ESCALATED",
        escalatedAt: thread.status === "ESCALATED" ? new Date() : undefined,
        messages: {
          create: thread.messages.map((m) => ({
            direction: m.direction,
            content: m.content,
            status: "DELIVERED",
            sentAt: new Date(Date.now() - m.hoursAgo * 3600000),
          })),
        },
      },
    });
  }

  console.log("Seed complete:");
  console.log("  Platform: platform@demo.com / demo1234  (Super Admin → /admin)");
  console.log("  Manager:  manager@demo.com / demo1234   (Manager → /manager)");
  console.log("  Org:      Demo Sales Agency (demo-agency)");
  console.log("  Admin:    admin@demo.com / demo1234       (Org Admin → /org)");
  console.log("  Agent:    agent@demo.com / demo1234       (Agent → /dashboard)");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
