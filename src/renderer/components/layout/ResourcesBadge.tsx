import { Badge } from '@renderer/components/ui/badge';
import { getOrphanCount, getUpdateCount, resourcesQueryOptions } from '@renderer/resources';
import { useQuery } from '@tanstack/react-query';

export function ResourcesBadge() {
  // Subscribe to resources query but let centralized hook handle invalidation
  // This ensures badge updates when data changes without causing extra fetches
  const { data: resources = [] } = useQuery({
    ...resourcesQueryOptions(),
    staleTime: Infinity, // Never auto-refetch, rely on event-driven invalidation
  });
  const count = getOrphanCount(resources) + getUpdateCount(resources);

  if (count === 0) return null;

  return (
    <Badge
      variant="outline"
      className="absolute right-0 bottom-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
    >
      {count}
    </Badge>
  );
}

export function ResourcesBadgeTooltip() {
  // Subscribe to resources query but let centralized hook handle invalidation
  const { data: resources = [] } = useQuery({
    ...resourcesQueryOptions(),
    staleTime: Infinity, // Never auto-refetch, rely on event-driven invalidation
  });
  const orphanCount = getOrphanCount(resources);
  const updateCount = getUpdateCount(resources);

  if (orphanCount === 0 && updateCount === 0) return null;

  return (
    <p className="text-muted-foreground text-xs">
      {orphanCount > 0 && `${orphanCount} orphan${orphanCount !== 1 ? 's' : ''}`}
      {orphanCount > 0 && updateCount > 0 && ', '}
      {updateCount > 0 && `${updateCount} update${updateCount !== 1 ? 's' : ''}`}
    </p>
  );
}
