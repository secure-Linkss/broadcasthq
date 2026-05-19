"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Users, Zap,
  AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  XCircle, Clock, CreditCard, BarChart3, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RevenueData {
  summary: {
    mrr: number;
    arr: number;
    activePaid: number;
    conversionRate: number;
    avgRevPerWorkspace: number;
    churnRate: number;
    churnCount: number;
    totalWorkspaces: number;
    freeCount: number;
    trialCount: number;
  };
  monthlyTrend: { month: string; mrr: number; newPaid: number; churn: number }[];
  revenueByPlan: { planId: string; total: number; active: number; trialing: number; mrr: number; price: number }[];
  paymentEvents: { id: string; name: string; planId: string; amount: number; status: string; date: string | Date; stripeCustomerId: string | null }[];
  canceledSubs: { id: string; name: string; planId: string; subscriptionStatus: string | null; createdAt: string | Date }[];
  trialSubs:    { id: string; name: string; planId: string; subscriptionStatus: string | null; createdAt: string | Date }[];
  topRevenue:   { id: string; name: string; planId: string; subscriptionStatus: string | null; stripeCustomerId: string | null; createdAt: string | Date }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280", starter: "#3b82f6", pro: "#8b5cf6", enterprise: "#f59e0b",
};
const STATUS_COLORS: Record<string, string> = {
  paid: "#22c55e", active: "#22c55e", past_due: "#f59e0b",
  canceled: "#ef4444", trialing: "#3b82f6", unknown: "#6b7280",
};
const PLAN_PRICES: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 199 };

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, icon: Icon, color = "text-foreground", trend, badge,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  color?: string; trend?: { value: number; label: string }; badge?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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
          <div className="rounded-lg bg-muted p-2 shrink-0">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        {badge && (
          <Badge variant="outline" className="mt-3 text-[10px]">{badge}</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <Badge variant="outline" className="text-xs capitalize font-medium"
      style={{ borderColor: PLAN_COLORS[plan], color: PLAN_COLORS[plan] }}>
      {plan}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "unknown";
  const color = STATUS_COLORS[s] ?? "#6b7280";
  return (
    <Badge variant="outline" className="text-xs capitalize"
      style={{ borderColor: color, color }}>
      {s.replace("_", " ")}
    </Badge>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminRevenuePage() {
  const [data, setData]       = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/revenue")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load revenue data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-72" />
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
      <AlertTriangle className="h-5 w-5" />
      <span>{error ?? "Failed to load revenue data."}</span>
    </div>
  );

  const { summary, monthlyTrend, revenueByPlan, paymentEvents, canceledSubs, trialSubs, topRevenue } = data;

  // Pie data for plan distribution
  const planPieData = revenueByPlan
    .filter(p => p.active > 0)
    .map(p => ({ name: p.planId, value: p.active, color: PLAN_COLORS[p.planId] ?? "#6b7280" }));

  // Revenue mix for stacked bar
  const revMixData = revenueByPlan
    .filter(p => p.planId !== "free")
    .map(p => ({ name: p.planId, seats: p.active, mrr: p.mrr }));

  const currentMrr = monthlyTrend[monthlyTrend.length - 1]?.mrr ?? 0;
  const prevMrr    = monthlyTrend[monthlyTrend.length - 2]?.mrr ?? 0;
  const mrrGrowth  = prevMrr > 0 ? Math.round(((currentMrr - prevMrr) / prevMrr) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-500" />
            Revenue Intelligence
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Comprehensive subscription revenue analytics and payment tracking.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md border border-border hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── KPI Row 1 — Revenue ── */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <DollarSign className="h-3 w-3" /> Revenue
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="MRR"
            value={`$${summary.mrr.toLocaleString()}`}
            sub="Monthly Recurring Revenue"
            icon={DollarSign}
            color="text-green-500"
            trend={{ value: mrrGrowth, label: "vs last month" }}
          />
          <KpiCard
            title="ARR"
            value={`$${summary.arr.toLocaleString()}`}
            sub="Annual Run Rate"
            icon={TrendingUp}
            color="text-green-500"
          />
          <KpiCard
            title="Avg Rev / Workspace"
            value={`$${summary.avgRevPerWorkspace}`}
            sub="Per paying workspace"
            icon={BarChart3}
            color="text-primary"
          />
          <KpiCard
            title="Paid Subscriptions"
            value={summary.activePaid.toLocaleString()}
            sub="Active paying workspaces"
            icon={CreditCard}
            color="text-primary"
          />
          <KpiCard
            title="Conversion Rate"
            value={`${summary.conversionRate}%`}
            sub="Free → Paid"
            icon={Zap}
            color={summary.conversionRate > 10 ? "text-green-500" : "text-orange-500"}
          />
        </div>
      </div>

      {/* ── KPI Row 2 — Health ── */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Subscription Health
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Total Workspaces"
            value={summary.totalWorkspaces.toLocaleString()}
            sub="All registered workspaces"
            icon={Users}
          />
          <KpiCard
            title="Free Plan"
            value={summary.freeCount.toLocaleString()}
            sub="Non-paying workspaces"
            icon={Users}
            color="text-muted-foreground"
          />
          <KpiCard
            title="On Trial"
            value={summary.trialCount.toLocaleString()}
            sub="Active trialing"
            icon={Clock}
            color="text-blue-500"
          />
          <KpiCard
            title="Churn Count"
            value={summary.churnCount.toLocaleString()}
            sub="Canceled or past_due"
            icon={XCircle}
            color={summary.churnCount > 0 ? "text-red-500" : "text-green-500"}
          />
          <KpiCard
            title="Churn Rate"
            value={`${summary.churnRate}%`}
            sub="Of total workspaces"
            icon={TrendingDown}
            color={summary.churnRate > 5 ? "text-red-500" : summary.churnRate > 2 ? "text-orange-500" : "text-green-500"}
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="trends">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
          <TabsTrigger value="plans">Plan Mix</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="topaccounts">Top Accounts</TabsTrigger>
          <TabsTrigger value="churn">Churn & At-Risk</TabsTrigger>
          <TabsTrigger value="trials">Trials</TabsTrigger>
        </TabsList>

        {/* ── Revenue Trends ── */}
        <TabsContent value="trends" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Recurring Revenue (12 mo)</CardTitle>
                <CardDescription>MRR trend based on active paid subscriptions.</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyTrend.every(m => m.mrr === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                    <DollarSign className="h-8 w-8 opacity-20" />
                    <p>No paid subscriptions yet — MRR will appear here once workspaces subscribe.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${Number(v).toLocaleString()}`, "MRR"]} />
                      <Area type="monotone" dataKey="mrr" name="MRR" stroke="#22c55e" fill="url(#mrrGrad)" strokeWidth={2.5} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Paid Signups (12 mo)</CardTitle>
                <CardDescription>Count of new paid workspaces created per month.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="newPaid" name="New Paid" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue per plan over time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Plan — Current Snapshot</CardTitle>
              <CardDescription>MRR contribution and workspace count per plan tier.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueByPlan.map(p => {
                  const mrrPct = summary.mrr > 0 ? Math.round((p.mrr / summary.mrr) * 100) : 0;
                  return (
                    <div key={p.planId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <PlanBadge plan={p.planId} />
                          <span className="text-sm text-muted-foreground">
                            {p.active} active · {p.total} total
                            {p.trialing > 0 && ` · ${p.trialing} trialing`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{mrrPct}%</span>
                          <span className="font-semibold text-sm text-green-500 tabular-nums">
                            ${p.mrr.toLocaleString()}/mo
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${mrrPct}%`, background: PLAN_COLORS[p.planId] ?? "#6b7280" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Plan Mix ── */}
        <TabsContent value="plans" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Workspace Distribution</CardTitle>
                <CardDescription>Breakdown of paying workspaces by plan tier.</CardDescription>
              </CardHeader>
              <CardContent>
                {planPieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">No active paid subscriptions.</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={planPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                          {planPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {planPieData.map(p => (
                        <div key={p.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                            <span className="capitalize">{p.name}</span>
                          </div>
                          <span className="text-muted-foreground tabular-nums">{p.value} workspaces</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">MRR Contribution by Plan</CardTitle>
                <CardDescription>Revenue generated per plan (active only).</CardDescription>
              </CardHeader>
              <CardContent>
                {revMixData.every(d => d.mrr === 0) ? (
                  <p className="text-center text-muted-foreground py-10 text-sm">No paid subscriptions yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={revMixData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={70} />
                      <Tooltip contentStyle={tooltipStyle} formatter={v => [`$${Number(v).toLocaleString()}`, "MRR"]} />
                      <Bar dataKey="mrr" name="MRR" radius={[0, 4, 4, 0]}>
                        {revMixData.map((d, i) => (
                          <Cell key={i} fill={PLAN_COLORS[d.name] ?? "#6b7280"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed plan table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Full Plan Breakdown</CardTitle>
              <CardDescription>All tiers — total, active, trialing counts and revenue.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="text-left pb-2 pr-4">Plan</th>
                      <th className="text-right pb-2 pr-4">Price</th>
                      <th className="text-right pb-2 pr-4">Total</th>
                      <th className="text-right pb-2 pr-4">Active</th>
                      <th className="text-right pb-2 pr-4">Trialing</th>
                      <th className="text-right pb-2">MRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {revenueByPlan.map(p => (
                      <tr key={p.planId} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4"><PlanBadge plan={p.planId} /></td>
                        <td className="py-2.5 pr-4 text-right text-muted-foreground tabular-nums">
                          {p.price === 0 ? "Free" : `$${p.price}/mo`}
                        </td>
                        <td className="py-2.5 pr-4 text-right tabular-nums">{p.total}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-green-500 font-medium">{p.active}</td>
                        <td className="py-2.5 pr-4 text-right tabular-nums text-blue-500">{p.trialing}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold text-green-500">
                          {p.mrr > 0 ? `$${p.mrr.toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2.5 pr-4 text-foreground">Total</td>
                      <td className="py-2.5 pr-4"></td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{summary.totalWorkspaces}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-green-500">{summary.activePaid + summary.freeCount}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-blue-500">{summary.trialCount}</td>
                      <td className="py-2.5 text-right tabular-nums text-green-500">${summary.mrr.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Transactions ── */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> Recent Payment Events
              </CardTitle>
              <CardDescription>
                Workspace subscription activity (last 30 days). Connect Stripe webhooks for full payment history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <CreditCard className="h-8 w-8 opacity-20" />
                  <p className="text-sm">No payment events in the last 30 days.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left pb-2 pr-4">Workspace</th>
                        <th className="text-left pb-2 pr-4">Plan</th>
                        <th className="text-right pb-2 pr-4">Amount</th>
                        <th className="text-left pb-2 pr-4">Status</th>
                        <th className="text-right pb-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paymentEvents.map(ev => (
                        <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 pr-4 font-medium">{ev.name}</td>
                          <td className="py-2.5 pr-4"><PlanBadge plan={ev.planId} /></td>
                          <td className="py-2.5 pr-4 text-right tabular-nums font-semibold text-green-500">
                            {ev.amount > 0 ? `$${ev.amount}` : "Free"}
                          </td>
                          <td className="py-2.5 pr-4">
                            <StatusBadge status={ev.status} />
                          </td>
                          <td className="py-2.5 text-right text-muted-foreground text-xs">
                            {format(new Date(ev.date), "dd MMM yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stripe integration note */}
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Stripe Invoice Sync</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Configure <code className="text-primary">STRIPE_SECRET_KEY</code> and set up a Stripe webhook at{" "}
                  <code className="text-primary">/api/stripe/webhook</code> to sync full invoice history, payment failures, and refunds automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Top Accounts ── */}
        <TabsContent value="topaccounts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-yellow-500" /> High-Value Accounts
              </CardTitle>
              <CardDescription>Pro and Enterprise workspaces with active subscriptions — your top revenue contributors.</CardDescription>
            </CardHeader>
            <CardContent>
              {topRevenue.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">No high-value accounts yet.</p>
              ) : (
                <div className="space-y-2">
                  {topRevenue.map((ws, i) => (
                    <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ws.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Since {format(new Date(ws.createdAt), "MMM d, yyyy")}
                            {ws.stripeCustomerId && <span className="ml-1.5 text-green-500">· Stripe connected</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-sm font-semibold text-green-500">
                          ${PLAN_PRICES[ws.planId] ?? 0}/mo
                        </span>
                        <PlanBadge plan={ws.planId} />
                        <StatusBadge status={ws.subscriptionStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Churn & At-Risk ── */}
        <TabsContent value="churn" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-red-500">{summary.churnCount}</p>
                  <p className="text-xs text-muted-foreground">Churned accounts (canceled or past_due)</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-500 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-orange-500">{summary.churnRate}%</p>
                  <p className="text-xs text-muted-foreground">Churn rate across all workspaces</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> At-Risk Accounts
              </CardTitle>
              <CardDescription>Workspaces with canceled or past_due subscriptions requiring intervention.</CardDescription>
            </CardHeader>
            <CardContent>
              {canceledSubs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-green-500">
                  <CheckCircle2 className="h-8 w-8" />
                  <p className="text-sm font-medium">No at-risk accounts — great retention!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {canceledSubs.map(ws => (
                    <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">Joined {format(new Date(ws.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={ws.planId} />
                        <StatusBadge status={ws.subscriptionStatus} />
                        <span className="text-xs font-medium text-red-500">
                          -${PLAN_PRICES[ws.planId] ?? 0}/mo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trials ── */}
        <TabsContent value="trials" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" /> Active Trials
              </CardTitle>
              <CardDescription>
                Workspaces currently on trial — {summary.trialCount} total.
                These are potential paid conversions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trialSubs.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">No active trials.</p>
              ) : (
                <div className="space-y-2">
                  {trialSubs.map(ws => (
                    <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">Started {format(new Date(ws.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlanBadge plan={ws.planId} />
                        <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30">Trialing</Badge>
                        <span className="text-xs font-medium text-blue-500">
                          +${PLAN_PRICES[ws.planId] ?? 0}/mo potential
                        </span>
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
