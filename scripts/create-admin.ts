import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PlatformRole } from "../src/generated/prisma/client";
import { DEFAULT_FUNNEL_STAGES } from "../src/lib/constants";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const ORG_ROLES: PlatformRole[] = ["ORG_ADMIN", "MANAGER", "AGENT", "ANALYST"];

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function ensureOrganization(slug: string, name: string) {
  const existing = await db.organization.findUnique({ where: { slug } });
  if (existing) return existing;

  return db.organization.create({
    data: {
      name,
      slug,
      plan: "GROWTH",
      funnels: {
        create: {
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
      },
    },
  });
}

async function main() {
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME?.trim() || email.split("@")[0];
  const role = (process.env.ADMIN_ROLE?.trim() || "SUPER_ADMIN") as PlatformRole;
  const force = process.env.ADMIN_FORCE === "true";

  if (email.endsWith("@demo.com")) {
    throw new Error("Refusing to create admin with @demo.com email.");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.user.findUnique({ where: { email } });

  if (existing && !force) {
    throw new Error(
      `User ${email} already exists. Set ADMIN_FORCE=true to reset the password.`,
    );
  }

  const user = await db.user.upsert({
    where: { email },
    update: { name, passwordHash, platformRole: role },
    create: { email, name, passwordHash, platformRole: role },
  });

  if (ORG_ROLES.includes(role)) {
    const orgSlug = requireEnv("ORG_SLUG");
    const orgName = process.env.ORG_NAME?.trim() || orgSlug;
    const org = await ensureOrganization(orgSlug, orgName);

    await db.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: user.id },
      },
      update: { role, isActive: true },
      create: { organizationId: org.id, userId: user.id, role },
    });

    if (role === "AGENT" || role === "MANAGER") {
      await db.agentProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, languages: ["en"] },
      });
    }

    console.log(`Organization: ${org.name} (${org.slug})`);
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: existing ? "admin.password_reset" : "admin.created",
      entityType: "User",
      entityId: user.id,
      details: { email, role, via: "scripts/create-admin.ts" },
    },
  });

  console.log(existing ? "Admin password updated:" : "Admin created:");
  console.log(`  Email: ${email}`);
  console.log(`  Role:  ${role}`);
  console.log("Store this password securely. It will not be shown again.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
