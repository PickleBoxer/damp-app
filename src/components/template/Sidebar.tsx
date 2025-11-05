"use client";
import * as React from "react";
import { Command, Globe, Home, Info, Server, Settings } from "lucide-react";
import { NavUser } from "@/components/NavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

// This is sample data
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
};

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  return (
    <Sidebar
      collapsible="none"
      className="h-full min-h-svh w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <Link to="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: t("titleDashboardPage"),
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                  asChild
                >
                  <Link to="/">
                    <Home />
                    <span>{t("titleDashboardPage")}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton
                  tooltip={{
                    children: t("titleServicesPage"),
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                  asChild
                >
                  <Link to="/services">
                    <Server />
                    <span>{t("titleServicesPage")}</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton
                  tooltip={{
                    children: t("titleSitesPage"),
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                  asChild
                >
                  <Link to="/sites">
                    <Globe />
                    <span>{t("titleSitesPage")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={{
                  children: t("titleSettingsPage"),
                  hidden: false,
                }}
                className="px-2.5 md:px-2"
                asChild
              >
                <Link to="/settings">
                  <Settings />
                  <span>{t("titleSettingsPage")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={{
                  children: t("titleAboutPage"),
                  hidden: false,
                }}
                className="px-2.5 md:px-2"
                asChild
              >
                <Link to="/about">
                  <Info />
                  <span>{t("titleAboutPage")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
