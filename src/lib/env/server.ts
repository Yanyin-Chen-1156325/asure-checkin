import "server-only";

import { serverEnvironmentSchema } from "./schema";

const result = serverEnvironmentSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(`Invalid server environment configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

/** Server-only configuration. Never import this module into a client component. */
export const serverEnvironment = Object.freeze(result.data);
