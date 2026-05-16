"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Building2, Users, MessageSquare, TrendingUp,
  DollarSign, Zap, Activity, Calendar, Globe,
  CheckCircle2, AlertTriangle, Contact, Megaphone,
} from "lucide-react";

interface AdminStats {
  kpis: {
    totalWorkspaces: number; totalUsers: number; totalMessages: number;
    totalContacts: number; totalCampaigns: number;
    msgThisMonth: number; newWorkspaces7d: number; newUsers7d: number;
    activeSubsCount: number; mrr: number; arr: number;
    globalDeliveryRate: number; globalFailRate: number;
  };
  planBreakdown: { planId: string; count: number }[];
  dailyMessages: { day: string; count: number }[];
  topWorkspaces: { id: string; name: string; planId: string; msgCount: number; createdAt: string }[];
}

const PLAN_COLORS: Record<string, string> = {
  free: "#6b7280", starter: "#3b82f6", pro: "#8b5cf6", enterprise: "#f59e0b",
};
const PLAN_PRICES: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 199 };

function KpiCard({ title, value, sub, icon: Icon, color = "text-primary" }: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="rounded-lg bg-muted p-2">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setStats(d); })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  );

  if (error || !stats) return (
    <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
      <AlertTriangle className="h-5 w-5" /><span>{error ?? "Failed to load platform stats."}</span>
    </div>
  );

  const { kpis } = stats;

  const dailyData = stats.dailyMessages.map(d => ({
    date: new Date(d.day).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    messages: d.count,
  }));

  const pieData = stats.planBreakdown.filter(p => p.count > 0);
  const totalRevPerPlan = stats.planBreakdown.map(p => ({
    plan: p.planId, revenue: p.count * (PLAN_PRICES[p.planId] ?? 0), count: p.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Intelligence Overview</h1>
        <p className="text-muted-foreground text-sm">Cross-workspace operational metrics and system health summary.</p>
      </div>

      {/* Platform Health Banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${
        kpis.globalFailRate > 10 ? "bg-red-500/10 border-red-500/30 text-red-500" :
        kpis.globalFailRate > 5 ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" :
        "bg-green-500/10 border-green-500/30 text-green-500"
      }`}>
        {kpis.globalFailRate > 10 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        Platform Status: {kpis.globalFailRate > 10 ? "⚠ Elevated failure rate detected" : kpis.globalFailRate > 5 ? "↗ Failure rate above baseline" : "All systems operational"} —
        Global delivery rate: <strong className="ml-1">{kpis.globalDeliveryRate}%</strong> | Fail rate: <strong className="ml-1">{kpis.globalFailRate}%</strong>
      </div>

      {/* Row 1: Core KPIs */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Platform Scale</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Workspaces" value={kpis.totalWorkspaces.toLocaleString()} icon={Building2} sub={`+${kpis.newWorkspaces7d} this week`} />
          <KpiCard title="Users" value={kpis.totalUsers.toLocaleString()} icon={Users} sub={`+${kpis.newUsers7d} this week`} />
          <KpiCard title="Total Contacts" value={kpis.totalContacts.toLocaleString()} icon={Contact} />
          <KpiCard title="Total Campaigns" value={kpis.totalCampaigns.toLocaleString()} icon={Megaphone} />
        </div>
      </div>

      {/* Row 2: Message Volume */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Messaging Volume</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Messages" value={kpis.totalMessages.toLocaleString()} icon={MessageSquare} sub={`${kpis.msgThisMonth.toLocaleString()} this month`} />
          <KpiCard title="Global Delivery" value={`${kpis.globalDeliveryRate}%`} icon={CheckCircle2} color="text-green-500" sub="Platform-wide rate" />
          <KpiCard title="Global Fail Rate" value={`${kpis.globalFailRate}%`} icon={Activity} color={kpis.globalFailRate > 5 ? "text-red-500" : "text-green-500"} sub="All workspaces" />
          <KpiCard title="This Month" value={kpis.msgThisMonth.toLocaleString()} icon={Calendar} sub="Current billing cycle" />
        </div>
      </div>

      {/* Row 3: Revenue */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="MRR" value={`$${kpis.mrr.toLocaleString()}`} icon={DollarSign} color="text-green-500" sub="Monthly Recurring Revenue" />
          <KpiCard title="ARR" value={`$${kpis.arr.toLocaleString()}`} icon={TrendingUp} color="text-green-500" sub="Annual Run Rate" />
          <KpiCard title="Paid Subs" value={kpis.activeSubsCount.toLocaleString()} icon={Zap} color="text-green-500" sub="Active subscriptions" />
          <KpiCard title="Conversion Rate" value={kpis.totalWorkspaces > 0 ? `${Math.round((kpis.activeSubsCount / kpis.totalWorkspaces) * 100)}%` : "0%"} icon={Globe} sub="Paid vs total workspaces" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily volume */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daily Message Volume (Last 30 Days)</CardTitle>
            <CardDescription>Total messages sent across all workspaces.</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No message data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="messages" stroke="#8b5cf6" fill="url(#msgGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No workspaces yet.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="planId" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={PLAN_COLORS[entry.planId] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {totalRevPerPlan.map(p => (
                    <div key={p.plan} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: PLAN_COLORS[p.plan] ?? "#6b7280" }} />
                        <span className="capitalize text-foreground">{p.plan}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{p.count}</span>
                        <span className="font-medium text-green-500">${p.revenue.toLocaleString()}/mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Workspaces */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Workspaces by Message Volume</CardTitle>
          <CardDescription>Highest-activity workspaces on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topWorkspaces.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No workspace data yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topWorkspaces.map((ws, i) => (
                <div key={ws.id} className="flex items-center gap-4">
                  <span className="w-5 text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{ws.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">{ws.planId}</Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">{ws.msgCount.toLocaleString()} msgs</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${stats.topWorkspaces[0].msgCount > 0 ? (ws.msgCount / stats.topWorkspaces[0].msgCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
