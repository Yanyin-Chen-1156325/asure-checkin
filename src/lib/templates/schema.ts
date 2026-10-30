import { z } from "zod";

import { templateContentSchema } from "./content";

export const templateStatusSchema = z.enum(["draft", "active", "archived"]);

export const templateSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  templateId: z.string().uuid(),
  version: z.number().int().min(0),
  status: templateStatusSchema,
  updatedAt: z.iso.datetime(),
}).strict();

export const templateRecordSchema = templateSummarySchema.extend({ content: templateContentSchema });
export const createTemplateInputSchema = z.object({ name: z.string().trim().min(1).max(200) }).strict();
export const saveDraftInputSchema = z.object({ name: z.string().trim().min(1).max(200), content: templateContentSchema }).strict();

export type TemplateSummary = z.infer<typeof templateSummarySchema>;
export type TemplateRecord = z.infer<typeof templateRecordSchema>;
export type SaveDraftInput = z.infer<typeof saveDraftInputSchema>;
