/**
 * Resources Page - Docker Resource Management
 * Displays all DAMP-managed containers and volumes with filtering, sorting, and pagination
 */

import { Badge } from '@renderer/components/ui/badge';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import { Input } from '@renderer/components/ui/input';
import { ScrollArea, ScrollBar } from '@renderer/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@renderer/components/ui/table';
import {
  getOrphanCount,
  getOrphanedResources,
  getServicesNeedingUpdate,
  getUpdateCount,
  resourcesKeys,
  resourcesQueryOptions,
} from '@renderer/resources';
import type { DockerResource } from '@shared/types/resource';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronLeftPipe,
  IconChevronRight,
  IconChevronRightPipe,
  IconContainer,
  IconDatabase,
  IconDotsVertical,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type GroupingState,
  type SortingState,
} from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/resources')({
  loader: async ({ context: { queryClient } }) => {
    // Non-blocking prefetch
    void queryClient.prefetchQuery(resourcesQueryOptions());
  },
  component: ResourcesPage,
});

function ResourcesPage() {
  const {
    data: resources = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery(resourcesQueryOptions());
  const queryClient = useQueryClient();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [grouping, setGrouping] = useState<GroupingState>(['ownerId']);
  const [expanded, setExpanded] = useState<ExpandedState>(true);
  const [pageSize, setPageSize] = useState(50);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<DockerResource | null>(null);

  // Mutations for individual resource actions (not used for bulk operations)
  const deleteResourceMutation = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      (globalThis as unknown as Window).resources.deleteResource(type, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourcesKeys.all() });
      toast.success('Resource deleted', {
        description: 'The resource has been successfully deleted.',
      });
    },
    onError: (error: Error) => {
      toast.error('Delete failed', {
        description: error.message,
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: (serviceId: string) =>
      (globalThis as unknown as Window).resources.updateService(serviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourcesKeys.all() });
      toast.success('Service updated', {
        description: 'The service has been successfully updated with the new definition.',
      });
    },
    onError: (error: Error) => {
      toast.error('Update failed', {
        description: error.message,
      });
    },
  });
  const handlePruneOrphans = async () => {
    const orphans = getOrphanedResources(resources);
    if (orphans.length === 0) {
      toast.info('No orphaned resources', {
        description: 'There are no orphaned resources to delete.',
      });
      return;
    }

    // Separate orphans by type for batch deletion
    const containerIds = orphans.filter(o => o.type === 'container').map(o => o.id);
    const volumeNames = orphans.filter(o => o.type === 'volume').map(o => o.id);

    try {
      // Batch delete using Docker prune APIs (single call, much faster)
      const result = await (globalThis as unknown as Window).resources.pruneOrphans(
        containerIds,
        volumeNames
      );

      // Single invalidation after batch operation
      void queryClient.invalidateQueries({ queryKey: resourcesKeys.all() });

      const totalDeleted = result.deletedContainers.length + result.deletedVolumes.length;
      const totalFailed = result.failedContainers.length + result.failedVolumes.length;

      if (totalFailed === 0 && totalDeleted > 0) {
        toast.success('Orphaned resources deleted', {
          description: `Successfully deleted ${totalDeleted} orphaned resource(s).`,
        });
        return;
      }

      if (totalDeleted > 0 && totalFailed > 0) {
        toast.warning('Some orphaned resources could not be deleted', {
          description: `Deleted ${totalDeleted} orphaned resource(s); ${totalFailed} deletion(s) failed. Check logs for details.`,
        });
        return;
      }

      toast.error('Failed to delete orphaned resources', {
        description: `${totalFailed} orphaned resource(s) could not be deleted. Check logs for details.`,
      });
    } catch (error) {
      toast.error('Failed to delete orphaned resources', {
        description: error instanceof Error ? error.message : 'Unknown error occurred.',
      });
    }
  };

  const handleUpdateAllServices = async () => {
    const servicesNeedingUpdate = getServicesNeedingUpdate(resources);
    if (servicesNeedingUpdate.length === 0) {
      toast.info('All services up to date', {
        description: 'There are no services that need updating.',
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Update services individually (no batch API for service updates)
    for (const resource of servicesNeedingUpdate) {
      const serviceId = resource.labels['com.pickleboxer.damp.service-id'];
      if (serviceId) {
        try {
          await (globalThis as unknown as Window).resources.updateService(serviceId);
          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to update service ${serviceId}:`, error);
        }
      }
    }

    // Single invalidation after all updates complete
    void queryClient.invalidateQueries({ queryKey: resourcesKeys.all() });

    if (failCount === 0 && successCount > 0) {
      toast.success('Services updated', {
        description: `Successfully updated ${successCount} service(s).`,
      });
      return;
    }

    if (successCount > 0 && failCount > 0) {
      toast.warning('Some services failed to update', {
        description: `Updated ${successCount} service(s), ${failCount} failed.`,
      });
    }
  };

  // Resources already include ownerId and ownerDisplayName from backend

  // Table columns (React Compiler auto-memoizes)
  const columns: ColumnDef<DockerResource>[] = [
    {
      accessorKey: 'ownerId',
      enableHiding: true,
      enableGrouping: true,
      cell: () => null,
      header: () => null,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableGrouping: false,
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null;
        return <span className="font-mono text-sm">{row.original.name}</span>;
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      filterFn: 'equals',
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null;
        const Icon = row.original.type === 'volume' ? IconDatabase : IconContainer;
        return (
          <Badge variant="outline" className="flex w-fit items-center gap-1.5 capitalize">
            <Icon className="h-3 w-3" />
            {row.original.type}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      filterFn: 'equals',
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null;
        return (
          <Badge variant="secondary" className="capitalize">
            {row.original.category}
          </Badge>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null;
        const resource = row.original;
        return (
          <div className="flex items-center gap-2">
            {resource.isOrphan && (
              <Badge variant="destructive" className="text-xs">
                Orphaned
              </Badge>
            )}
            {resource.needsUpdate && (
              <Badge variant="default" className="text-xs">
                Update Available
              </Badge>
            )}
            {!resource.isOrphan && !resource.needsUpdate && (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => {
        if (row.getIsGrouped()) return null;
        const resource = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <IconDotsVertical className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {resource.needsUpdate && resource.type === 'container' && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedResource(resource);
                    setUpdateDialogOpen(true);
                  }}
                  disabled={updateServiceMutation.isPending}
                >
                  <IconRefresh className="h-4 w-4" />
                  Update
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  setSelectedResource(resource);
                  setDeleteDialogOpen(true);
                }}
                disabled={deleteResourceMutation.isPending}
              >
                <IconTrash className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: resources,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      grouping,
      expanded,
    },
    initialState: {
      pagination: {
        pageSize,
      },
      columnVisibility: {
        ownerId: false,
      },
    },
  });

  // Update page size when changed
  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  const orphanCount = getOrphanCount(resources);
  const updateCount = getUpdateCount(resources);

  // Calculate total resource count (excluding group rows)
  const totalResourceCount = table
    .getFilteredRowModel()
    .rows.filter(row => !row.getIsGrouped()).length;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Docker Resources</h1>
          <p className="text-muted-foreground text-sm">
            Manage all DAMP-managed containers and volumes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orphanCount > 0 && (
            <Button variant="destructive" onClick={handlePruneOrphans}>
              <IconTrash className="mr-2 h-4 w-4" />
              Delete Orphans ({orphanCount})
            </Button>
          )}
          {updateCount > 0 && (
            <Button variant="default" onClick={handleUpdateAllServices}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Update Services ({updateCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search resources..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={(table.getColumn('type')?.getFilterValue() as string) ?? 'all'}
          onValueChange={value =>
            table.getColumn('type')?.setFilterValue(value === 'all' ? '' : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="container">Container</SelectItem>
            <SelectItem value="volume">Volume</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={(table.getColumn('category')?.getFilterValue() as string) ?? 'all'}
          onValueChange={value =>
            table.getColumn('category')?.setFilterValue(value === 'all' ? '' : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="bundled">Bundled</SelectItem>
            <SelectItem value="helper">Helper</SelectItem>
            <SelectItem value="ngrok">Ngrok</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <IconRefresh className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="min-h-0 flex-1 rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => {
                if (row.getIsGrouped()) {
                  const firstResource = row.subRows[0]?.original;
                  const displayName =
                    firstResource?.ownerDisplayName || (row.groupingValue as string);
                  const ownerCategory = firstResource?.category;

                  // Count orphaned and update-needed resources in this group
                  const orphanCount = row.subRows.filter(subRow => subRow.original.isOrphan).length;
                  const updateCount = row.subRows.filter(
                    subRow => subRow.original.needsUpdate
                  ).length;

                  return (
                    <TableRow key={row.id}>
                      <TableCell colSpan={row.getVisibleCells().length} className="py-2">
                        <div className="flex items-center gap-2 font-semibold">
                          <button
                            onClick={row.getToggleExpandedHandler()}
                            className="cursor-pointer hover:opacity-70"
                            aria-expanded={row.getIsExpanded()}
                            aria-label={`${row.getIsExpanded() ? 'Collapse' : 'Expand'} ${displayName} group`}
                          >
                            {row.getIsExpanded() ? (
                              <IconChevronDown className="h-4 w-4" />
                            ) : (
                              <IconChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px] capitalize">
                            {ownerCategory}
                          </Badge>
                          <span>{displayName}</span>
                          <span className="text-muted-foreground text-xs font-normal">
                            ({row.subRows.length} resource{row.subRows.length === 1 ? '' : 's'})
                          </span>
                          {orphanCount > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {orphanCount} Orphaned
                            </Badge>
                          )}
                          {updateCount > 0 && (
                            <Badge variant="default" className="text-[10px]">
                              {updateCount} Update{updateCount === 1 ? '' : 's'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                return (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No resources found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">{totalResourceCount} row(s) total.</div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm">Rows per page</span>
            <Select value={pageSize.toString()} onValueChange={value => setPageSize(Number(value))}>
              <SelectTrigger className="h-8 w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to first page"
            >
              <IconChevronLeftPipe className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Go to previous page"
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to next page"
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Go to last page"
            >
              <IconChevronRightPipe className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {selectedResource?.type}?
              <br />
              <span className="font-mono text-sm">{selectedResource?.name}</span>
              <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedResource) {
                  deleteResourceMutation.mutate({
                    type: selectedResource.type,
                    id: selectedResource.id,
                  });
                  setDeleteDialogOpen(false);
                }
              }}
              disabled={deleteResourceMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Service Confirmation Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Service</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <div>
                  Updating this service will <strong>DELETE ALL DATA</strong> including the
                  container and volumes, then reinstall with the new service definition.
                </div>
                <div className="text-destructive font-semibold">
                  ⚠️ BACKUP YOUR DATA BEFORE PROCEEDING
                </div>
                <div className="font-mono text-sm">{selectedResource?.name}</div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedResource) {
                  const serviceId = selectedResource.labels['com.pickleboxer.damp.service-id'];
                  if (serviceId) {
                    updateServiceMutation.mutate(serviceId);
                  }
                  setUpdateDialogOpen(false);
                }
              }}
              disabled={updateServiceMutation.isPending}
            >
              Update (Data Will Be Lost)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
