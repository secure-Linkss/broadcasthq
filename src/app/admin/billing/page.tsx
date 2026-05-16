"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  DollarSign, TrendingUp, Zap, Building2, AlertTriangle,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Users, ShieldX,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface BillingData {
  summary: {
    mrr: number; arr: number; totalPaid: number; conversionRate: number;
    newWorkspaces30d: number; growthChange: number; atRiskCount: number;
  };
  planBreakdown: { planId: string; total: number; active: number; mrr: number }[];
  subscriptionStatusBreakdown: { status: string | null; count: number }[];
  workspaceGrowthByDay: { day: string; count: number }[];
  recentWorkspaces: { id: string; name: string; planId: string; subscriptionStatus: string | null; createdAt: string }[];
  atRisk: { id: string; name: string; planId: string; subscriptionStatus: string | null; createdAt: string }[];
  highValue: { id: string; name: string; planId: string; subscriptionStatus: string | null; createdAt: string }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280", starter: "#3b82f6", pro: "#8b5cf6", enterprise: "#f59e0b",
};
const SUB_STATUS_COLORS: Record<string, string> = {
  active: "#22c55e", past_due: "#f59e0b", canceled: "#ef4444", trialing: "#3b82f6",
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

function KpiCard({
  title, value, sub, icon: Icon, color = "text-foreground",
  trend,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  color?: string; trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {trend.value >= 0
                  ? <ArrowUpRight className="h-3 w-3 text-green-500" />
                  : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                <span className={`text-xs font-medium ${trend.value >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {trend.value >= 0 ? "+" : ""}{trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-muted p-2">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge variant="outline" className="text-xs capitalize"
      style={{ borderColor: PLAN_COLORS[plan], color: PLAN_COLORS[plan] }}>
      {plan}
    </Badge>
  );
}

function SubStatusBadge({ status }: { status: string | null }) {
  const s = status ?? "none";
  return (
    <Badge variant="outline" className="text-xs capitalize"
      style={{ borderColor: SUB_STATUS_COLORS[s] ?? "#6b7280", color: SUB_STATUS_COLORS[s] ?? "#6b7280" }}>
      {s.replace("_", " ")}
    </Badge>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/billing")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load billing data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
      <AlertTriangle className="h-5 w-5" />
      <span>{error ?? "Failed to load billing data."}</span>
    </div>
  );

  const { summary, planBreakdown, subscriptionStatusBreakdown, workspaceGrowthByDay } = data;

  const growthData = workspaceGrowthByDay.map(d => ({
    date: new Date(d.day).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    workspaces: d.count,
  }));

  const pieData = subscriptionStatusBreakdown.filter(s => (s.count ?? 0) > 0).map(s => ({
    name: (s.status ?? "none").replace("_", " "),
    value: s.count,
    color: SUB_STATUS_COLORS[s.status ?? ""] ?? "#6b7280",
  }));

  const totalRevenue = planBreakdown.reduce((s, p) => s + p.mrr, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Revenue</h1>
        <p className="text-muted-foreground text-sm">Platform-wide subscription intelligence and revenue tracking.</p>
      </div>

      {/* KPI Row 1 — Revenue */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="MRR" value={`$${summary.mrr.toLocaleString()}`} icon={DollarSign} color="text-green-500" sub="Monthly Recurring Revenue" />
          <KpiCard title="ARR" value={`$${summary.arr.toLocaleString()}`} icon={TrendingUp} color="text-green-500" sub="Annual Run Rate" />
          <KpiCard title="Paid Subs" value={summary.totalPaid.toLocaleString()} icon={Zap} color="text-primary" sub="Active paying workspaces" />
          <KpiCard title="Conversion Rate" value={`${summary.conversionRate}%`} icon={Users} sub="Free → Paid" />
        </div>
      </div>

      {/* KPI Row 2 — Growth */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Growth</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="New (30d)" value={summary.newWorkspaces30d.toLocaleString()} icon={Building2} trend={{ value: summary.growthChange, label: "vs prev 30d" }} sub="New workspaces" />
          <KpiCard title="At Risk" value={summary.atRiskCount.toLocaleString()} icon={ShieldX} color={summary.atRiskCount > 0 ? "text-red-500" : "text-green-500"} sub="Canceled or past_due" />
          <KpiCard title="High Value" value={data.highValue.length.toLocaleString()} icon={CheckCircle2} color="text-yellow-500" sub="Pro + Enterprise active" />
          <KpiCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}/mo`} icon={DollarSign} color="text-green-500" sub="All active plans combined" />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Plan Breakdown</TabsTrigger>
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="atrisk">At Risk</TabsTrigger>
          <TabsTrigger value="highvalue">High Value</TabsTrigger>
          <TabsTrigger value="recent">Recent Signups</TabsTrigger>
        </TabsList>

        {/* ── Plan Breakdown ── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Plan Bar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MRR by Plan</CardTitle>
                <CardDescription>Monthly recurring revenue contribution per tier.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={planBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="planId" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toLocaleString()}`, "MRR"]} />
                    <Bar dataKey="mrr" name="MRR" radius={[4, 4, 0, 0]}>
                      {planBreakdown.map((p, i) => (
                        <Cell key={i} fill={PLAN_COLORS[p.planId] ?? "#6b7280"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subscription Status Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription Status</CardTitle>
                <CardDescription>Distribution of active, past_due, canceled, and trial subscriptions.</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No subscription data.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {pieData.map(p => (
                        <div key={p.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                            <span className="capitalize text-foreground">{p.name}</span>
                          </div>
                          <span className="text-muted-foreground tabular-nums">{p.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Plan detail table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Details</CardTitle>
              <CardDescription>Total vs active workspaces and MRR per plan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {planBreakdown.map(p => {
                  const activePct = p.total > 0 ? Math.round((p.active / p.total) * 100) : 0;
                  return (
                    <div key={p.planId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <PlanBadge plan={p.planId} />
                          <span className="text-sm text-muted-foreground">{p.total} workspaces · {p.active} active ({activePct}%)</span>
                        </div>
                        <span className="font-semibold text-sm text-green-500">${p.mrr.toLocaleString()}/mo</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${activePct}%`, background: PLAN_COLORS[p.planId] ?? "#6b7280" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Growth ── */}
        <TabsContent value="growth" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workspace Growth (Last 30 Days)</CardTitle>
              <CardDescription>New workspace signups per day.</CardDescription>
            </CardHeader>
            <CardContent>
              {growthData.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No growth data in this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="wsGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="workspaces" name="New Workspaces" stroke="#22c55e" fill="url(#wsGrowthGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── At Risk ── */}
        <TabsContent value="atrisk" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldX className="h-4 w-4 text-red-500" /> At-Risk Accounts
              </CardTitle>
              <CardDescription>Workspaces with canceled or past_due subscriptions. Immediate attention required.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.atRisk.length === 0 ? (
                <div className="flex items-center gap-2 text-green-500 py-6 justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">No at-risk accounts detected.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.atRisk.map(ws => (
                    <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">Joined {new Date(ws.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={ws.planId} />
                        <SubStatusBadge status={ws.subscriptionStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── High Value ── */}
        <TabsContent value="highvalue" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" /> High-Value Accounts
              </CardTitle>
              <CardDescription>Pro and Enterprise workspaces with active subscriptions.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.highValue.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No high-value accounts yet.</p>
              ) : (
                <div className="space-y-2">
                  {data.highValue.map(ws => (
                    <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">Since {new Date(ws.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={ws.planId} />
                        <SubStatusBadge status={ws.subscriptionStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Recent Signups ── */}
        <TabsContent value="recent" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Signups (Last 30 Days)</CardTitle>
              <CardDescription>Newest workspaces on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentWorkspaces.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No new workspaces in the last 30 days.</p>
              ) : (
                <div className="space-y-2">
                  {data.recentWorkspaces.map(ws => (
                    <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(ws.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={ws.planId} />
                        <SubStatusBadge status={ws.subscriptionStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
