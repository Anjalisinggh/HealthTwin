import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Read directly (not env()) so `prisma generate` works before a database is configured
  datasource: { url: process.env.DATABASE_URL },
});
