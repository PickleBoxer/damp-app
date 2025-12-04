import React from 'react';
import DragWindowRegion from '@/components/DragWindowRegion';
import AppSidebar from '@/components/template/Sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import Footer from '@/components/template/Footer';
import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-screen flex-col overflow-hidden select-none">
        <DragWindowRegion />
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
