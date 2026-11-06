import { z } from "zod";

import { isLikelyPlaceholderPhone, isOtaRelayEmail } from "./contact-hygiene";

export const arrivalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().default("");
const directEmail = z.email("Enter a valid email address.").max(254).refine((value) => !isOtaRelayEmail(value), "Enter the guest's direct email address.");
const genuinePhone = z.string().trim().min(1, "Enter the guest's phone number.").max(50).refine((value) => !isLikelyPlaceholderPhone(value), "Enter a genuine guest phone number.");
const optionalEmail = z.union([z.literal(""), directEmail]).optional().default("");
const optionalPhone = optionalText(50).refine((value) => !isLikelyPlaceholderPhone(value), "Enter a genuine guest phone number.");

export const signingStatusSchema = z.enum(["pending", "in_progress", "upload_pending", "signed", "needs_attention"]);
export const guestSourceSchema = z.enum(["arrival", "walk_in"]);

export const arrivalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arrivalDate: arrivalDateSchema,
  email: z.string(),
  phone: z.string(),
  vehicle: z.string(),
  source: guestSourceSchema,
  signingStatus: signingStatusSchema,
}).strict();

export const walkInInputSchema = z.object({
  name: z.string().trim().min(1, "Enter the guest name.").max(200),
  arrivalDate: arrivalDateSchema,
  email: optionalEmail,
  phone: optionalPhone,
  vehicle: optionalText(100),
}).strict();

export const contactUpdateSchema = z.object({
  email: optionalEmail,
  phone: optionalPhone,
  vehicle: optionalText(100),
}).strict();

export const signingSubmissionSchema = z.object({
  name: z.string().trim().min(1, "Enter the guest name.").max(200),
  email: directEmail,
  phone: genuinePhone,
  vehicle: optionalText(100),
  accepted: z.literal(true, { error: "Confirm that the guest has read and understood the agreement." }),
  signature: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, "Draw a signature before submitting.").max(750_000),
}).strict();

export type Arrival = z.infer<typeof arrivalSchema>;
export type WalkInInput = z.infer<typeof walkInInputSchema>;
export type ContactUpdate = z.infer<typeof contactUpdateSchema>;
export type SigningSubmission = z.infer<typeof signingSubmissionSchema>;
