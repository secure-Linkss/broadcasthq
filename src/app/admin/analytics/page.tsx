"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  TrendingUp, Users, Building2, MessageSquare, Star,
  Target, Layers, BarChart3, AlertTriangle, CheckCircle2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface IntelligenceData {
  engagement: {
    globalDist: { tier: string; count: number }[];
  };
  templates: {
    topPerforming: {
      id: string; name: string; category: string; language: string;
      status: string; usageCount: number; avgDeliveryRate: number;
      avgReadRate: number; workspaceId: string; wsName: string;
    }[];
    categoryBreakdown: {
      category: string; count: number; avgReadRate: number;
      avgDeliveryRate: number; totalUsage: number;
    }[];
  };
  campaigns: {
    benchmarks: {
      avgDeliveryRate: number; avgReadRate: number; avgRecipientsCount: number;
      p90DeliveryRate: number; p90ReadRate: number; totalCampaigns: number;
    };
    statusDist: { status: string; count: number; avgDeliveryRate: number; totalRecipients: number }[];
    top: {
      id: string; name: string; status: string; workspaceId: string; wsName: string;
      deliveryRate: number; readRate: number; recipientsCount: number;
      replyCount: number; sentDate: string | null;
    }[];
  };
  contacts: {
    statusDist: { status: string; count: number }[];
    growthByDay: { day: string; newContacts: number }[];
  };
  workspaces: {
    growthByDay: { day: string; newWorkspaces: number }[];
    engagementLeaderboard: {
      workspaceId: string; name: string; planId: string;
      avgReadRate: number; avgDeliveryRate: number;
      totalCampaigns: number; totalRecipients: number;
    }[];
    deliveryByPlan: {
      planId: string; avgDeliveryRate: number;
      avgReadRate: number; totalMessages: number;
    }[];
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  vip: "#f59e0b", active: "#8b5cf6", warm: "#3b82f6",
  cold: "#6b7280", inactive: "#ef4444",
};
const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280", starter: "#3b82f6", pro: "#8b5cf6", enterprise: "#f59e0b",
};
const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e", opted_out: "#ef4444", bounced: "#f59e0b",
  inactive: "#6b7280", unsubscribed: "#ec4899",
};
const CAMPAIGN_STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e", running: "#3b82f6", paused: "#f59e0b",
  draft: "#6b7280", failed: "#ef4444",
};

// ─── Sub-components ─────────────────────────────────────────────────────────
function BenchmarkCard({
  label, value, sub, highlight = false,
}: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function RateBar({ value, color = "#8b5cf6" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums font-medium w-10 text-right">{value}%</span>
    </div>
  );
}

function fmtDay(day: string) {
  return new Date(day).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/intelligence")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load intelligence data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
      <AlertTriangle className="h-5 w-5" />
      <span>{error ?? "Failed to load intelligence data."}</span>
    </div>
  );

  const { engagement, templates, campaigns, contacts, workspaces } = data;
  const bench = campaigns.benchmarks;

  const contactGrowthData = contacts.growthByDay.map(d => ({
    date: fmtDay(d.day), contacts: d.newContacts,
  }));
  const wsGrowthData = workspaces.growthByDay.map(d => ({
    date: fmtDay(d.day), workspaces: d.newWorkspaces,
  }));

  const tierData = engagement.globalDist.map(d => ({
    name: d.tier, value: d.count, color: TIER_COLORS[d.tier] ?? "#6b7280",
  }));

  const contactStatusData = contacts.statusDist.map(d => ({
    name: d.status.replace("_", " "), value: d.count,
    color: STATUS_COLORS[d.status] ?? "#6b7280",
  }));

  const deliveryByPlanData = workspaces.deliveryByPlan.map(p => ({
    plan: p.planId,
    deliveryRate: p.avgDeliveryRate ?? 0,
    readRate: p.avgReadRate ?? 0,
  }));

  const radarData = templates.categoryBreakdown.map(c => ({
    category: c.category, readRate: c.avgReadRate ?? 0, deliveryRate: c.avgDeliveryRate ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Global System Intelligence</h1>
        <p className="text-muted-foreground text-sm">Cross-workspace analytics, engagement intelligence, and performance benchmarks.</p>
      </div>

      {/* Campaign Benchmarks */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Campaign Benchmarks — Platform-Wide (Last 90 Days)</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <BenchmarkCard label="Total Campaigns" value={(bench.totalCampaigns ?? 0).toLocaleString()} />
          <BenchmarkCard label="Avg Delivery" value={`${bench.avgDeliveryRate ?? 0}%`} highlight />
          <BenchmarkCard label="Avg Read Rate" value={`${bench.avgReadRate ?? 0}%`} highlight />
          <BenchmarkCard label="P90 Delivery" value={`${bench.p90DeliveryRate ?? 0}%`} sub="Top 10% threshold" />
          <BenchmarkCard label="P90 Read Rate" value={`${bench.p90ReadRate ?? 0}%`} sub="Top 10% threshold" />
          <BenchmarkCard label="Avg Recipients" value={(bench.avgRecipientsCount ?? 0).toLocaleString()} sub="Per campaign" />
        </div>
      </div>

      <Tabs defaultValue="engagement">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
        </TabsList>

        {/* ── Engagement Tab ── */}
        <TabsContent value="engagement" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Engagement Tier Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" /> Global Engagement Tiers
                </CardTitle>
                <CardDescription>Contact engagement distribution across all workspaces.</CardDescription>
              </CardHeader>
              <CardContent>
                {tierData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No contact data.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={tierData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                          {tierData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {tierData.map(t => {
                        const total = tierData.reduce((s, d) => s + d.value, 0);
                        const pct = total > 0 ? Math.round((t.value / total) * 100) : 0;
                        return (
                          <div key={t.name} className="flex items-center gap-2 text-sm">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                            <span className="capitalize flex-1 text-foreground">{t.name}</span>
                            <span className="text-muted-foreground tabular-nums">{t.value.toLocaleString()}</span>
                            <span className="font-medium w-10 text-right tabular-nums">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Contact Health Distribution
                </CardTitle>
                <CardDescription>Active vs opted-out vs bounced across platform.</CardDescription>
              </CardHeader>
              <CardContent>
                {contactStatusData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No contact data.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={contactStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                          {contactStatusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {contactStatusData.map(s => {
                        const total = contactStatusData.reduce((a, d) => a + d.value, 0);
                        const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                        return (
                          <div key={s.name} className="flex items-center gap-2 text-sm">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                            <span className="capitalize flex-1 text-foreground">{s.name}</span>
                            <span className="text-muted-foreground tabular-nums">{s.value.toLocaleString()}</span>
                            <span className="font-medium w-10 text-right tabular-nums">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Templates Tab ── */}
        <TabsContent value="templates" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Templates */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Top Performing Templates (Platform-Wide)
                </CardTitle>
                <CardDescription>Ranked by avg read rate. Templates with at least 1 send.</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.topPerforming.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No template data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {templates.topPerforming.slice(0, 10).map((t, i) => (
                      <div key={t.id} className="flex items-start gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5 pt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium truncate">{t.name}</span>
                              <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{t.category}</Badge>
                              <Badge variant="outline" className="text-xs uppercase flex-shrink-0">{t.language}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex-shrink-0">{t.wsName}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Read Rate</p>
                              <RateBar value={t.avgReadRate ?? 0} color="#8b5cf6" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Delivery</p>
                              <RateBar value={t.avgDeliveryRate ?? 0} color="#22c55e" />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{t.usageCount.toLocaleString()} sends</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Performance</CardTitle>
                <CardDescription>Avg read/delivery rates by template category.</CardDescription>
              </CardHeader>
              <CardContent>
                {templates.categoryBreakdown.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data.</p>
                ) : (
                  <div className="space-y-3">
                    {templates.categoryBreakdown.map(c => (
                      <div key={c.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{c.category}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{c.count} templates</span>
                            <span>{c.totalUsage?.toLocaleString() ?? 0} sends</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Read</p>
                            <RateBar value={c.avgReadRate ?? 0} color="#8b5cf6" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Delivery</p>
                            <RateBar value={c.avgDeliveryRate ?? 0} color="#22c55e" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Radar: Category vs Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Radar</CardTitle>
                <CardDescription>Read vs delivery rates across template categories.</CardDescription>
              </CardHeader>
              <CardContent>
                {radarData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <Radar name="Read Rate" dataKey="readRate" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                      <Radar name="Delivery Rate" dataKey="deliveryRate" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                      <Tooltip contentStyle={tooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Campaigns Tab ── */}
        <TabsContent value="campaigns" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campaign Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Campaign Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns.statusDist.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No campaigns.</p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.statusDist.map(s => (
                      <div key={s.status} className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ background: CAMPAIGN_STATUS_COLORS[s.status] ?? "#6b7280" }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="capitalize font-medium">{s.status}</span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{s.count.toLocaleString()} campaigns</span>
                              {s.totalRecipients > 0 && <span>{s.totalRecipients.toLocaleString()} recipients</span>}
                            </div>
                          </div>
                          {s.avgDeliveryRate > 0 && (
                            <RateBar value={s.avgDeliveryRate} color={CAMPAIGN_STATUS_COLORS[s.status] ?? "#6b7280"} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery by Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Performance by Plan</CardTitle>
                <CardDescription>Avg delivery and read rates across subscription tiers.</CardDescription>
              </CardHeader>
              <CardContent>
                {deliveryByPlanData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={deliveryByPlanData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="plan" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`]} />
                      <Bar dataKey="deliveryRate" name="Delivery Rate" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="readRate" name="Read Rate" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Campaigns */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Top Campaigns (Last 90 Days)
                </CardTitle>
                <CardDescription>Highest read-rate campaigns across all workspaces.</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.top.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No campaign data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.top.map((c, i) => (
                      <div key={c.id} className="flex items-start gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-5 pt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium truncate">{c.name}</span>
                              <Badge
                                variant="outline"
                                className="text-xs capitalize flex-shrink-0"
                                style={{ borderColor: CAMPAIGN_STATUS_COLORS[c.status] ?? undefined, color: CAMPAIGN_STATUS_COLORS[c.status] ?? undefined }}
                              >
                                {c.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                              <span>{c.wsName}</span>
                              <span>{c.recipientsCount.toLocaleString()} rcpts</span>
                              {c.sentDate && <span>{new Date(c.sentDate).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Read Rate</p>
                              <RateBar value={c.readRate ?? 0} color="#8b5cf6" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Delivery</p>
                              <RateBar value={c.deliveryRate ?? 0} color="#22c55e" />
                            </div>
                          </div>
                          {c.replyCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              {c.replyCount.toLocaleString()} replies
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Workspaces Tab ── */}
        <TabsContent value="workspaces" className="space-y-6 mt-4">
          {/* Engagement Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Workspace Engagement Leaderboard
              </CardTitle>
              <CardDescription>Ranked by avg read rate. Min 2 campaigns in last 90 days.</CardDescription>
            </CardHeader>
            <CardContent>
              {workspaces.engagementLeaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No qualifying workspaces yet.</p>
              ) : (
                <div className="space-y-4">
                  {workspaces.engagementLeaderboard.map((ws, i) => (
                    <div key={ws.workspaceId} className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                        i === 1 ? "bg-gray-400/20 text-gray-400" :
                        i === 2 ? "bg-amber-700/20 text-amber-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">{ws.name}</span>
                            <Badge variant="outline" className="text-xs capitalize flex-shrink-0"
                              style={{ borderColor: PLAN_COLORS[ws.planId], color: PLAN_COLORS[ws.planId] }}>
                              {ws.planId}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                            <span>{ws.totalCampaigns} campaigns</span>
                            <span>{ws.totalRecipients?.toLocaleString() ?? 0} sent</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Read Rate</p>
                            <RateBar value={ws.avgReadRate ?? 0} color="#8b5cf6" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Delivery</p>
                            <RateBar value={ws.avgDeliveryRate ?? 0} color="#22c55e" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Growth Tab ── */}
        <TabsContent value="growth" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Contact Growth (30 Days)
                </CardTitle>
                <CardDescription>New contacts added across all workspaces per day.</CardDescription>
              </CardHeader>
              <CardContent>
                {contactGrowthData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No contact growth data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={contactGrowthData}>
                      <defs>
                        <linearGradient id="contactGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="contacts" name="New Contacts" stroke="#3b82f6" fill="url(#contactGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Workspace Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Workspace Growth (30 Days)
                </CardTitle>
                <CardDescription>New workspaces created per day.</CardDescription>
              </CardHeader>
              <CardContent>
                {wsGrowthData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No workspace growth data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={wsGrowthData}>
                      <defs>
                        <linearGradient id="wsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="workspaces" name="New Workspaces" stroke="#f59e0b" fill="url(#wsGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Combined Growth Bar Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Daily Contact Acquisition Rate
                </CardTitle>
                <CardDescription>Bar view of contact growth — identifies peak acquisition days.</CardDescription>
              </CardHeader>
              <CardContent>
                {contactGrowthData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={contactGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="contacts" name="New Contacts" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
