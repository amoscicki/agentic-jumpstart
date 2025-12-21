import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Page } from "~/routes/admin/-components/page";
import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Users,
  UserCheck,
  Sparkles,
  Rocket,
  Globe,
  Zap,
  ArrowRight,
} from "lucide-react";
import { getPublicMembersFn, getCommunityStatsFn } from "~/fn/profiles";
import {
  ScrollAnimation,
  ScrollScale,
  ScrollFadeIn,
} from "~/components/scroll-animation";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { DISCORD_INVITE_LINK } from "~/config";

function FlairBadge({ flair }: { flair: string }) {
  // Parse flair format: "Label:#hexcolor"
  const parts = flair.split(":");
  if (parts.length < 2) return null;

  const label = parts[0];
  const color = parts[1];

  return (
    <div
      className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wide shadow-lg ring-2 ring-background z-10 whitespace-nowrap transform hover:scale-110 transition-transform duration-200"
      style={{ backgroundColor: color }}
    >
      {label}
    </div>
  );
}

export const Route = createFileRoute("/members")({
  component: MembersPage,
  loader: async () => {
    const [members, stats] = await Promise.all([
      getPublicMembersFn(),
      getCommunityStatsFn(),
    ]);
    return { members, stats };
  },
});

function MembersPage() {
  const { members, stats } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-theme-500/5 blur-[120px] animate-pulse-slow" />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-[120px] animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] dark:opacity-[0.05]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <ScrollFadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-theme-500/10 text-theme-600 dark:text-theme-400 text-sm font-medium mb-8 border border-theme-500/20 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-500"></span>
              </span>
              Global Community
            </div>
          </ScrollFadeIn>

          <ScrollAnimation direction="up" delay={0.1}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              Build the Future with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-500 to-purple-500">
                {stats?.totalUsers.toLocaleString()} Developers
              </span>
            </h1>
          </ScrollAnimation>

          <ScrollAnimation direction="up" delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
              Join the fastest-growing network of agentic developers. Share your
              journey, showcase your work, and collaborate on the next
              generation of AI.
            </p>
          </ScrollAnimation>

          <ScrollAnimation direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href={DISCORD_INVITE_LINK}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-theme-600 to-theme-500 hover:from-theme-500 hover:to-theme-400 shadow-lg shadow-theme-500/25 hover:shadow-theme-500/40 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <Rocket className="mr-2 h-5 w-5" />
                  Join the Community
                </Button>
              </a>
              <Link to="/profile/edit">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50 transition-all duration-300"
                >
                  Create Public Profile
                </Button>
              </Link>
            </div>
          </ScrollAnimation>
        </div>

        {/* Stats Showcase */}
        {stats && (
          <ScrollScale delay={0.4}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
              {/* Total Users Stat */}
              <div className="group relative overflow-hidden rounded-3xl bg-card/50 backdrop-blur-xl border border-border/50 p-8 hover:bg-card/80 transition-all duration-500 hover:shadow-2xl hover:shadow-theme-500/10 hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Users className="w-32 h-32 text-theme-500 transform rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 text-theme-500">
                    <div className="p-2 rounded-xl bg-theme-500/10">
                      <Globe className="w-6 h-6" />
                    </div>
                    <span className="font-semibold uppercase tracking-wider text-sm">
                      Total Members
                    </span>
                  </div>
                  <div className="text-6xl font-bold mb-2 tracking-tight text-foreground">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground">
                    Developers, creators, and innovators from around the world
                  </p>
                </div>
              </div>

              {/* Public Profiles Stat */}
              <div className="group relative overflow-hidden rounded-3xl bg-card/50 backdrop-blur-xl border border-border/50 p-8 hover:bg-card/80 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <UserCheck className="w-32 h-32 text-purple-500 transform -rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 text-purple-500">
                    <div className="p-2 rounded-xl bg-purple-500/10">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <span className="font-semibold uppercase tracking-wider text-sm">
                      Public Profiles
                    </span>
                  </div>
                  <div className="text-6xl font-bold mb-2 tracking-tight text-foreground">
                    {stats.publicProfiles.toLocaleString()}
                  </div>
                  <p className="text-muted-foreground">
                    Members showcasing their portfolio and contributions
                  </p>
                </div>
              </div>

              {/* Activity/Engagement Stat (Visual placeholder for excitement) */}
              <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-theme-500 to-purple-600 p-1">
                <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                <div className="relative h-full bg-background/90 backdrop-blur-xl rounded-[22px] p-8 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-theme-400 to-purple-400"></div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-3 mb-4 text-foreground">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-theme-500 to-purple-500 text-white">
                        <Zap className="w-6 h-6" />
                      </div>
                      <span className="font-semibold uppercase tracking-wider text-sm">
                        Join the Action
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold mb-2">
                        Ready to make your mark?
                      </div>
                      <p className="text-muted-foreground mb-6">
                        Create your profile and start connecting with fellow
                        makers today.
                      </p>
                      <Link
                        to="/profile/edit"
                        className="inline-flex items-center text-sm font-semibold text-theme-500 hover:text-theme-400 transition-colors"
                      >
                        Get Started <ArrowRight className="ml-1 w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollScale>
        )}

        {/* Members Grid Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">Meet the Members</h2>
            <p className="text-muted-foreground">
              Browse profiles of the talented individuals in our community
            </p>
          </div>
          <div className="hidden md:block h-px flex-1 bg-gradient-to-r from-border/50 to-transparent ml-8"></div>
        </div>

        {/* Members Grid */}
        {members && members.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {members.map((member, index) => (
              <ScrollAnimation
                key={member.id}
                direction="up"
                delay={0.1 + (index % 4) * 0.1}
              >
                <Link
                  to="/profile/$userId"
                  params={{ userId: member.id.toString() }}
                >
                  <div className="group relative h-full">
                    {/* Card Glow */}
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-theme-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />

                    <Card className="relative h-full bg-card/50 backdrop-blur-sm border-border/50 hover:border-theme-500/30 transition-all duration-300 overflow-hidden">
                      <CardContent className="p-6 flex flex-col items-center text-center h-full relative z-10">
                        <div className="relative mb-4">
                          {member.flair && <FlairBadge flair={member.flair} />}
                          <div className="rounded-full p-1 bg-gradient-to-br from-theme-500/20 to-purple-500/20 group-hover:from-theme-500 group-hover:to-purple-500 transition-all duration-500">
                            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                              <AvatarImage
                                src={member.image || undefined}
                                alt={member.publicName || "Member"}
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <AvatarFallback className="bg-theme-100 dark:bg-theme-900 text-theme-600 dark:text-theme-300 text-2xl font-bold">
                                {member.publicName
                                  ? member.publicName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)
                                  : "U"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>

                        <div className="flex-1 w-full">
                          <h3 className="font-bold text-lg truncate px-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-theme-500 group-hover:to-purple-500 transition-all duration-300">
                            {member.publicName || "Anonymous"}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[2.5rem] px-2">
                            {member.bio || "Member of the Agentic Community"}
                          </p>
                        </div>

                        <div className="w-full pt-4 mt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Joined {new Date(member.updatedAt).getFullYear()}
                          </span>
                          <span className="group-hover:translate-x-1 transition-transform duration-300">
                            View Profile →
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </Link>
              </ScrollAnimation>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex justify-center items-center w-20 h-20 rounded-full bg-theme-100 dark:bg-theme-900/30 text-theme-500 mb-6">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Be the First</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              The community is just getting started. Create your public profile
              to be featured here.
            </p>
            <Link to="/profile/edit">
              <Button size="lg" className="rounded-full">
                Create Public Profile
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
