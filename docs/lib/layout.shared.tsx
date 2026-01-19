import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Box, Download, ScrollText } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa6';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Box className="size-6" aria-label="Logo" />
          Damp
        </>
      ),
    },
    // see https://fumadocs.dev/docs/ui/navigation/links
    links: [
      {
        text: 'Changelog',
        url: '/changelog',
        icon: <ScrollText />,
      },
      {
        text: 'Download',
        url: '/download',
        icon: <Download />,
      },
      {
        type: 'icon',
        label: 'Discord', // `aria-label`
        icon: <FaDiscord />,
        text: 'Discord',
        url: 'https://discord.gg/hSXe4vmMF',
      },
    ],
  };
}
