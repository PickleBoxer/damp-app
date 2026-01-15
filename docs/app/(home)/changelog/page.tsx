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
    <main className="min-h-screen bg-fd-background relative">
      {/* Header */}
      <div className="border-b border-fd-border/50">
        <div className="max-w-5xl mx-auto relative">
          <div className="p-6 flex items-center justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-10">
        <div className="relative">
          {sortedChangelogs.map((page) => {
            const MDXContent = page.data.body;
            const data = page.data as ChangelogData;
            const date = new Date(data.date);
            const formattedDate = formatDate(date);
            const version = data.version;
            const tags = data.tags;

            return (
              <div key={page.url} className="relative">
                <div className="flex flex-col md:flex-row gap-y-6">
                  {/* Left side - Date and Version */}
                  <div className="md:w-48 flex-shrink-0">
                    <div className="md:sticky md:top-8 pb-10">
                      <time className="text-sm font-medium text-fd-muted-foreground block mb-3">
                        {formattedDate}
                      </time>

                      {version && (
                        <div className="inline-flex relative z-10 items-center justify-center w-15 h-10 text-fd-foreground border border-fd-border rounded-lg text-sm font-bold">
                          {version}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Content */}
                  <div className="flex-1 md:pl-8 relative pb-10">
                    {/* Vertical timeline line */}
                    <div className="hidden md:block absolute top-2 left-0 w-px h-full bg-fd-border">
                      {/* Timeline dot */}
                      <div className="hidden md:block absolute -translate-x-1/2 size-3 bg-fd-primary rounded-full z-10" />
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
                                className="h-6 w-fit px-2 text-xs font-medium bg-fd-muted text-fd-muted-foreground rounded-full border border-fd-border flex items-center justify-center"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-headings:font-semibold prose-a:no-underline prose-headings:tracking-tight prose-headings:text-balance prose-p:tracking-tight prose-p:text-balance">
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
