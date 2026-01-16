# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Fumadocs-powered Next.js 15 documentation site for Damp, using:

- **Fumadocs MDX** for content processing from MDX files
- **Fumadocs UI** for pre-built documentation components
- **Next.js 15** with App Router, React 19, and Turbopack
- **Cloudflare Pages** deployment via OpenNext

## Common Commands

```bash
# Development (uses Turbopack)
pnpm dev

# Build production site
pnpm build

# Lint code
pnpm lint

# Preview Cloudflare deployment
pnpm preview

# Deploy to Cloudflare
pnpm deploy

# Generate Cloudflare types
pnpm cf-typegen
```

## Architecture

### Content Pipeline

The content system follows this flow:

1. MDX files in `content/docs/*.mdx` and `content/changelog/*.mdx` are defined in `source.config.ts`
2. Build step (`postinstall: fumadocs-mdx`) generates `.source/` with typed content exports
3. `lib/source.ts` creates two loaders (`source` and `changelogSource`) using `loader()` API
4. Pages consume via `source.getPage(slug)`, `source.pageTree`, `source.getPages()`

**Never manually edit `.source/`** - it's auto-generated. Modify `source.config.ts` to customize schema.

### Dual Content Sources

This project has TWO separate content sources:

- **Documentation** (`source`): MDX files in `content/docs/` with standard frontmatter
- **Changelog** (`changelogSource`): MDX files in `content/changelog/` with extended schema (date, version, tags)

Both use the same loader pattern but with different schemas defined in `source.config.ts`.

### Route Structure

- `app/(home)/` - Landing pages (route group, no `/home` in URL)
- `app/docs/[[...slug]]/` - Documentation pages with catch-all dynamic routing
- `app/api/search/route.ts` - Search endpoint using Orama
- `app/api/releases/route.ts` - Release data API
- `app/og/docs/[...slug]/route.tsx` - OG image generation per page
- `app/llms-full.txt/route.ts` - LLM-optimized content export

### Layout System

Shared layout configuration lives in `lib/layout.shared.tsx` via `baseOptions()`:

- Nav title with logo (Box icon + "Damp")
- Links: Changelog, Download, Discord
- Both home and docs layouts import this for consistency

TypeScript path aliases:

- `@/*` - Root directory
- `@/.source` - Generated content source (auto-generated, do not edit)

### Styling System

- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **Fumadocs UI presets** in `app/global.css`:
  - `fumadocs-ui/css/neutral.css` - Color theme
  - `fumadocs-ui/css/preset.css` - Animations and utilities
- **Theme switching**: Built-in light/dark mode via `next-themes`
- **Color tokens**: CSS variables use `--color-fd-*` pattern
- **shadcn/ui compatible**: Can swap to `fumadocs-ui/css/shadcn.css` for shadcn integration

### MDX Components

MDX component resolution:

1. Default components from `fumadocs-ui/mdx` (Cards, Callouts, Code Blocks, etc.)
2. Custom components merged in `mdx-components.tsx` via `getMDXComponents()`
3. Relative links enabled via `createRelativeLink(source, page)` as anchor component
4. Lucide icons plugin enabled in `lib/source.ts`

### Deployment

Configured for Cloudflare Pages via OpenNext:

- `wrangler.jsonc` defines worker entry point and assets
- `open-next.config.ts` for OpenNext configuration
- Images are unoptimized (`next.config.mjs`) for Cloudflare compatibility
- Cache headers set for static assets and screenshots

## Key Files

- `source.config.ts` - Content collections schema (docs + changelog), MDX options
- `lib/source.ts` - Source loaders for docs and changelog, helper functions (`getPageImage`, `getLLMText`)
- `lib/layout.shared.tsx` - Shared nav/footer/links configuration
- `app/docs/[[...slug]]/page.tsx` - Template for all documentation pages
- `app/api/search/route.ts` - Search endpoint (Orama integration)
- `next.config.mjs` - Next.js config with MDX plugin and Cloudflare optimizations

## Adding Documentation

1. Create `content/docs/your-page.mdx` with frontmatter:
   ```yaml
   ---
   title: Page Title
   description: Page description for SEO
   ---
   ```
2. Auto-indexed by Fumadocs - no manual route registration needed
3. Page appears in navigation via file-system based `source.pageTree`

## Customizing Frontmatter

Edit `source.config.ts` to extend schema with Zod:

```typescript
import { z } from 'zod';
schema: frontmatterSchema.extend({
  author: z.string().optional(),
});
```

The changelog source already has a custom schema with `date`, `version`, and `tags` fields.

## Project Conventions

- **File-system routing**: No manual route registration; pages auto-discovered from content
- **Type-safe content**: `InferPageType<typeof source>` provides full type safety
- **Processed markdown**: `includeProcessedMarkdown: true` enables LLM/search indexing
- **OG images**: Auto-generated at `/og/docs/{slug}/image.png` for each doc
- **Relative links in MDX**: Can reference other pages by file path, not URL
