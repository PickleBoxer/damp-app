'use client';

import DampAppDashboard from '@/components/mockup/DampAppDashboard';
import DampAppServices from '@/components/mockup/DampAppServices';
import DampAppSites from '@/components/mockup/DampAppSites';
import {
  Box,
  Bug,
  Code,
  Container,
  Database,
  Globe,
  Lock,
  Package,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  return (
    <main className="relative z-[2] mx-auto max-w-[1100px] px-2 py-4 lg:py-8">
      <div
        style={{
          background:
            'repeating-linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-fd-primary) 1%, transparent) 500px, transparent 1000px)',
        }}
      >
        <div className="relative">
          {/* Hero Section */}
          <section className="bg-fd-background/80 relative z-[2] flex flex-col overflow-hidden border-x border-t px-4 pt-12 max-md:text-center md:px-12 md:pt-16">
            {/* Background Effects */}
            <div
              className="absolute inset-0 z-[-1] hidden blur-2xl dark:block"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, white, transparent)',
                background:
                  'repeating-linear-gradient(65deg, var(--color-blue-500), var(--color-blue-500) 12px, color-mix(in oklab, var(--color-blue-600) 30%, transparent) 20px, transparent 200px)',
              }}
            />
            <div
              className="absolute inset-0 z-[-1] blur-2xl dark:hidden"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, white, transparent)',
                background:
                  'repeating-linear-gradient(65deg, var(--color-purple-300), var(--color-purple-300) 12px, color-mix(in oklab, var(--color-blue-600) 30%, transparent) 20px, transparent 200px)',
              }}
            />

            <h1 className="mb-8 text-4xl font-medium md:max-w-[600px]">
              Container development.
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-5xl font-bold text-transparent dark:from-blue-400 dark:to-purple-400">
                Simplified.
              </span>
            </h1>
            <p className="text-fd-muted-foreground mb-8 md:max-w-[80%] md:text-xl">
              Damp is a Docker-based local development environment. Zero system dependencies,
              automatic SSL, and seamless devcontainer integration.
            </p>
            <div className="inline-flex items-center gap-3 max-md:mx-auto">
              <Link
                href="/docs"
                className="ring-offset-fd-background focus-visible:ring-fd-ring from-fd-primary to-fd-primary/60 text-fd-primary-foreground shadow-fd-background/20 hover:bg-fd-primary/90 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-b px-6 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Getting Started
              </Link>
              <Link
                href="/download"
                className="ring-offset-fd-background focus-visible:ring-fd-ring hover:bg-fd-accent hover:text-fd-accent-foreground bg-fd-background inline-flex h-11 items-center justify-center rounded-full border px-6 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Download
              </Link>
            </div>

            {/* Interactive Preview */}
            <PreviewSection />
          </section>

          {/* Tagline Section */}
          <section
            className="relative overflow-hidden border-x border-t px-8 py-16 sm:py-24"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, var(--color-fd-secondary), var(--color-fd-background) 40%)',
            }}
          >
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              Modern development.
              <br />
              Simplified workflow.
            </h2>
          </section>

          {/* Features Grid */}
          <section className="grid grid-cols-1 border-r md:grid-cols-2">
            <div
              className="overflow-hidden border-t border-l px-6 py-12 md:py-16"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 60% 50%, var(--color-fd-secondary), var(--color-fd-background) 80%)',
              }}
            >
              <div className="text-fd-muted-foreground mb-4 inline-flex items-center gap-2 text-sm font-medium">
                <Shield className="size-4" />
                <p>Container Architecture</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">Zero System Impact</h2>
              <p className="text-fd-muted-foreground">
                <span className="text-fd-foreground font-medium">Nothing installs globally. </span>
                <span>
                  Each project runs in isolated Docker containers, keeping your system clean and
                  conflict-free.
                </span>
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <div className="bg-fd-card rounded-xl border p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Container className="size-8 text-blue-500" />
                    <div>
                      <h3 className="text-sm font-semibold">Isolated Environments</h3>
                      <p className="text-fd-muted-foreground text-xs">
                        PHP, MySQL, Redis in containers
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-fd-card rounded-xl border p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="size-8 text-green-500" />
                    <div>
                      <h3 className="text-sm font-semibold">No Conflicts</h3>
                      <p className="text-fd-muted-foreground text-xs">
                        Multiple projects, no interference
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="from-fd-secondary/30 to-fd-background border-t border-l bg-gradient-to-b px-6 py-12 md:py-16">
              <div className="text-fd-muted-foreground mb-4 inline-flex items-center gap-2 text-sm font-medium">
                <Box className="size-4" />
                <p>Interface</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">Visual Management</h2>
              <p className="text-fd-muted-foreground">
                Beautiful desktop interface that eliminates complex command-line operations. Manage
                your entire development stack with clicks, not commands.
              </p>
              <div className="from-fd-border mt-6 rounded-lg bg-gradient-to-b p-px">
                <div className="from-fd-card to-fd-background rounded-[inherit] bg-gradient-to-b p-4">
                  <div className="space-y-2">
                    <div className="bg-fd-secondary/50 flex items-center justify-between rounded-md px-3 py-2">
                      <span className="text-sm">🚀 Start Project</span>
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                    <div className="bg-fd-secondary/30 flex items-center justify-between rounded-md px-3 py-2">
                      <span className="text-sm">⚙️ Configure Services</span>
                      <Box className="text-fd-muted-foreground size-3" />
                    </div>
                    <div className="bg-fd-secondary/30 flex items-center justify-between rounded-md px-3 py-2">
                      <span className="text-sm">📊 View Logs</span>
                      <Terminal className="text-fd-muted-foreground size-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-l px-6 py-12 md:py-16">
              <div className="text-fd-muted-foreground mb-4 inline-flex items-center gap-2 text-sm font-medium">
                <Code className="size-4" />
                <p>Development</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">DevContainer Ready</h2>
              <p className="text-fd-muted-foreground">
                Full VS Code DevContainer integration with all development tools (PHP, Node.js,
                Composer) running inside containers.
              </p>
              <Link
                href="/docs/core-features/devcontainers"
                className="ring-offset-fd-background focus-visible:ring-fd-ring hover:bg-fd-accent hover:text-fd-accent-foreground mt-4 inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Learn More
              </Link>
              <div className="bg-fd-card/50 mt-6 rounded-lg border p-4">
                <div className="text-fd-muted-foreground mb-2 flex items-center gap-2 text-xs">
                  <Code className="size-3" />
                  <span>.devcontainer/devcontainer.json</span>
                </div>
                <pre className="text-fd-muted-foreground text-xs">
                  <code className="block">
                    {`{
  "name": "DAMP PHP",
  "image": "damp-php:8.3",
  "features": {
    "composer": "latest"
  }
}`}
                  </code>
                </pre>
              </div>
            </div>

            <div className="border-t border-l px-6 py-12 md:py-16">
              <div className="text-fd-muted-foreground mb-4 inline-flex items-center gap-2 text-sm font-medium">
                <Terminal className="size-4" />
                <p>Quick Start</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">Instant Setup</h2>
              <p className="text-fd-muted-foreground">
                From zero to coding in minutes. No more hours wrestling with version conflicts,
                dependencies, and broken setups.
              </p>
              <Link
                href="/docs"
                className="ring-offset-fd-background focus-visible:ring-fd-ring hover:bg-fd-accent hover:text-fd-accent-foreground mt-4 inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                Get Started
              </Link>
              <div className="relative mt-6">
                <div className="*:border-fd-foreground/20 grid h-[120px] grid-cols-3 *:border-dashed">
                  <div className="border-r border-b"></div>
                  <div className="border-r border-b"></div>
                  <div className="border-b"></div>
                  <div className="border-t border-r"></div>
                  <div className="border-t border-r"></div>
                  <div className="border-t"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
                    ⚡ Ready in 3 min
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Highlights */}
          <section className="grid grid-cols-1 border-r md:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-full flex flex-row items-start justify-center border-t border-l p-8 pb-2 text-center">
              <h2 className="bg-fd-primary text-fd-primary-foreground px-1 text-2xl font-semibold">
                Highlights
              </h2>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-mouse-pointer mt-8 -ml-1"
                aria-hidden="true"
              >
                <path d="M12.586 12.586 19 19"></path>
                <path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z"></path>
              </svg>
            </div>
            <HighlightCard
              icon={Lock}
              title="Automatic SSL"
              description="Built-in SSL certificates for all projects. Develop with HTTPS locally without manual certificate setup."
              href="/docs/core-features/automatic-ssl"
            />
            <HighlightCard
              icon={Bug}
              title="Xdebug Ready"
              description="Xdebug works out of the box with VS Code integration. Debug your PHP code instantly."
              href="/docs/development-tools/xdebug-debugging"
            />
            <HighlightCard
              icon={Package}
              title="One-Click Laravel"
              description="Install Laravel projects instantly with pre-configured environments. Start building immediately."
            />
            <HighlightCard
              icon={Terminal}
              title="Tinker REPL"
              description="Interactive PHP shell for testing code, exploring models, and debugging Laravel applications in real-time."
              href="/docs/development-tools/tinker-repl"
            />
            <HighlightCard
              icon={Globe}
              title="Ngrok Tunneling"
              description="Share your local development with clients or test webhooks instantly with built-in ngrok integration."
              href="/docs/development-tools/ngrok-tunneling"
            />
            <HighlightCard
              icon={Database}
              title="Rich Services Library"
              description="MySQL, PostgreSQL, Redis, MongoDB, RabbitMQ, Meilisearch, MinIO, Mailpit, and more—all one-click installs."
            />
            <HighlightCard
              icon={Globe}
              title="Custom Domains"
              description="Use custom local domains for each project. Professional URLs like myapp.local instead of localhost:8000."
              href="/docs/core-features/custom-domains"
            />
            <HighlightCard
              icon={Sparkles}
              title="Claude Code CLI"
              description="Seamlessly integrate with Claude Code CLI for AI-powered development workflows and code assistance."
              href="/docs/development-tools/claude-code-cli"
            />
            <HighlightCard
              icon={Zap}
              title="Optimized Performance"
              description="Docker volumes ensure blazing-fast file operations across all platforms."
            />
          </section>

          {/* Comparison */}
          <section
            className="relative overflow-hidden border-x border-t px-8 py-16 sm:py-24"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, var(--color-fd-secondary), var(--color-fd-background) 40%)',
            }}
          >
            <h2 className="mb-4 text-center text-2xl font-semibold sm:text-3xl">
              vs. Alternatives
            </h2>
            <p className="text-fd-muted-foreground mx-auto mb-12 max-w-2xl text-center">
              See how Damp compares to other PHP development solutions
            </p>

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
              <div className="bg-fd-card hover:bg-fd-muted rounded-xl border p-6 shadow-lg transition-colors">
                <h3 className="mb-4 text-lg font-semibold">vs. Laravel Herd</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>True containerization vs binary installation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Docker learning vs vendor lock-in</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Production-ready workflow</span>
                  </div>
                </div>
              </div>

              <div className="bg-fd-card hover:bg-fd-muted rounded-xl border p-6 shadow-lg transition-colors">
                <h3 className="mb-4 text-lg font-semibold">vs. DDEV/Lando</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Visual interface vs complex CLI</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Beginner-friendly vs expert-oriented</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Desktop app vs terminal commands</span>
                  </div>
                </div>
              </div>

              <div className="bg-fd-card hover:bg-fd-muted rounded-xl border p-6 shadow-lg transition-colors">
                <h3 className="mb-4 text-lg font-semibold">vs. XAMPP/MAMP</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Isolated environments vs system pollution</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Version freedom vs conflicts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="text-fd-primary mt-0.5 size-4 shrink-0" />
                    <span>Modern workflow vs legacy tools</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="flex flex-col border-r border-b *:border-t *:border-l md:flex-row">
            <div className="group flex min-w-0 flex-1 flex-col pt-8 **:transition-colors">
              <h2 className="text-fd-muted-foreground mb-4 text-center font-mono text-3xl font-extrabold uppercase group-hover:text-blue-500 lg:text-4xl">
                Ready to Modernize PHP Development?
              </h2>
              <p className="text-fd-foreground/60 mb-8 text-center font-mono text-xs group-hover:text-blue-500/80">
                Download DAMP and leave LAMP headaches behind
              </p>
              <div className="from-fd-primary/10 h-[200px] overflow-hidden bg-gradient-to-b p-8 group-hover:from-blue-500/10">
                <div className="to-fd-primary mx-auto size-[500px] rounded-xl bg-radial-[circle_at_0%_100%] from-transparent from-60% group-hover:from-blue-500 group-hover:to-blue-600/10" />
              </div>
            </div>
            <ul className="flex flex-col gap-4 p-6 pt-8">
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Container className="size-5" />
                  Install Docker Desktop
                </span>
                <span className="text-fd-muted-foreground mt-2 text-sm">One-time setup</span>
              </li>
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Box className="size-5" />
                  Download DAMP
                </span>
                <span className="text-fd-muted-foreground mt-2 text-sm">
                  Lightweight desktop app
                </span>
              </li>
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Code className="size-5" />
                  Create Project
                </span>
                <span className="text-fd-muted-foreground mt-2 text-sm">
                  Point and click interface
                </span>
              </li>
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Terminal className="size-5" />
                  Start Coding
                </span>
                <span className="text-fd-muted-foreground mt-2 text-sm">
                  VS Code integration ready
                </span>
              </li>
              <li className="mt-auto flex flex-row flex-wrap gap-2">
                <Link
                  href="/download"
                  className="ring-offset-fd-background focus-visible:ring-fd-ring from-fd-primary to-fd-primary/60 text-fd-primary-foreground shadow-fd-background/20 hover:bg-fd-primary/90 inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-b px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  Download
                </Link>
                <Link
                  href="/docs"
                  className="ring-offset-fd-background focus-visible:ring-fd-ring hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                >
                  Read docs
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function HighlightCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly description: string;
  readonly href?: string;
}) {
  return (
    <div className="border-t border-l px-6 py-12">
      <div className="text-fd-muted-foreground mb-4 flex flex-row items-center gap-2">
        <Icon className="size-4" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <p className="mb-4 font-medium">{description}</p>
      {href && (
        <Link
          href={href}
          className="ring-offset-fd-background focus-visible:ring-fd-ring hover:bg-fd-accent hover:text-fd-accent-foreground inline-flex h-9 items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          Learn More
        </Link>
      )}
    </div>
  );
}

function PreviewSection() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sites' | 'services'>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      component: DampAppDashboard,
    },
    {
      id: 'sites' as const,
      label: 'Sites',
      component: DampAppSites,
    },
    {
      id: 'services' as const,
      label: 'Services',
      component: DampAppServices,
    },
  ];

  const getTabPosition = () => {
    if (activeTab === 'dashboard') return '0';
    if (activeTab === 'sites') return 'calc(var(--spacing) * 22)';
    return 'calc(var(--spacing) * 22 * 2)';
  };

  return (
    <div className="relative mt-12 min-w-full xl:-mx-12">
      {/* Components Container with horizontal scroll */}
      <div
        className="relative flex w-full items-center justify-start overflow-x-auto overflow-y-visible px-4 lg:justify-center lg:px-0"
        style={{
          minHeight: '600px',
          maskImage: 'linear-gradient(to top, transparent, black 100px, black)',
          WebkitMaskImage: 'linear-gradient(to top, transparent, black 100px, black)',
        }}
      >
        {tabs.map(tab => {
          const Component = tab.component;
          return (
            <div
              key={tab.id}
              className={`transition-opacity duration-500 ${
                activeTab === tab.id ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
              }`}
              style={{
                position: activeTab === tab.id ? 'relative' : 'absolute',
              }}
            >
              {/* Fixed size wrapper - no scaling */}
              <div className="h-[600px] w-[790px] overflow-hidden rounded-lg border shadow-2xl">
                <Component />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Buttons */}
      <div className="bg-fd-card dark:shadow-fd-background absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-row rounded-full border p-1 shadow-xl">
        <div
          role="none"
          className="bg-fd-primary absolute z-[-1] h-9 w-22 rounded-full transition-transform duration-300"
          style={{
            transform: `translateX(${getTabPosition()})`,
          }}
        />
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-9 w-22 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'text-fd-primary-foreground' : 'text-fd-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
