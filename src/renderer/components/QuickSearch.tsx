import { Search, Command } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@renderer/components/ui/dialog';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { Kbd } from '@renderer/components/ui/kbd';
import { useProjects } from '@renderer/queries/projects-queries';
import { useServices } from '@renderer/queries/services-queries';
import { isMacOS } from '@shared/utils/platform';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'project' | 'service' | 'page';
  path: string;
  icon?: React.ReactNode;
}

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsErr,
  } = useProjects();
  const {
    data: services,
    isLoading: servicesLoading,
    isError: servicesError,
    error: servicesErr,
  } = useServices();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check loading states (only initial loading, not background refetch)
  const isLoading = projectsLoading || servicesLoading;
  const hasErrors = projectsError || servicesError;

  // Build search items (only when data is available)
  const searchItems: SearchItem[] = [
    // Pages
    { id: 'page-dashboard', title: 'Dashboard', subtitle: 'Home', type: 'page', path: '/' },
    {
      id: 'page-projects',
      title: 'Projects',
      subtitle: 'All projects',
      type: 'page',
      path: '/projects',
    },
    {
      id: 'page-services',
      title: 'Services',
      subtitle: 'All services',
      type: 'page',
      path: '/services',
    },
    {
      id: 'page-settings',
      title: 'Settings',
      subtitle: 'App settings',
      type: 'page',
      path: '/settings',
    },
    // Projects (only if loaded successfully)
    ...(!projectsError && projects
      ? projects.map(project => ({
          id: project.id,
          title: project.name,
          subtitle: `Project • ${project.domain}`,
          type: 'project' as const,
          path: `/projects/${project.id}`,
        }))
      : []),
    // Services (only if loaded successfully)
    ...(!servicesError && services
      ? services.map(service => ({
          id: service.definition.id,
          title: service.definition.display_name,
          subtitle: `Service • ${service.definition.description}`,
          type: 'service' as const,
          path: `/services/${service.definition.id}`,
        }))
      : []),
  ];

  // Fuzzy search filter
  const filteredItems = search
    ? searchItems.filter(item => {
        const searchLower = search.toLowerCase();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          item.subtitle.toLowerCase().includes(searchLower)
        );
      })
    : searchItems.slice(0, 8); // Show recent/top items

  // Track previous filtered items length to reset selection
  const prevFilteredLengthRef = useRef(filteredItems.length);

  useEffect(() => {
    // Only reset when items actually change (not on mount)
    if (prevFilteredLengthRef.current !== filteredItems.length) {
      prevFilteredLengthRef.current = filteredItems.length;
      setSelectedIndex(0);
    }
  }, [filteredItems.length]);

  // Scroll to selected item when index changes
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      setSearch('');
      navigate({ to: item.path });
    },
    [navigate]
  );

  const modKey = isMacOS() ? '⌘' : 'Ctrl';

  return (
    <>
      {/* Search trigger button in title bar */}
      <button
        onClick={() => setOpen(true)}
        className="bg-primary/5 border-border hover:bg-muted hover:border-ring/20 relative flex h-[26px] w-[320px] items-center justify-center gap-2 border px-3 font-mono text-sm transition-all duration-100"
      >
        <Search className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground text-xs">DAMP</span>
        <Kbd className="bg-background absolute right-3">{modKey}P</Kbd>
      </button>

      {/* Command palette dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-lg [&>button]:top-2">
          <VisuallyHidden>
            <DialogTitle>Quick Search</DialogTitle>
            <DialogDescription>Search for projects, services, and pages</DialogDescription>
          </VisuallyHidden>

          {/* Search input */}
          <div className="flex min-w-0 items-center border-b px-3 py-2">
            <Search className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
            <input
              autoFocus
              placeholder="Search projects, services, pages..."
              aria-label="Search projects, services, and pages"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter' && filteredItems.length > 0) {
                  e.preventDefault();
                  handleSelect(filteredItems[selectedIndex]);
                }
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground mr-8 ml-2 shrink-0 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="text-muted-foreground mb-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <p className="text-muted-foreground text-sm">Loading projects and services...</p>
              </div>
            ) : hasErrors ? (
              <div className="space-y-4 p-4">
                {projectsError && (
                  <div className="border-destructive/50 bg-destructive/10 border p-3">
                    <p className="text-destructive mb-1 text-sm font-medium">
                      Failed to load projects
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {projectsErr instanceof Error
                        ? projectsErr.message
                        : 'An unknown error occurred'}
                    </p>
                  </div>
                )}
                {servicesError && (
                  <div className="border-destructive/50 bg-destructive/10 border p-3">
                    <p className="text-destructive mb-1 text-sm font-medium">
                      Failed to load services
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {servicesErr instanceof Error
                        ? servicesErr.message
                        : 'An unknown error occurred'}
                    </p>
                  </div>
                )}
                {!projectsError && !servicesError && (
                  <div className="text-muted-foreground text-center text-sm">
                    Some data could not be loaded. Try again later.
                  </div>
                )}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center text-sm">No results found</div>
            ) : (
              <div className="py-2">
                {filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    ref={index === selectedIndex ? selectedItemRef : null}
                    onClick={() => handleSelect(item)}
                    className={`flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      index === selectedIndex ? 'bg-muted' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="bg-primary/5 flex h-8 w-8 shrink-0 items-center justify-center">
                      {item.type === 'project' && <Command className="text-primary h-4 w-4" />}
                      {item.type === 'service' && (
                        <div className="bg-primary h-2 w-2 rounded-full" />
                      )}
                      {item.type === 'page' && <Search className="text-muted-foreground h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="truncate text-sm font-medium">{item.title}</div>
                      <div className="text-muted-foreground truncate text-xs">{item.subtitle}</div>
                    </div>
                    {index === selectedIndex && <Kbd className="bg-background shrink-0">↵</Kbd>}
                  </button>
                ))}
              </div>
            )}
            {/* Partial success notice */}
            {!isLoading && (projectsError || servicesError) && filteredItems.length > 0 && (
              <div className="border-t bg-amber-500/10 px-4 py-2">
                <p className="text-xs wrap-break-word text-amber-700 dark:text-amber-400">
                  ⚠️ {projectsError ? 'Projects' : 'Services'} could not be loaded. Showing
                  available results only.
                </p>
              </div>
            )}
          </ScrollArea>

          {/* Footer hint */}
          <div className="text-muted-foreground bg-muted/30 flex flex-wrap items-center gap-2 border-t px-3 py-2 text-xs sm:gap-4">
            <span className="flex shrink-0 items-center gap-1">
              <Kbd className="bg-background">↑↓</Kbd> to navigate
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Kbd className="bg-background">↵</Kbd> to select
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Kbd className="bg-background">ESC</Kbd> to close
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
