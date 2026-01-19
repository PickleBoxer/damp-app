import { changelogSource } from '@/lib/source';
import { formatDate } from '@/lib/utils';
import { getMDXComponents } from '@/mdx-components';

export const metadata = {
  title: 'Changelog - DAMP',
  description: 'Latest updates and improvements to DAMP',
};

interface ChangelogData {
  date: string;
  version?: string;
  tags?: string[];
}

export default function ChangelogPage() {
  const allPages = changelogSource.getPages();

  // Sort by date (newest first)
  const sortedChangelogs = [...allPages].sort((a, b) => {
    const dateA = new Date((a.data as ChangelogData).date).getTime();
    const dateB = new Date((b.data as ChangelogData).date).getTime();
    return dateB - dateA;
  });

  return (
    <main className="bg-fd-background relative min-h-screen">
      {/* Header */}
      <div className="border-fd-border/50 border-b">
        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-center justify-between p-6">
            <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mx-auto max-w-5xl px-6 pt-10 lg:px-10">
        <div className="relative">
          {sortedChangelogs.map(page => {
            const MDXContent = page.data.body;
            const data = page.data as ChangelogData;
            const date = new Date(data.date);
            const formattedDate = formatDate(date);
            const version = data.version;
            const tags = data.tags;

            return (
              <div key={page.url} className="relative">
                <div className="flex flex-col gap-y-6 md:flex-row">
                  {/* Left side - Date and Version */}
                  <div className="flex-shrink-0 md:w-48">
                    <div className="pb-10 md:sticky md:top-8">
                      <time className="text-fd-muted-foreground mb-3 block text-sm font-medium">
                        {formattedDate}
                      </time>

                      {version && (
                        <div className="text-fd-foreground border-fd-border relative z-10 inline-flex h-10 w-15 items-center justify-center rounded-lg border text-sm font-bold">
                          {version}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Content */}
                  <div className="relative flex-1 pb-10 md:pl-8">
                    {/* Vertical timeline line */}
                    <div className="bg-fd-border absolute top-2 left-0 hidden h-full w-px md:block">
                      {/* Timeline dot */}
                      <div className="bg-fd-primary absolute z-10 hidden size-3 -translate-x-1/2 rounded-full md:block" />
                    </div>

                    <div className="space-y-6">
                      <div className="relative z-10 flex flex-col gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-balance">
                          {page.data.title}
                        </h2>

                        {/* Tags */}
                        {tags && tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="bg-fd-muted text-fd-muted-foreground border-fd-border flex h-6 w-fit items-center justify-center rounded-full border px-2 text-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="prose dark:prose-invert prose-headings:scroll-mt-8 prose-headings:font-semibold prose-a:no-underline prose-headings:tracking-tight prose-headings:text-balance prose-p:tracking-tight prose-p:text-balance max-w-none">
                        <MDXContent components={getMDXComponents()} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
