'use client';

import Link from "next/link";
import { Box, Shield, Code, Terminal, Container, Lock, Bug, Package, Globe, Database, Zap, Sparkles } from "lucide-react";
import { useState } from "react";
import DampAppDashboard from "@/components/mockup/DampAppDashboard";
import DampAppServices from "@/components/mockup/DampAppServices";
import DampAppSites from "@/components/mockup/DampAppSites";

export default function HomePage() {
  return (
    <main className="container relative max-w-[1100px] px-2 py-4 z-[2] lg:py-8">
      <div style={{
        background: 'repeating-linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-fd-primary) 1%, transparent) 500px, transparent 1000px)'
      }}>
        <div className="relative">
          {/* Hero Section */}
          <section className="relative z-[2] flex flex-col border-x border-t bg-fd-background/80 px-4 pt-12 max-md:text-center md:px-12 md:pt-16 overflow-hidden">
            {/* Background Effects */}
            <div 
              className="absolute inset-0 z-[-1] blur-2xl hidden dark:block"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, white, transparent)',
                background: 'repeating-linear-gradient(65deg, var(--color-blue-500), var(--color-blue-500) 12px, color-mix(in oklab, var(--color-blue-600) 30%, transparent) 20px, transparent 200px)'
              }}
            />
            <div 
              className="absolute inset-0 z-[-1] blur-2xl dark:hidden"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent, white, transparent)',
                background: 'repeating-linear-gradient(65deg, var(--color-purple-300), var(--color-purple-300) 12px, color-mix(in oklab, var(--color-blue-600) 30%, transparent) 20px, transparent 200px)'
              }}
            />
            
            <h1 className="mb-8 text-4xl font-medium md:max-w-[600px]">
              Container development.
              <br />
              <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                Simplified.
              </span>
            </h1>
            <p className="mb-8 text-fd-muted-foreground md:max-w-[80%] md:text-xl">
              Damp is a Docker-based local development environment. Zero system dependencies, automatic SSL, and seamless devcontainer integration.
            </p>
            <div className="inline-flex items-center gap-3 max-md:mx-auto">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center text-sm font-medium ring-offset-fd-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-b from-fd-primary to-fd-primary/60 text-fd-primary-foreground shadow-fd-background/20 hover:bg-fd-primary/90 h-11 px-6 rounded-full"
              >
                Getting Started
              </Link>
              <Link
                href="/download"
                className="inline-flex items-center justify-center text-sm font-medium ring-offset-fd-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 border hover:bg-fd-accent hover:text-fd-accent-foreground h-11 px-6 rounded-full bg-fd-background"
              >
                Download
              </Link>
            </div>

            {/* Interactive Preview */}
            <PreviewSection />
          </section>

          {/* Tagline Section */}
          <section className="relative overflow-hidden border-x border-t px-8 py-16 sm:py-24" style={{
            backgroundImage: 'radial-gradient(circle at center, var(--color-fd-secondary), var(--color-fd-background) 40%)'
          }}>
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              Modern development.<br />Simplified workflow.
            </h2>
          </section>

          {/* Features Grid */}
          <section className="grid grid-cols-1 border-r md:grid-cols-2">
            <div className="border-l border-t px-6 py-12 md:py-16 overflow-hidden" style={{
              backgroundImage: 'radial-gradient(circle at 60% 50%, var(--color-fd-secondary), var(--color-fd-background) 80%)'
            }}>
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-fd-muted-foreground">
                <Shield className="size-4" />
                <p>Container Architecture</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">Zero System Impact</h2>
              <p className="text-fd-muted-foreground">
                <span className="font-medium text-fd-foreground">Nothing installs globally. </span>
                <span>Each project runs in isolated Docker containers, keeping your system clean and conflict-free.</span>
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <div className="rounded-xl border bg-fd-card p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Container className="size-8 text-blue-500" />
                    <div>
                      <h3 className="text-sm font-semibold">Isolated Environments</h3>
                      <p className="text-xs text-fd-muted-foreground">PHP, MySQL, Redis in containers</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border bg-fd-card p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="size-8 text-green-500" />
                    <div>
                      <h3 className="text-sm font-semibold">No Conflicts</h3>
                      <p className="text-xs text-fd-muted-foreground">Multiple projects, no interference</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-l border-t px-6 py-12 md:py-16 bg-gradient-to-b from-fd-secondary/30 to-fd-background">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-fd-muted-foreground">
                <Box className="size-4" />
                <p>Interface</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">Visual Management</h2>
              <p className="text-fd-muted-foreground">
                Beautiful desktop interface that eliminates complex command-line operations. Manage your entire development stack with clicks, not commands.
              </p>
              <div className="mt-6 rounded-lg bg-gradient-to-b from-fd-border p-px">
                <div className="rounded-[inherit] bg-gradient-to-b from-fd-card to-fd-background p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-md bg-fd-secondary/50 px-3 py-2">
                      <span className="text-sm">🚀 Start Project</span>
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-fd-secondary/30 px-3 py-2">
                      <span className="text-sm">⚙️ Configure Services</span>
                      <Box className="size-3 text-fd-muted-foreground" />
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-fd-secondary/30 px-3 py-2">
                      <span className="text-sm">📊 View Logs</span>
                      <Terminal className="size-3 text-fd-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-l border-t px-6 py-12 md:py-16">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-fd-muted-foreground">
                <Code className="size-4" />
                <p>Development</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">DevContainer Ready</h2>
              <p className="text-fd-muted-foreground">
                Full VS Code DevContainer integration with all development tools (PHP, Node.js, Composer) running inside containers.
              </p>
              <Link
                href="/docs/core-features/devcontainers"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-fd-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 border hover:bg-fd-accent hover:text-fd-accent-foreground h-10 px-4 py-2 mt-4"
              >
                Learn More
              </Link>
              <div className="mt-6 rounded-lg border bg-fd-card/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-fd-muted-foreground">
                  <Code className="size-3" />
                  <span>.devcontainer/devcontainer.json</span>
                </div>
                <pre className="text-xs text-fd-muted-foreground">
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

            <div className="border-l border-t px-6 py-12 md:py-16">
              <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-fd-muted-foreground">
                <Terminal className="size-4" />
                <p>Quick Start</p>
              </div>
              <h2 className="mb-2 text-lg font-semibold">Instant Setup</h2>
              <p className="text-fd-muted-foreground">
                From zero to coding in minutes. No more hours wrestling with version conflicts, dependencies, and broken setups.
              </p>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-fd-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 border hover:bg-fd-accent hover:text-fd-accent-foreground h-10 px-4 py-2 mt-4"
              >
                Get Started
              </Link>
              <div className="relative mt-6">
                <div className="grid grid-cols-3 h-[120px] *:border-fd-foreground/20 *:border-dashed">
                  <div className="border-r border-b"></div>
                  <div className="border-r border-b"></div>
                  <div className="border-b"></div>
                  <div className="border-r border-t"></div>
                  <div className="border-r border-t"></div>
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
            <div className="col-span-full flex flex-row items-start justify-center border-l border-t p-8 pb-2 text-center">
              <h2 className="bg-fd-primary text-fd-primary-foreground px-1 text-2xl font-semibold">Highlights</h2>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mouse-pointer -ml-1 mt-8" aria-hidden="true">
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
          <section className="relative overflow-hidden border-x border-t px-8 py-16 sm:py-24" style={{
            backgroundImage: 'radial-gradient(circle at center, var(--color-fd-secondary), var(--color-fd-background) 40%)'
          }}>
            <h2 className="text-center text-2xl font-semibold sm:text-3xl mb-4">
              vs. Alternatives
            </h2>
            <p className="text-center text-fd-muted-foreground mb-12 max-w-2xl mx-auto">
              See how Damp compares to other PHP development solutions
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <div className="rounded-xl border bg-fd-card p-6 shadow-lg transition-colors hover:bg-fd-muted">
                <h3 className="text-lg font-semibold mb-4">vs. Laravel Herd</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>True containerization vs binary installation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Docker learning vs vendor lock-in</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Production-ready workflow</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-fd-card p-6 shadow-lg transition-colors hover:bg-fd-muted">
                <h3 className="text-lg font-semibold mb-4">vs. DDEV/Lando</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Visual interface vs complex CLI</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Beginner-friendly vs expert-oriented</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Desktop app vs terminal commands</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-fd-card p-6 shadow-lg transition-colors hover:bg-fd-muted">
                <h3 className="text-lg font-semibold mb-4">vs. XAMPP/MAMP</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Isolated environments vs system pollution</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Version freedom vs conflicts</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="size-4 text-fd-primary mt-0.5 shrink-0" />
                    <span>Modern workflow vs legacy tools</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <section className="flex flex-col border-b border-r md:flex-row *:border-l *:border-t">
            <div className="group flex flex-col min-w-0 flex-1 pt-8 **:transition-colors">
              <h2 className="text-3xl text-center font-extrabold font-mono uppercase text-fd-muted-foreground mb-4 lg:text-4xl group-hover:text-blue-500">
                Ready to Modernize PHP Development?
              </h2>
              <p className="text-center font-mono text-xs text-fd-foreground/60 mb-8 group-hover:text-blue-500/80">
                Download DAMP and leave LAMP headaches behind
              </p>
              <div className="h-[200px] overflow-hidden p-8 bg-gradient-to-b from-fd-primary/10 group-hover:from-blue-500/10">
                <div className="mx-auto bg-radial-[circle_at_0%_100%] from-60% from-transparent to-fd-primary size-[500px] rounded-xl group-hover:from-blue-500 group-hover:to-blue-600/10" />
              </div>
            </div>
            <ul className="flex flex-col gap-4 p-6 pt-8">
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Container className="size-5" />
                  Install Docker Desktop
                </span>
                <span className="mt-2 text-sm text-fd-muted-foreground">
                  One-time setup
                </span>
              </li>
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Box className="size-5" />
                  Download DAMP
                </span>
                <span className="mt-2 text-sm text-fd-muted-foreground">
                  Lightweight desktop app
                </span>
              </li>
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Code className="size-5" />
                  Create Project
                </span>
                <span className="mt-2 text-sm text-fd-muted-foreground">
                  Point and click interface
                </span>
              </li>
              <li>
                <span className="flex flex-row items-center gap-2 font-medium">
                  <Terminal className="size-5" />
                  Start Coding
                </span>
                <span className="mt-2 text-sm text-fd-muted-foreground">
                  VS Code integration ready
                </span>
              </li>
              <li className="flex flex-row flex-wrap gap-2 mt-auto">
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-fd-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-b from-fd-primary to-fd-primary/60 text-fd-primary-foreground shadow-fd-background/20 hover:bg-fd-primary/90 h-10 px-4 py-2"
                >
                  Download
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-fd-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 border hover:bg-fd-accent hover:text-fd-accent-foreground h-10 px-4 py-2"
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
    <div className="border-l border-t px-6 py-12">
      <div className="mb-4 flex flex-row items-center gap-2 text-fd-muted-foreground">
        <Icon className="size-4" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <p className="font-medium mb-4">{description}</p>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-fd-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring disabled:pointer-events-none disabled:opacity-50 border hover:bg-fd-accent hover:text-fd-accent-foreground h-9 px-3 py-2"
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
      component: DampAppDashboard
    },
    { 
      id: 'sites' as const, 
      label: 'Sites', 
      component: DampAppSites
    },
    { 
      id: 'services' as const, 
      label: 'Services', 
      component: DampAppServices
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
        className="relative w-full overflow-x-auto overflow-y-visible flex items-center justify-start lg:justify-center px-4 lg:px-0" 
        style={{ 
          minHeight: '600px',
          maskImage: 'linear-gradient(to top, transparent, black 100px, black)',
          WebkitMaskImage: 'linear-gradient(to top, transparent, black 100px, black)',
        }}
      >
        {tabs.map((tab) => {
          const Component = tab.component;
          return (
            <div
              key={tab.id}
              className={`transition-opacity duration-500 ${
                activeTab === tab.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              style={{
                position: activeTab === tab.id ? 'relative' : 'absolute',
              }}
            >
              {/* Fixed size wrapper - no scaling */}
              <div 
                className="border rounded-lg overflow-hidden shadow-2xl w-[790px] h-[600px]"
              >
                <Component />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Buttons */}
      <div className="absolute left-1/2 bottom-4 z-20 flex -translate-x-1/2 flex-row rounded-full border bg-fd-card p-1 shadow-xl dark:shadow-fd-background">
        <div
          role="none"
          className="absolute z-[-1] h-9 w-22 rounded-full bg-fd-primary transition-transform duration-300"
          style={{
            transform: `translateX(${getTabPosition()})`,
          }}
        />
        {tabs.map((tab) => (
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
