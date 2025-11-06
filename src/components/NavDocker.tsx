"use client";
import {
  ChevronUp,
  Play,
  Terminal,
  ChevronRight,
  RefreshCcw,
  Square,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiDocker } from "react-icons/si";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useDockerStatus } from "@/api/docker/docker-queries";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useState } from "react";

export function NavDocker() {
  const { isMobile } = useSidebar();
  const {
    data: dockerStatus,
    refetch,
    isRefetching,
    isLoading,
  } = useDockerStatus();
  const [isOpen, setIsOpen] = useState(false);

  // Determine status based on Docker state
  let status;
  if (dockerStatus?.error) {
    status = { text: "Error", color: "text-red-500", dot: "bg-red-500" };
  } else if (dockerStatus?.isRunning) {
    status = { text: "Running", color: "text-green-500", dot: "bg-green-500" };
  } else if (isLoading || !dockerStatus) {
    status = {
      text: "Checking...",
      color: "text-yellow-500",
      dot: "bg-yellow-500",
    };
  } else {
    status = { text: "Stopped", color: "text-gray-500", dot: "bg-gray-500" };
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="relative flex items-center justify-center">
                <SiDocker color="#2496ED" />
                <div className="absolute -right-1 -bottom-1 h-2 w-2">
                  <span
                    className={`absolute inset-0 inline-flex h-full w-full animate-ping rounded-full opacity-75 ${status.dot}`}
                  ></span>
                  <span
                    className={`absolute inset-0 inline-flex h-full w-full rounded-full ${status.dot}`}
                  ></span>
                </div>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-md"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-1.5 text-left text-sm">
                <SiDocker className="size-4" color="#2496ED" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <div className="mt-1 flex items-center justify-between">
                      <p className={`truncate text-xs ${status.color}`}>
                        {status.text}
                      </p>
                      {dockerStatus?.error && (
                        <CollapsibleTrigger asChild>
                          <span className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs transition-colors">
                            {isOpen ? (
                              <>
                                Hide <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Details <ChevronRight className="h-3 w-3" />
                              </>
                            )}
                          </span>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    {dockerStatus?.error && (
                      <CollapsibleContent className="text-muted-foreground bg-muted/50 mt-1 rounded-md border p-2 font-mono text-xs break-all">
                        {dockerStatus.error}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => refetch()}>
                <RefreshCcw className={isRefetching ? "animate-spin" : ""} />
                Refresh Status
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={!dockerStatus?.isRunning}>
                <Play className="text-emerald-500" />
                Start All Services
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!dockerStatus?.isRunning}>
                <Square className="text-destructive" />
                Stop All Services
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Terminal />
                Open Terminal
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
