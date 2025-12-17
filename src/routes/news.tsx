import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublishedNewsEntriesFn, getAllNewsTagsFn } from "~/fn/news";
import { isAdminFn } from "~/fn/auth";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  ExternalLink,
  Video,
  FileText,
  FileClock,
  Calendar,
  Filter,
  X,
  Settings,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useState } from "react";
import { Page } from "./admin/-components/page";
import { PageHeader } from "./admin/-components/page-header";
import { Link } from "@tanstack/react-router";
import { assertFeatureEnabled } from "~/lib/feature-flags";

export const Route = createFileRoute("/news")({
  beforeLoad: () => assertFeatureEnabled("NEWS_FEATURE"),
  component: NewsPage,
});

function NewsPage() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
  });

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return past.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const { data: newsEntries, isLoading } = useQuery({
    queryKey: ["news-entries"],
    queryFn: () => getPublishedNewsEntriesFn(),
  });

  const { data: availableTags } = useQuery({
    queryKey: ["news-tags"],
    queryFn: () => getAllNewsTagsFn(),
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "blog":
        return <FileText className="h-4 w-4" />;
      case "changelog":
        return <FileClock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
      case "blog":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "changelog":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "video":
        return "YouTube Video";
      case "blog":
        return "Blog Post";
      case "changelog":
        return "Changelog";
      default:
        return type;
    }
  };

  const filteredEntries =
    newsEntries?.filter((entry) => {
      if (selectedType && entry.type !== selectedType) return false;
      return true;
    }) || [];

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="AI News"
          highlightedWord="News"
          description="Stay up to date with the latest AI tools, YouTube videos, blog posts, and changelog updates. Curated content about Claude, Cursor, Cline, LLMs, and more."
        />
        
        {/* Content Skeleton */}
        <div className="grid gap-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                    <div className="h-7 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-full mb-1"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="AI News"
        highlightedWord="News"
        description="Stay up to date with the latest AI tools, YouTube videos, blog posts, and changelog updates. Curated content about Claude, Cursor, Cline, LLMs, and more."
        actions={
          isAdmin ? (
            <Button asChild size="sm">
              <Link to="/admin/news">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      {(availableTags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Filter by:
            </span>
          </div>

          <Select
            value={selectedType || ""}
            onValueChange={(value) => setSelectedType(value || null)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Content Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="video">📹 Videos</SelectItem>
              <SelectItem value="blog">📝 Blog Posts</SelectItem>
              <SelectItem value="changelog">🔄 Changelogs</SelectItem>
            </SelectContent>
          </Select>

          {selectedType && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedType(null);
              }}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* News Entries */}
      <div className="grid gap-6">
        {filteredEntries.map((entry) => (
          <Card
            key={entry.id}
            className="group hover:shadow-lg transition-shadow duration-200"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge
                      variant="outline"
                      className={getTypeColor(entry.type)}
                    >
                      {getTypeIcon(entry.type)}
                      <span className="ml-1">{getTypeLabel(entry.type)}</span>
                    </Badge>
                  </div>

                  <CardTitle className="text-xl mb-3 group-hover:text-theme-600 dark:group-hover:text-theme-400 transition-colors">
                    {entry.title}
                  </CardTitle>

                  {entry.description && (
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {entry.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatTimeAgo(entry.publishedAt)}</span>
                    </div>

                    {entry.authorName && <span>by {entry.authorName}</span>}
                  </div>
                </div>

                <div className="ml-6 flex-shrink-0">
                  <Button asChild size="sm">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {entry.type === "video" ? "Watch" : "Read"}
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>

            {entry.imageUrl && (
              <CardContent className="pt-0">
                <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {filteredEntries.length === 0 && !isLoading && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
              <h3 className="text-xl font-semibold mb-2">
                No news entries found
              </h3>
              <p className="text-muted-foreground">
                {selectedType || selectedTag
                  ? "Try adjusting your filters to see more content."
                  : "Check back soon for the latest AI news and updates!"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Page>
  );
}
