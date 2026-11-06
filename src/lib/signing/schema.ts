import { z } from "zod";

export const createSigningSessionSchema = z.object({
  arrivalId: z.string().regex(/^[0-9a-f-]{32,36}$/i).optional(),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templatePageId: z.string().regex(/^[0-9a-f-]{32,36}$/i),
}).strict();
