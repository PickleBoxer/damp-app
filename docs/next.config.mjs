import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: 'export', // Enable static export for GitHub Pages
  reactStrictMode: true,
  images: {
    unoptimized: true, // Required for static export
  },
};

export default withMDX(config);
