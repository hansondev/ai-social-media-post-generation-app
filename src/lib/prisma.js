import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis;

const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? [
          { level: "error", emit: "event" },
          { level: "warn", emit: "event" },
          { level: "query", emit: "event" },
        ]
      : [{ level: "error", emit: "event" }],
  });

prisma.$on("error", (e) => {
  process.stderr.write(`\n[prisma:error:full]\n${e.message}\n[prisma:error:end]\n`);
});
prisma.$on("query", (e) => console.log("[prisma:query]", e.query, "params=", e.params));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

