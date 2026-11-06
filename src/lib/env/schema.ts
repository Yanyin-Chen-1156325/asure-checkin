import { z } from "zod";

const optionalSecret = z.string().trim().min(1).optional().or(z.literal(""));

export const serverEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_BASE_URL: z.url().default("http://localhost:3000"),
  APP_TIMEZONE: z.string().trim().min(1).default("Pacific/Auckland"),
  OWNER_USERNAME: optionalSecret,
  OWNER_PASSWORD_HASH: optionalSecret,
  STAFF_USERNAME: optionalSecret,
  STAFF_PASSWORD_HASH: optionalSecret,
  AUTH_SECRET: optionalSecret,
  AUTH_SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(900)
    .max(43_200)
    .default(28_800),
  NOTION_TOKEN: optionalSecret,
  NOTION_ARRIVALS_DATABASE_ID: optionalSecret,
  NOTION_ARRIVALS_DATA_SOURCE_ID: optionalSecret,
  NOTION_TEMPLATES_DATABASE_ID: optionalSecret,
  NOTION_TEMPLATES_DATA_SOURCE_ID: optionalSecret,
  NOTION_SIGNING_OPERATIONS_DATABASE_ID: optionalSecret,
  NOTION_SIGNING_OPERATIONS_DATA_SOURCE_ID: optionalSecret,
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
