import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Box,
  CheckCircle2,
  Container,
  Copy,
  Globe,
  Home,
  MonitorSmartphone,
  Plus,
  Search,
  Server,
} from 'lucide-react';
import { HiOutlineStatusOnline } from 'react-icons/hi';
import {
  SiCaddy,
  SiMariadb,
  SiMeilisearch,
  SiMinio,
  SiMongodb,
  SiMysql,
  SiPostgresql,
  SiRabbitmq,
  SiRedis,
} from 'react-icons/si';

const allServices = [
  {
    icon: SiCaddy,
    name: 'Web Server',
    description: 'Caddy reverse proxy',
    status: 'active',
    color: '#0f7c8e',
  },
  {
    icon: SiMysql,
    name: 'MySQL Database',
    description: 'MySQL database server',
    status: 'active',
    selected: true,
    color: '#4479a1',
  },
  {
    icon: SiPostgresql,
    name: 'PostgreSQL Database',
    description: 'PostgreSQL database server',
    status: 'inactive',
    color: '#336791',
  },
  {
    icon: SiMariadb,
    name: 'MariaDB Database',
    description: 'MariaDB database server',
    status: 'inactive',
    color: '#003545',
  },
  {
    icon: SiMongodb,
    name: 'MongoDB Database',
    description: 'MongoDB document database',
    status: 'inactive',
    color: '#47a248',
  },
  {
    icon: SiRedis,
    name: 'Redis Cache',
    description: 'Redis key-value store for caching and sessions',
    status: 'inactive',
    color: '#dc382d',
  },
  {
    icon: SiMeilisearch,
    name: 'Meilisearch',
    description: 'Meilisearch full-text search engine',
    status: 'inactive',
    color: '#ff5a5f',
  },
  {
    icon: SiMinio,
    name: 'MinIO Storage',
    description: 'MinIO S3-compatible object storage',
    status: 'inactive',
    color: '#c72e2f',
  },
  {
    icon: SiRabbitmq,
    name: 'RabbitMQ',
    description: 'RabbitMQ message broker for queues and messaging',
    status: 'inactive',
    color: '#ff6600',
  },
];

const navItems = [
  {
    to: '/',
    icon: Home,
    label: 'Dashboard',
  },
  {
    to: '/services',
    icon: Server,
    label: 'Services',
  },
  {
    to: '/projects',
    icon: Globe,
    label: 'Projects',
  },
];

export default function DampAppServices() {
  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="bg-background relative h-[35px] w-full shrink-0 border-b dark:bg-black">
        {/* Draggable layer for empty spaces */}
        <div className="absolute inset-0" />

        <div className="relative z-10 flex h-full items-center justify-center">
          {/* Left section - App icon (draggable) */}
          <div className="bg-primary text-primary-foreground absolute left-0 ml-2 flex aspect-square items-center justify-center rounded-[5px] p-1">
            <Box className="h-4 w-4" />
          </div>

          {/* Center section - Search on Windows/Linux, Title on macOS */}
          <div>
            {/* Search trigger button in title bar */}
            <button className="bg-primary/5 border-border hover:bg-muted hover:border-ring/20 relative flex h-6.5 w-[320px] items-center justify-center gap-2 border px-3 font-mono text-sm transition-all duration-100">
              <Search className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs">DAMP</span>
              <div className="absolute right-3 flex items-center gap-0.5">
                <kbd
                  data-slot="kbd"
                  className="text-muted-foreground [[data-slot=tooltip-content]_&amp;]:bg-black/20 [[data-slot=tooltip-content]_&amp;]:text-background dark:[[data-slot=tooltip-content]_&amp;]:bg-black/10 [&amp;_svg:not([class*='size-'])]:size-3 bg-background pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-xs px-1 font-sans text-[0.625rem] font-medium select-none dark:bg-black"
                >
                  Ctrl
                </kbd>
                <kbd
                  data-slot="kbd"
                  className="text-muted-foreground [[data-slot=tooltip-content]_&amp;]:bg-black/20 [[data-slot=tooltip-content]_&amp;]:text-background dark:[[data-slot=tooltip-content]_&amp;]:bg-black/10 [&amp;_svg:not([class*='size-'])]:size-3 bg-background pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-xs px-1 font-sans text-[0.625rem] font-medium select-none dark:bg-black"
                >
                  P
                </kbd>
              </div>
            </button>
          </div>

          {/* Right section - Window controls (Windows/Linux only) */}
          <div className="absolute right-0">
            <div className="ml-auto flex">
              <button
                type="button"
                className="flex h-[34px] w-[46px] items-center justify-center transition-colors hover:bg-white/10 dark:hover:bg-white/10"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect fill="currentColor" width="10" height="1" y="5" />
                </svg>
              </button>
              <button
                type="button"
                className="flex h-[34px] w-[46px] items-center justify-center transition-colors hover:bg-white/10 dark:hover:bg-white/10"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <rect width="9" height="9" x="0.5" y="0.5" fill="none" stroke="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                className="flex h-[34px] w-[46px] items-center justify-center transition-colors hover:bg-[#E81123] hover:text-white"
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path
                    fill="currentColor"
                    d="M 0.7,0 L 10,9.3 M 10,0.7 L 0.7,10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        <nav className="bg-background flex h-full w-[35px] flex-col items-center border-r dark:bg-black">
          {/* Navigation Items */}
          <div className="flex flex-1 flex-col">
            {navItems.map(item => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className={`hover:text-foreground flex h-[35px] w-[35px] items-center justify-center transition-colors ${
                    item.label === 'Services'
                      ? 'text-foreground border-foreground border-r-2'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  <span className="sr-only">{item.label}</span>
                </div>
              );
            })}
          </div>
        </nav>
        <main className="bg-background relative flex flex-1 flex-col dark:bg-black">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left side - Services List */}
            <ResizablePanel defaultSize={40}>
              <div className="flex h-full flex-col">
                {/* Header Bar */}
                <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
                  <h2 className="text-sm font-semibold tracking-wide">Services</h2>
                  <Button size="sm" variant="outline" className="h-7 rounded-none">
                    Type: All
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-0 flex-1 [&_[data-radix-scroll-area-viewport]>:first-child]:block!">
                  <div className="flex w-full flex-1 flex-col">
                    {allServices.map((service, index) => {
                      const ServiceIcon = service.icon;
                      const isActive = service.status === 'active';
                      const isSelected = service.selected;
                      return (
                        <div
                          key={index}
                          className={`group/services relative ${isSelected ? 'bg-primary/5' : 'hover:bg-primary/5'} ${!isActive ? 'opacity-50' : ''}`}
                        >
                          <div className="transition-all duration-200">
                            <div className="hover:bg-primary/5 flex w-full cursor-pointer items-center gap-4 p-3 text-left transition-colors duration-200">
                              <div className="flex w-full flex-1 items-center gap-3">
                                <ServiceIcon
                                  className="h-8 w-8"
                                  style={service.color ? { color: service.color } : undefined}
                                />
                                <div className="w-full truncate">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-semibold">
                                      {service.name}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <HiOutlineStatusOnline
                                        className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-emerald-500' : 'text-muted-foreground/40'}`}
                                      />
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <span className="truncate">{service.description}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Right side - Services Detail */}
            <ResizablePanel defaultSize={60}>
              <div className="h-full overflow-hidden">
                {/* Right Side - service Detail */}
                <div className="flex h-full flex-col">
                  {/* Service Header */}
                  <div className="bg-background border-border border-b px-4 py-4 dark:bg-black">
                    <div className="flex items-center gap-3">
                      <SiMysql className="h-9 w-9" style={{ color: '#4479a1' }} />
                      <div className="min-w-0 flex-1">
                        <h1 className="text-foreground text-md font-semibold">MySQL Database</h1>
                        <p className="text-muted-foreground text-xs">MySQL database server</p>
                      </div>
                    </div>
                  </div>

                  {/* Service Info Card */}
                  <div className="bg-muted/30 dark:bg-muted/10 border-border border-b px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      {/* Status Section */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400`}
                          />
                          <span className="text-foreground text-sm font-medium">Running</span>
                        </div>

                        {/* Port Info */}

                        <div className="bg-border h-4 w-px" />
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-xs">Port:</span>
                          <span className="text-foreground font-mono text-xs font-medium">
                            3306
                          </span>
                        </div>
                      </div>

                      {/* Health Badge */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            Healthy
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="h-0 flex-1">
                    <div className="flex-1 space-y-4">
                      {/* Connection Information */}
                      <div className="p-4">
                        <Card className="mx-auto w-full gap-3 rounded-none py-3 dark:bg-[#090909]">
                          <CardContent className="px-3">
                            <Tabs defaultValue="devcontainer" className="w-full">
                              <TabsList className="w-full rounded-none">
                                <TabsTrigger
                                  value="devcontainer"
                                  className="flex-1 rounded-none dark:data-[state=active]:bg-black"
                                >
                                  <Container className="mr-2 h-4 w-4" />
                                  Inside Devcontainer
                                </TabsTrigger>
                                <TabsTrigger
                                  value="local"
                                  className="flex-1 rounded-none dark:data-[state=active]:bg-black"
                                >
                                  <MonitorSmartphone className="mr-2 h-4 w-4" />
                                  Local Machine
                                </TabsTrigger>
                              </TabsList>

                              {/* Inside Devcontainer Tab */}
                              <TabsContent value="devcontainer" className="mt-4 space-y-4">
                                <Item variant="default" size="sm">
                                  <ItemContent>
                                    <ItemTitle>Docker Network Connection</ItemTitle>
                                    <p className="text-muted-foreground text-xs">
                                      Use this connection when connecting from within your
                                      devcontainer
                                    </p>
                                  </ItemContent>
                                </Item>

                                <Separator />

                                <div className="space-y-2 px-1.5">
                                  <p className="text-muted-foreground text-xs font-medium">
                                    Connection String
                                  </p>
                                  <div className="bg-background border-border flex items-center justify-between overflow-hidden border dark:bg-black">
                                    <code className="text-foreground flex-1 truncate p-2 font-mono text-xs outline-none select-text">
                                      adoring_proskuriakova:3306
                                    </code>
                                    <div className="px-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2 px-1.5">
                                  <p className="text-muted-foreground text-xs font-medium">
                                    Environment Configuration
                                  </p>
                                  <div className="bg-background border-border relative overflow-hidden border">
                                    <div className="absolute top-2 right-2 z-10">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <pre className="text-foreground flex-1 p-2 pr-12 font-mono text-xs leading-relaxed whitespace-pre-wrap outline-none select-text dark:bg-black">
                                      DB_CONNECTION=mysql <br />
                                      DB_HOST=adoring_proskuriakova <br />
                                      DB_PORT=3306 <br />
                                      DB_DATABASE=development <br />
                                      DB_USERNAME=developer <br />
                                      DB_PASSWORD=devpassword
                                    </pre>
                                  </div>
                                </div>

                                <Separator />

                                <div className="bg-primary/5 space-y-1 p-3 text-xs">
                                  <p className="text-muted-foreground">
                                    <strong className="text-foreground">
                                      Inside Devcontainer:
                                    </strong>{' '}
                                    Services communicate via Docker&apos;s internal network using
                                    container names. This is the recommended way to connect from
                                    your application running in a devcontainer.
                                  </p>
                                </div>
                              </TabsContent>

                              {/* Local Machine Tab */}
                              <TabsContent value="local" className="mt-4 space-y-4">
                                <Item variant="default" size="sm">
                                  <ItemContent>
                                    <ItemTitle>Local Machine Connection</ItemTitle>
                                    <p className="text-muted-foreground text-xs">
                                      Use this connection when developing directly on your host
                                      machine
                                    </p>
                                  </ItemContent>
                                </Item>

                                <Separator />

                                <div className="space-y-2 px-1.5">
                                  <p className="text-muted-foreground text-xs font-medium">
                                    Connection String
                                  </p>
                                  <div className="bg-background border-border flex items-center justify-between overflow-hidden border dark:bg-black">
                                    <code className="text-foreground flex-1 truncate p-2 font-mono text-xs outline-none select-text">
                                      localhost:3306
                                    </code>
                                    <div className="px-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2 px-1.5">
                                  <p className="text-muted-foreground text-xs font-medium">
                                    Environment Configuration
                                  </p>
                                  <div className="bg-background border-border relative overflow-hidden border dark:bg-black">
                                    <div className="absolute top-2 right-2 z-10">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <pre className="text-foreground flex-1 p-2 pr-12 font-mono text-xs leading-relaxed whitespace-pre-wrap outline-none select-text dark:bg-black">
                                      DB_CONNECTION=mysql <br />
                                      DB_HOST=localhost <br />
                                      DB_PORT=3306 <br />
                                      DB_DATABASE=development <br />
                                      DB_USERNAME=developer <br />
                                      DB_PASSWORD=devpassword
                                    </pre>
                                  </div>
                                </div>

                                <Separator />

                                <div className="bg-primary/5 space-y-1 p-3 text-xs">
                                  <p className="text-muted-foreground">
                                    <strong className="text-foreground">Local Machine:</strong>{' '}
                                    Services are exposed on localhost through port mapping. Use this
                                    when running your application directly on your host machine
                                    outside of a container.
                                  </p>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="h-8.5 flex-1" size="lg">
                        Stop
                      </Button>
                      <Button size="lg" className="h-8.5">
                        Restart
                      </Button>
                      <Button size="lg" variant="destructive" className="h-8.5">
                        Uninstall
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
      {/* <Footer /> */}
    </div>
  );
}
