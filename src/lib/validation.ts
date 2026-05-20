import { z } from "zod";

export const tagsField = z
  .string()
  .optional()
  .transform((s) =>
    (s ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"))
      .filter((t) => t.length > 0 && t.length <= 24)
      .slice(0, 8)
  );

export const spiceField = z
  .enum(["mild", "medium", "spicy"])
  .default("mild");

export const uploadMetaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  tags: tagsField,
  spice: spiceField,
});

export const generateSchema = z.object({
  topic: z.string().trim().min(3).max(200),
  slideCount: z.coerce.number().int().min(5).max(20).default(10),
  spice: spiceField,
});

export const roomConfigSchema = z.object({
  maxRoundSeconds: z.coerce.number().int().min(30).max(600).default(180),
  rubric: z
    .array(z.string().trim().min(1).max(32))
    .min(1)
    .max(6)
    .default(["Humor", "Recovery", "Confidence", "Slide Mockery"]),
});

export const joinSchema = z.object({
  displayName: z.string().trim().min(1).max(24),
});

export const rateSchema = z.object({
  criterion: z.string().trim().min(1).max(32),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(140).optional(),
});

export const skipVoteSchema = z.object({
  slideId: z.string().min(1),
});
