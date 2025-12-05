import { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { AboutDialog } from '@/components/AboutDialog';

function AboutPage() {
  const [open, setOpen] = useState(false);

  // Open dialog automatically on mount
  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <AboutDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export const Route = createFileRoute('/about')({
  component: AboutPage,
});
