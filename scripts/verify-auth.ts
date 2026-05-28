import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const db = new PrismaClient({ adapter });

  const user = await db.user.findUnique({ where: { email: "admin@demo.com" } });
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.slice(0, 50) + "...");
  console.log("User found:", !!user);
  console.log("Has passwordHash:", !!user?.passwordHash);

  if (user?.passwordHash) {
    const ok = await bcrypt.compare("demo1234", user.passwordHash);
    console.log("Password 'demo1234' valid:", ok);
  }

  await db.$disconnect();
}

main().catch(console.error);
