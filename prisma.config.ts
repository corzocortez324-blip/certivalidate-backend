import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // La CLI de Prisma usa DIRECT_URL para las migraciones
    url: env("DIRECT_URL"),
  },
});
