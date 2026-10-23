import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Each collection is a folder of Markdown files under src/content/.
// Add a new post, project or product by copying an existing file and editing it.

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    // Where the piece was first published, if anywhere (LinkedIn, Substack, ...).
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    draft: z.boolean().default(false),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    name: z.string(),
    kind: z.string(),
    order: z.number(),
    ran: z.string(),
    worked: z.string(),
    link: z.string().optional(),
    linkLabel: z.string().optional(),
    // Set to true while the entry still holds sample text that must be replaced.
    placeholder: z.boolean().default(false),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    summary: z.string(),
    price: z.string(),
    // A Gumroad, Lemon Squeezy or Stripe Payment Link. No payment code lives on this site.
    buyUrl: z.string(),
    buyLabel: z.string().default('Buy'),
    order: z.number(),
    placeholder: z.boolean().default(false),
  }),
});

export const collections = { writing, work, products };
