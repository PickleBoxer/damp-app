import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: 'export', // Enable static export for GitHub Pages
  reactStrictMode: true,
  basePath: process.env.PAGES_BASE_PATH || '', // Set base path from environment variable, default to root
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.PAGES_BASE_PATH || '', // Expose base path for client-side use
  },
  images: {
    unoptimized: true, // Required for static export
  },
};

export default withMDX(config);
