import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // System user for migrated data
  await prisma.user.upsert({
    where: { id: "system" },
    update: {},
    create: {
      id: "system",
      email: "system@localhost",
      name: "System",
      passwordHash: await bcrypt.hash("never-login", 12),
      isAdmin: true,
    },
  });
  console.log("  [OK] System user created");

  // Test user
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "测试用户",
      passwordHash: await bcrypt.hash("Password1", 12),
    },
  });
  console.log("  [OK] Test user created");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
