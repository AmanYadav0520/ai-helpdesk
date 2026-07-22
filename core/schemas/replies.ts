import { z } from "zod";

export const createReplySchema = z.object({
  ticketId: z.number().int().positive(),
  body: z.string().trim().min(1, "Reply body is required"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
