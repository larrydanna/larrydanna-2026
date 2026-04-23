import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO 8601 (YYYY-MM-DD)'),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const tips = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tips' }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO 8601 (YYYY-MM-DD)'),
    tags: z.array(z.string()).default([]),
    language: z.string().default('general'),
    draft: z.boolean().default(false),
  }),
});

const music = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/music' }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be ISO 8601 (YYYY-MM-DD)'),
    description: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    lyrics: z.string().default(''),
    tracks: z.array(z.object({
      id: z.string(),
      title: z.string().optional(),
      note: z.string().optional(),
    })).default([]),
  }),
});

export const collections = { blog, tips, music };
