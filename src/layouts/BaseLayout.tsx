import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import AppSidebar from "@/components/template/Sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DragWindowRegion title="Damp App" />
        <main className="flex flex-1 flex-col p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
