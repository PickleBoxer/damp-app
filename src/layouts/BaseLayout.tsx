import React from 'react';
import DragWindowRegion from '@/components/DragWindowRegion';
import IconNav from '@/components/IconNav';
import Footer from '@/components/template/Footer';
import { Toaster } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      <DragWindowRegion />
      <div className="flex flex-1 overflow-hidden">
        <IconNav />
        <main className="flex-1 overflow-auto">{children}</main>
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
