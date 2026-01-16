import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Box,
  Globe,
  Home,
  Server,
  Settings,
  Square,
  ArrowRight,
  ArrowLeft,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Marquee3D } from '@/components/ui/marquee-3d';
import {
  SiRedis,
  SiSqlite,
  SiMysql,
  SiCaddy,
  SiPostgresql,
  SiMongodb,
  SiMeilisearch,
  SiMinio,
  SiRabbitmq,
} from 'react-icons/si';
import { Button } from '@/components/ui/button';

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

const allServices = [
  {
    id: 'caddy',
    icon: SiCaddy,
    display_name: 'Web Server',
    description: 'Caddy reverse proxy',
    color: '#0f7c8e',
  },
  {
    id: 'mysql',
    icon: SiMysql,
    display_name: 'MySQL Database',
    description: 'MySQL database server',
    color: '#4479a1',
  },
  {
    id: 'postgres',
    icon: SiPostgresql,
    display_name: 'PostgreSQL Database',
    description: 'PostgreSQL database server',
    color: '#336791',
  },
  {
    id: 'mariadb',
    icon: SiPostgresql,
    display_name: 'MariaDB Database',
    description: 'MariaDB database server',
    color: '#003545',
  },
  {
    id: 'mongodb',
    icon: SiMongodb,
    display_name: 'MongoDB Database',
    description: 'MongoDB document database',
    color: '#47a248',
  },
  {
    id: 'sqlite',
    icon: SiSqlite,
    display_name: 'SQLite',
    description: 'Lightweight, file-based relational database engine.',
  },
  {
    id: 'redis',
    icon: SiRedis,
    display_name: 'Redis Cache',
    description: 'Redis key-value store for caching and sessions',
    color: '#dc382d',
  },
  {
    id: 'meilisearch',
    icon: SiMeilisearch,
    display_name: 'Meilisearch',
    description: 'Meilisearch full-text search engine',
    color: '#ff5a5f',
  },
  {
    id: 'minio',
    icon: SiMinio,
    display_name: 'MinIO Storage',
    description: 'MinIO S3-compatible object storage',
    color: '#c72e2f',
  },
  {
    id: 'rabbitmq',
    icon: SiRabbitmq,
    display_name: 'RabbitMQ',
    description: 'RabbitMQ message broker for queues and messaging',
    color: '#ff6600',
  },
];

export default function DampAppDashboard() {
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
                    item.label === 'Dashboard'
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
          <div className="h-full w-full">
            <div className="space-y-4 p-6">
              {/* Feature Highlight Banner */}
              <div className="relative flex h-30 w-full flex-col items-center justify-center overflow-hidden bg-linear-65 from-orange-400 via-purple-600 to-blue-500">
                <Marquee3D className="pl-130" pauseOnHover>
                  {allServices.map(service => (
                    <Card
                      key={service.id}
                      className="w-64 rounded-none border-white/30 bg-white/20 py-0 text-white opacity-90 backdrop-blur-sm"
                    >
                      <CardHeader className="flex flex-row items-center gap-4 p-4">
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center self-start rounded-lg">
                          <service.icon
                            className="h-4 w-4"
                            style={service.color ? { color: service.color } : undefined}
                          />
                        </div>
                        <div className="flex flex-1 flex-col justify-center">
                          <CardTitle className="text-base font-semibold text-white drop-shadow-lg">
                            {service.display_name}
                          </CardTitle>
                          <CardDescription className="text-xs text-white drop-shadow-md">
                            {service.description}
                          </CardDescription>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </Marquee3D>

                <div className="absolute bottom-4 left-4 z-10">
                  <h2 className="text-lg font-bold text-white drop-shadow-lg">Local services</h2>
                  <p className="mb-2 text-sm text-white drop-shadow-md">
                    Run local databases and dev tools instantly.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-none bg-white/20 text-white hover:bg-white/30"
                    >
                      Browse services
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-none text-white hover:bg-white/30 hover:text-white dark:hover:bg-white/30"
                      size="sm"
                    >
                      Learn more
                    </Button>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="flex gap-4">
                {/* Services Cards */}
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center border p-4">
                    <p className="text-center text-sm font-medium">Installed Services</p>
                    <p className="text-2xl font-bold">2</p>
                  </div>
                  <div className="group/services relative flex flex-col">
                    <div className="flex h-full flex-col items-center justify-center border p-4">
                      <p className="text-center text-sm font-medium">Running Services</p>
                      <p className="text-2xl font-bold">2</p>
                    </div>
                  </div>
                </div>

                {/* Projects Column */}
                <div className="flex flex-1 items-center justify-between border p-4">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-sm font-medium">Projects Status</p>
                      <p className="text-muted-foreground text-xs">Local projects overview</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col items-center justify-center gap-1 rounded-none p-3 dark:bg-[#090909]">
                      <span className="text-2xl font-bold text-yellow-500">4</span>
                      <span className="text-accent-foreground text-xs">Created</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 rounded-none p-3 dark:bg-[#090909]">
                      <span className="text-2xl font-bold text-green-500">1</span>
                      <span className="text-accent-foreground text-xs">Running</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Carousel Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Your Local Services</h2>
                    <p className="text-muted-foreground text-sm">
                      Quickly view and manage installed services.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled
                      className="h-10 w-10 rounded-none"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-none">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Carousel
                  opts={{
                    align: 'start',
                    containScroll: 'trimSnaps',
                    skipSnaps: false,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2">
                    <CarouselItem className="basis-1/2 pl-2">
                      <Card
                        data-size="sm"
                        className="group/card flex-co flex h-full w-full gap-3 rounded-none py-3 dark:bg-[#090909]"
                      >
                        {/* Card Header with border-bottom */}
                        <CardHeader className="@container/card-header flex-1 border-b px-3 group-data-[size=sm]/card:[.border-b]:pb-3">
                          <div className="flex items-start justify-between gap-3">
                            {/* Icon and Title Section */}
                            <div className="flex flex-1 items-start gap-3">
                              <SiCaddy
                                className="mt-0.5 h-5 w-5"
                                style={{ color: 'rgb(15, 124, 142)' }}
                              />
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <CardTitle className="text-sm leading-none font-semibold">
                                    Web Server
                                  </CardTitle>
                                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                </div>
                                <CardDescription className="text-xs leading-snug">
                                  Caddy reverse proxy server for local development
                                </CardDescription>
                              </div>
                            </div>

                            {/* Status Indicator (top-right) */}
                            <div className="flex shrink-0 items-center gap-1.5"></div>
                          </div>
                        </CardHeader>

                        {/* Card Content */}
                        <CardContent className="flex flex-col gap-3 px-4">
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" className="flex-1 rounded-none">
                              <Square className="text-destructive mr-1.5 h-3.5 w-3.5" />
                              Stop
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-none px-2">
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                    <CarouselItem className="basis-1/2 pl-2">
                      <Card
                        data-size="sm"
                        className="group/card flex-co flex h-full w-full gap-3 rounded-none py-3 dark:bg-[#090909]"
                      >
                        {/* Card Header with border-bottom */}
                        <CardHeader className="@container/card-header flex-1 border-b px-3 group-data-[size=sm]/card:[.border-b]:pb-3">
                          <div className="flex items-start justify-between gap-3">
                            {/* Icon and Title Section */}
                            <div className="flex flex-1 items-start gap-3">
                              <SiMysql
                                className="mt-0.5 h-5 w-5"
                                style={{ color: 'rgb(68, 121, 161)' }}
                              />
                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <CardTitle className="text-sm leading-none font-semibold">
                                    MySQL Database
                                  </CardTitle>
                                </div>
                                <CardDescription className="text-xs leading-snug">
                                  MySQL database server
                                </CardDescription>
                              </div>
                            </div>

                            {/* Status Indicator (top-right) */}
                            <div className="flex shrink-0 items-center gap-1.5"></div>
                          </div>
                        </CardHeader>

                        {/* Card Content */}
                        <CardContent className="flex flex-col gap-3 px-4">
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" className="flex-1 rounded-none">
                              <Square className="text-destructive mr-1.5 h-3.5 w-3.5" />
                              Stop
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-none px-2">
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  </CarouselContent>
                </Carousel>
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* <Footer /> */}
    </div>
  );
}
