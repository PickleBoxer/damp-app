import { z } from 'zod';

// GitHub API response schema
export const releaseSchema = z.object({
  tag_name: z.string(),
  name: z.string().optional(),
  published_at: z.string(),
  body: z.string().optional(),
  assets: z.array(
    z.object({
      name: z.string(),
      browser_download_url: z.string(),
      size: z.number(),
      download_count: z.number().optional(),
    })
  ),
});

export type GitHubRelease = z.infer<typeof releaseSchema>;

// Processed release data for the app
export interface ReleaseData {
  version: string;
  date: string;
  setupUrl: string;
  portableUrl: string;
}
