import React from 'react';
import DragWindowRegion from '@/components/DragWindowRegion';
import Sidebar from '@/components/Sidebar';
import Footer from '@/components/template/Footer';
import CaddyStatusBanner from '@/components/CaddyStatusBanner';
import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

export default function BaseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      <DragWindowRegion />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="relative flex flex-1 flex-col overflow-auto">
          <CaddyStatusBanner />
          {children}
        </main>
      </div>
      <Footer />
      <Toaster
        position="bottom-right"
        theme={resolvedTheme}
        richColors
        closeButton
        expand={false}
        visibleToasts={5}
        toastOptions={{
          style: {
            pointerEvents: 'auto',
            padding: '8px 12px',
            minHeight: '40px',
            fontSize: '11px',
          },
        }}
      />
    </div>
  );
}
