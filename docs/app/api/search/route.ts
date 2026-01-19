import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Enable static mode - cache the search index as JSON for GitHub Pages
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});
