import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { Book } from 'lucide-react';

export default function Layout({ children }: LayoutProps<'/'>) {
  const options = baseOptions();

  // Add Documentation link only on home layout
  const homeLinks = [
    {
      text: 'Documentation',
      url: '/docs',
      icon: <Book />,
    },
    ...(options.links || []),
  ];

  return (
    <HomeLayout {...options} links={homeLinks}>
      {children}
    </HomeLayout>
  );
}
