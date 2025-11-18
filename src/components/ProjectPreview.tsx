import { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import { Safari } from '@/components/ui/safari';
import type { Project } from '@/types/project';

interface ProjectPreviewProps {
  project: Project;
}

export function ProjectPreview({ project }: ProjectPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const el = containerRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const scaleW = width / 1920;
      const scaleH = height / 1080;
      setScale(Math.min(scaleW, scaleH));
    };
    updateScale();
    const ro = new window.ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // TODO: Replace with actual running status when available
  const isRunning = false;

  return (
    <div className="h-36 max-h-max overflow-hidden rounded duration-700 hover:h-96 hover:transition-[height] hover:duration-800">
      <div className="relative mx-auto w-full max-w-2xl">
        <Safari url={project.domain} className="h-auto w-full" />
        {/* Overlay the preview in the content area */}
        <div className="pointer-event-none absolute inset-0 top-[6.9%] right-[0.08%] bottom-[1.6%] left-[0.08%] overflow-hidden">
          <div className="h-full w-full overflow-hidden">
            <div
              ref={containerRef}
              className="bg-card flex h-full w-full items-center justify-center overflow-hidden"
            >
              {isRunning ? (
                <div
                  className="origin-top-left"
                  style={{
                    pointerEvents: 'none',
                    transform: `scale(${scale})`,
                    width: '400%',
                    height: '400%',
                  }}
                >
                  <iframe
                    src={`https://${project.domain}`}
                    title={project.name}
                    width={1920}
                    height={1080}
                    className="rounded-md border-0"
                    style={{ pointerEvents: 'none' }}
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <Globe className="h-8 w-8 opacity-50" />
                  <p className="text-xs">Project not running</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
