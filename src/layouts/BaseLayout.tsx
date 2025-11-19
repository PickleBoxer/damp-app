import React from 'react';
import DragWindowRegion from '@/components/DragWindowRegion';
import AppSidebar from '@/components/template/Sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Footer from '@/components/template/Footer';
import { Toaster } from 'sonner';
import { useRouterState, useMatches } from '@tanstack/react-router';
import { useProjects } from '@/api/projects/projects-queries';
import { useServices } from '@/api/services/services-queries';
import { useTheme } from '@/hooks/use-theme';

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const { location } = useRouterState();
  const matches = useMatches();
  const { data: projects } = useProjects();
  const { data: services } = useServices();
  const { resolvedTheme } = useTheme();

  // Compute breadcrumb based on current route
  const breadcrumb = React.useMemo(() => {
    const path = location.pathname;

    // Check for project detail page
    const projectMatch = matches.find(
      m => typeof m.id === 'string' && m.id.startsWith('/projects/') && m.id !== '/projects'
    );
    if (projectMatch?.params) {
      const projectId = (projectMatch.params as { projectId?: string }).projectId;
      const project = projects?.find(p => p.id === projectId);
      if (project) {
        return `Projects / ${project.name}`;
      }
    }

    // Check for service detail page
    const serviceMatch = matches.find(
      m => typeof m.id === 'string' && m.id.startsWith('/services/') && m.id !== '/services'
    );
    if (serviceMatch?.params) {
      const serviceId = (serviceMatch.params as { serviceId?: string }).serviceId;
      const service = services?.find(s => s.definition.id === serviceId);
      if (service) {
        return `Services / ${service.definition.name}`;
      }
    }

    // Default breadcrumbs for main pages
    if (path === '/') return 'Dashboard';
    if (path === '/projects') return 'Projects';
    if (path === '/services') return 'Services';
    if (path === '/settings') return 'Settings';
    if (path === '/about') return 'About';

    return path
      .replace('/', '')
      .split('/')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' / ');
  }, [location.pathname, matches, projects, services]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-screen flex-col overflow-hidden select-none">
        <DragWindowRegion title="DAMP" breadcrumb={breadcrumb} />
        <main className="flex-1 overflow-auto">{children}</main>
        <Footer />
      </SidebarInset>
      <Toaster
        position="bottom-right"
        theme={resolvedTheme}
        richColors
        closeButton
        expand={false}
        visibleToasts={5}
        toastOptions={{ style: { pointerEvents: 'auto' } }}
      />
    </SidebarProvider>
  );
}
