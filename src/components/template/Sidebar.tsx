'use client';
import * as React from 'react';
import { Command, Globe, Home, Info, Server, Settings } from 'lucide-react';
import { NavDocker } from '@/components/NavDocker';
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
} from '@/components/ui/sidebar';
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  // Get only the location object from router state
  const location = useRouterState({ select: s => s.location });
  // Helper to check if a route is active
  const isActive = (to: string) => location.pathname === to;

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
                    children: t('titleDashboardPage'),
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                  asChild
                  isActive={isActive('/')}
                >
                  <Link to="/">
                    <Home />
                    <span>{t('titleDashboardPage')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: t('titleServicesPage'),
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                  asChild
                  isActive={isActive('/services')}
                >
                  <Link to="/services">
                    <Server />
                    <span>{t('titleServicesPage')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={{
                    children: t('titleProjectsPage'),
                    hidden: false,
                  }}
                  className="px-2.5 md:px-2"
                  asChild
                  isActive={isActive('/projects')}
                >
                  <Link to="/projects">
                    <Globe />
                    <span>{t('titleProjectsPage')}</span>
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
                  children: t('titleSettingsPage'),
                  hidden: false,
                }}
                className="px-2.5 md:px-2"
                asChild
                isActive={isActive('/settings')}
              >
                <Link to="/settings">
                  <Settings />
                  <span>{t('titleSettingsPage')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={{
                  children: t('titleAboutPage'),
                  hidden: false,
                }}
                className="px-2.5 md:px-2"
                asChild
                isActive={isActive('/about')}
              >
                <Link to="/about">
                  <Info />
                  <span>{t('titleAboutPage')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavDocker />
      </SidebarFooter>
    </Sidebar>
  );
}
