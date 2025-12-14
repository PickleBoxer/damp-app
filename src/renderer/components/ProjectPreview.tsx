import { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import { Safari } from '@renderer/components/ui/safari';
import type { Project } from '@shared/types/project';

interface ProjectPreviewProps {
  project: Project;
  forwardedLocalhostPort?: number | null;
  isRunning?: boolean; // Passed from parent (detail view has batch status)
}

export function ProjectPreview({
  project,
  forwardedLocalhostPort,
  isRunning = false,
}: Readonly<ProjectPreviewProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Determine preview URL: prefer localhost port if discovered, fallback to Caddy domain
  const previewUrl = forwardedLocalhostPort
    ? `http://localhost:${forwardedLocalhostPort}`
    : `https://${project.domain}`;

  const displayUrl = forwardedLocalhostPort
    ? `localhost:${forwardedLocalhostPort}`
    : project.domain;

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
    const ro = new globalThis.ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="h-36 max-h-max overflow-hidden rounded duration-700 hover:h-96 hover:transition-[height] hover:duration-800">
      <div className="relative mx-auto w-full max-w-2xl">
        <Safari url={displayUrl} className="h-auto w-full" />
        {/* Overlay the preview in the content area */}
        <div className="pointer-event-none absolute inset-0 top-[6.9%] right-[0.08%] bottom-[1.6%] left-[0.08%] overflow-hidden">
          <div className="h-full w-full overflow-hidden">
            <div
              ref={containerRef}
              className="bg-card flex h-full w-full items-center justify-center overflow-hidden"
            >
              {isRunning ? (
                <div
                  className="relative h-full w-full overflow-hidden"
                  style={{
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    className="absolute top-0 left-0 origin-top-left"
                    style={{
                      transform: `scale(${scale})`,
                      width: '1920px',
                      height: '1080px',
                    }}
                  >
                    <webview
                      key={previewUrl}
                      src={previewUrl}
                      style={{ width: '1920px', height: '1080px', pointerEvents: 'none' }}
                    />
                  </div>
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
