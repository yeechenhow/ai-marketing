import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEMO_EMAILS = [
  "platform@demo.com",
  "admin@demo.com",
  "agent@demo.com",
  "manager@demo.com",
];

async function main() {
  const confirm = process.env.CONFIRM_REMOVE_DEMO === "true";
  if (!confirm) {
    throw new Error(
      "Safety check: set CONFIRM_REMOVE_DEMO=true to disable demo accounts.",
    );
  }

  for (const email of DEMO_EMAILS) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Skip (not found): ${email}`);
      continue;
    }

    await db.organizationMember.updateMany({
      where: { userId: user.id },
      data: { isActive: false },
    });

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: null },
    });

    console.log(`Disabled login: ${email}`);
  }

  console.log("");
  console.log("Demo accounts can no longer sign in.");
  console.log("Create your real admin with: npm run admin:create");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
