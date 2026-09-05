import { z } from 'zod';

export const postIngestSchema = z.object({
  source_type: z.enum(['url', 'markdown']),
  source_url: z.string().url().optional(),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
});

export type PostIngestInput = z.infer<typeof postIngestSchema>;

export function validatePostIngest(data: unknown) {
  return postIngestSchema.safeParse(data);
}
