"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  MessageSquare, CheckCircle2, Eye, Activity, TrendingUp, TrendingDown,
  Download, Calendar, RefreshCw, Crown, Flame, Snowflake, Zap, Users,
  Target, Clock, BarChart3, ArrowUpRight, ArrowDownRight, FileText, Loader2,
} from "lucide-react";
import { getTierConfig, type EngagementTier } from "@/lib/engagement";

// ── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  summary: {
    totalMessagesSent:  number;
    deliveryRate:       number;
    readRate:           number;
    failRate?:          number;
    activeCampaigns:    number;
    totalContacts:      number;
    activeContacts:     number;
    totalCampaigns:     number;
    replyCount?:        number;
  };
  trends?: {
    sentChange:     number;
    deliveryChange: number;
    readChange:     number;
    replyRate:      number;
  };
  bestSendHour?: string | null;
  dailyBreakdown:  { date: string; sent: number; delivered: number; read: number; failed: number; replied?: number }[];
  topCampaigns:    { id: string; name: string; status: string; deliveryRate: number; readRate: number; recipientsCount: number; engagementScore?: number }[];
  templateStats?:  { id: string; name: string; usageCount: number; avgDeliveryRate: number; avgReadRate: number }[];
  engagementDist?: { tier: string; count: number }[];
  hourlyActivity?: { hour: number; count: number; label: string }[];
}

const RANGES = [
  { label: "7D",  value: "7d"  },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

const PALETTE = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

const TIER_ICONS: Record<string, React.ElementType> = {
  vip: Crown, active: Flame, warm: Zap, cold: Snowflake, inactive: Users,
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  running:   "bg-blue-500/10 text-blue-500 border-blue-500/20",
  scheduled: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  draft:     "bg-muted text-muted-foreground",
};


// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtN(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : n.toString();
}

function KpiCard({ title, value, sub, icon: Icon, trend, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  trend?: { value: number; label: string }; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted/50`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            {trend.value >= 0
              ? <ArrowUpRight className="h-3 w-3 text-green-500" />
              : <ArrowDownRight className="h-3 w-3 text-red-500" />}
            <span className={`text-xs font-medium ${trend.value >= 0 ? "text-green-500" : "text-red-500"}`}>
              {trend.value >= 0 ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-medium">{fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── PDF Report ────────────────────────────────────────────────────────────────

async function downloadPdfReport(
  data: AnalyticsData,
  chartRef: React.RefObject<HTMLDivElement | null>,
  range: string
) {
  const { default: jsPDF } = await import("jspdf");
  const html2canvas         = (await import("html2canvas")).default;

  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W      = doc.internal.pageSize.getWidth();
  const margin = 14;
  const now    = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // ── Cover header ──────────────────────────────────────────────────────────
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BroadcastHQ Analytics Report", margin, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${range.toUpperCase()}  ·  Generated: ${now}`, margin, 28);
  doc.setTextColor(0, 0, 0);

  let y = 48;

  // ── KPI summary table ─────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Key Performance Indicators", margin, y);
  y += 6;

  const kpis = [
    ["Metric",          "Value",                                         "Note"],
    ["Total Sent",      fmtN(data.summary.totalMessagesSent),            `Across ${data.summary.totalCampaigns} campaigns`],
    ["Delivery Rate",   `${data.summary.deliveryRate}%`,                 "Messages delivered"],
    ["Read Rate",       `${data.summary.readRate}%`,                     "Of delivered messages"],
    ["Reply Rate",      `${data.trends?.replyRate ?? 0}%`,               `${fmtN(data.summary.replyCount ?? 0)} replies`],
    ["Active Contacts", fmtN(data.summary.activeContacts),               `of ${fmtN(data.summary.totalContacts)} total`],
    ["Active Campaigns",data.summary.activeCampaigns.toString(),         "Currently running"],
    ["Fail Rate",       `${data.summary.failRate ?? 0}%`,                "Delivery failures"],
  ];

  const colWidths = [55, 35, 82];
  const rowH      = 8;
  kpis.forEach((row, ri) => {
    const isHeader = ri === 0;
    if (isHeader) {
      doc.setFillColor(240, 237, 255);
    } else {
      doc.setFillColor(ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 250 : 255);
    }
    doc.rect(margin, y, colWidths[0] + colWidths[1] + colWidths[2], rowH, "F");
    doc.setFont("helvetica", isHeader ? "bold" : "normal");
    doc.setFontSize(9);
    let x = margin + 2;
    row.forEach((cell, ci) => {
      doc.text(cell, x, y + 5.5);
      x += colWidths[ci];
    });
    // row border
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, y, colWidths[0] + colWidths[1] + colWidths[2], rowH, "S");
    y += rowH;
  });

  y += 8;

  // ── Chart screenshots ─────────────────────────────────────────────────────
  if (chartRef.current) {
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgW    = W - margin * 2;
      const imgH    = (canvas.height * imgW) / canvas.width;

      // Page break if needed
      if (y + imgH > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Message Volume Chart", margin, y);
      y += 5;
      doc.addImage(imgData, "PNG", margin, y, imgW, Math.min(imgH, 80));
      y += Math.min(imgH, 80) + 8;
    } catch { /* chart capture failed — skip */ }
  }

  // ── Top campaigns table ───────────────────────────────────────────────────
  if (data.topCampaigns?.length) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Top Campaigns", margin, y);
    y += 6;

    const campRows = [
      ["Campaign", "Recipients", "Delivery %", "Read %"],
      ...data.topCampaigns.slice(0, 10).map(c => [
        c.name.substring(0, 32),
        fmtN(c.recipientsCount),
        `${c.deliveryRate.toFixed(1)}%`,
        `${c.readRate.toFixed(1)}%`,
      ]),
    ];
    const cw = [80, 28, 28, 28];
    campRows.forEach((row, ri) => {
      const isH = ri === 0;
      doc.setFillColor(isH ? 240 : ri % 2 === 0 ? 250 : 255, isH ? 237 : ri % 2 === 0 ? 250 : 255, isH ? 255 : ri % 2 === 0 ? 250 : 255);
      doc.rect(margin, y, cw.reduce((a, b) => a + b, 0), rowH, "F");
      doc.setFont("helvetica", isH ? "bold" : "normal");
      doc.setFontSize(9);
      let x = margin + 2;
      row.forEach((cell, ci) => { doc.text(cell, x, y + 5.5); x += cw[ci]; });
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, cw.reduce((a, b) => a + b, 0), rowH, "S");
      y += rowH;
    });
    y += 8;
  }

  // ── Daily breakdown table ─────────────────────────────────────────────────
  if (data.dailyBreakdown?.length) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Daily Breakdown", margin, y);
    y += 6;

    const dailyRows = [
      ["Date", "Sent", "Delivered", "Read", "Failed"],
      ...data.dailyBreakdown.slice(-14).map(d => [
        new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        fmtN(d.sent),
        fmtN(d.delivered),
        fmtN(d.read),
        fmtN(d.failed),
      ]),
    ];
    const dw = [38, 28, 32, 28, 28];
    dailyRows.forEach((row, ri) => {
      const isH = ri === 0;
      if (y + rowH > doc.internal.pageSize.getHeight() - 10) { doc.addPage(); y = margin; }
      doc.setFillColor(isH ? 240 : ri % 2 === 0 ? 250 : 255, isH ? 237 : ri % 2 === 0 ? 250 : 255, isH ? 255 : ri % 2 === 0 ? 250 : 255);
      doc.rect(margin, y, dw.reduce((a, b) => a + b, 0), rowH, "F");
      doc.setFont("helvetica", isH ? "bold" : "normal");
      doc.setFontSize(9);
      let x = margin + 2;
      row.forEach((cell, ci) => { doc.text(cell, x, y + 5.5); x += dw[ci]; });
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, dw.reduce((a, b) => a + b, 0), rowH, "S");
      y += rowH;
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`BroadcastHQ  ·  Page ${i} of ${pages}  ·  ${now}`, margin, doc.internal.pageSize.getHeight() - 6);
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`broadcasthq-analytics-${range}-${Date.now()}.pdf`);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData]           = useState<AnalyticsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [range, setRange]         = useState("30d");
  const [tab, setTab]             = useState("overview");
  const [pdfLoading, setPdfLoading] = useState(false);
  const chartRef                  = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      const json = await res.json();
      if (json.error) setData(null);
      else setData(json);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const chartData = (data?.dailyBreakdown ?? []).map(d => ({
    date:      new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    sent:      d.sent,
    delivered: d.delivered,
    read:      d.read,
    failed:    d.failed,
    replied:   d.replied ?? 0,
  }));

  const funnelData = data ? [
    { name: "Sent",      value: data.summary.totalMessagesSent,                          color: "#7c3aed" },
    { name: "Delivered", value: Math.round(data.summary.totalMessagesSent * data.summary.deliveryRate / 100), color: "#3b82f6" },
    { name: "Read",      value: Math.round(data.summary.totalMessagesSent * data.summary.readRate / 100),     color: "#10b981" },
    { name: "Replied",   value: data.summary.replyCount ?? 0,                            color: "#f59e0b" },
  ] : [];

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Date", "Sent", "Delivered", "Read", "Failed", "Replied"],
      ...chartData.map(d => [d.date, d.sent, d.delivered, d.read, d.failed, d.replied]),
    ];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: `analytics-${range}.csv` });
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground text-sm">Broadcast performance &amp; engagement intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button
            size="sm"
            disabled={!data || pdfLoading}
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={async () => {
              if (!data) return;
              setPdfLoading(true);
              try { await downloadPdfReport(data, chartRef, range); }
              finally { setPdfLoading(false); }
            }}
          >
            {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {pdfLoading ? "Generating…" : "PDF Report"}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview"    className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="engagement"  className="gap-1.5"><Users className="h-3.5 w-3.5" /> Engagement</TabsTrigger>
          <TabsTrigger value="templates"   className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="campaigns"   className="gap-1.5"><Target className="h-3.5 w-3.5" /> Campaigns</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : [
                { title: "Total Sent",    value: fmtN(data?.summary.totalMessagesSent ?? 0),  icon: MessageSquare, color: "text-primary",     trend: data?.trends ? { value: data.trends.sentChange, label: "vs prev period" } : undefined, sub: `${fmtN(data?.summary.totalCampaigns ?? 0)} campaigns` },
                { title: "Delivery Rate", value: `${data?.summary.deliveryRate ?? 0}%`,        icon: CheckCircle2,  color: "text-green-500",  trend: data?.trends ? { value: data.trends.deliveryChange, label: "vs prev period" } : undefined, sub: "Messages delivered" },
                { title: "Read Rate",     value: `${data?.summary.readRate ?? 0}%`,             icon: Eye,           color: "text-purple-500", trend: data?.trends ? { value: data.trends.readChange, label: "vs prev period" } : undefined, sub: "Of delivered msgs" },
                { title: "Reply Rate",    value: `${data?.trends?.replyRate ?? 0}%`,            icon: Activity,      color: "text-yellow-500", trend: undefined, sub: `${fmtN(data?.summary.replyCount ?? 0)} replies` },
              ].map(kpi => <KpiCard key={kpi.title} {...kpi} />)
            }
          </div>

          {/* Delivery Funnel */}
          <div ref={chartRef} className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Message Volume</CardTitle>
                <CardDescription className="text-xs">Daily sent, delivered, and read over {range}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-56" /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                      <defs>
                        {[["sent","#7c3aed"],["delivered","#3b82f6"],["read","#10b981"]].map(([k,c]) => (
                          <linearGradient key={k} id={`g_${k}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={c} stopOpacity={0}   />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtN} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area dataKey="sent"      name="Sent"      stroke="#7c3aed" fill="url(#g_sent)"      strokeWidth={1.5} dot={false} />
                      <Area dataKey="delivered" name="Delivered" stroke="#3b82f6" fill="url(#g_delivered)" strokeWidth={1.5} dot={false} />
                      <Area dataKey="read"      name="Read"      stroke="#10b981" fill="url(#g_read)"      strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Delivery Funnel</CardTitle>
                <CardDescription className="text-xs">Message lifecycle breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? <Skeleton className="h-56" /> : funnelData.map((stage, i) => {
                  const pct = i === 0 ? 100 : Math.round((stage.value / (funnelData[0]?.value || 1)) * 100);
                  return (
                    <div key={stage.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{stage.name}</span>
                        <span className="text-muted-foreground">{fmtN(stage.value)} <span className="font-mono">({pct}%)</span></span>
                      </div>
                      <Progress value={pct} className="h-2" style={{ "--tw-ring-color": stage.color } as any} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Best Send Hours Heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Best Send Times</CardTitle>
              <CardDescription className="text-xs">Read activity by hour — higher bars = better engagement</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-32" /> : (
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={data?.hourlyActivity ?? []} barSize={18}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Reads" radius={[3,3,0,0]}>
                      {(() => {
                        const activity = data?.hourlyActivity ?? [];
                        const max = Math.max(...activity.map(h => h.count), 1);
                        return activity.map((entry, i) => (
                          <Cell key={i} fill={entry.count >= max * 0.8 ? "#7c3aed" : entry.count >= max * 0.5 ? "#a855f7" : "#7c3aed40"} />
                        ));
                      })()}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {data?.bestSendHour && (
                <p className="text-xs text-muted-foreground mt-2 text-center">Peak send time: {data.bestSendHour} — highest message activity in this period</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ENGAGEMENT TAB ───────────────────────────────────────────────── */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Segment distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Audience Segments</CardTitle>
                <CardDescription className="text-xs">Engagement tier breakdown across {fmtN(data?.summary.totalContacts ?? 0)} contacts</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48" /> : (
                  <div className="space-y-3 mt-1">
                    {(() => {
                      const dist = data?.engagementDist ?? [];
                      const total = dist.reduce((s, d) => s + d.count, 0);
                      return dist.map(seg => {
                        const cfg = getTierConfig(seg.tier as EngagementTier);
                        const Icon = TIER_ICONS[seg.tier] ?? Users;
                        const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
                        return (
                          <div key={seg.tier} className="flex items-center gap-3">
                            <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">{cfg.label}</span>
                                <span className="text-muted-foreground font-mono">{fmtN(seg.count)} ({pct}%)</span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pie chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Engagement Distribution</CardTitle>
                <CardDescription className="text-xs">Visual breakdown of audience health</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-48" /> : (
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={data?.engagementDist ?? []}
                        dataKey="count"
                        nameKey="tier"
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={3}
                      >
                        {(data?.engagementDist ?? []).map((seg, i) => (
                          <Cell key={seg.tier} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [fmtN(Number(v)), String(n ?? '')]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Engagement trend (read + replied) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Engagement Trend</CardTitle>
              <CardDescription className="text-xs">Read and reply rates over {range}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48" /> : (
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${fmtN(v)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line dataKey="read"    name="Read"    stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line dataKey="replied" name="Replied" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Engagement KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />) : [
              { label: "Fail Rate",         value: data?.summary.failRate !== undefined ? `${data.summary.failRate}%` : "—", icon: Clock,  color: "text-blue-500",   desc: `In last ${range}` },
              { label: "VIP Contacts",      value: fmtN(data?.engagementDist?.find(e => e.tier === "vip")?.count ?? 0), icon: Crown,  color: "text-yellow-500", desc: "Score 80+" },
              { label: "Inactive Contacts", value: fmtN(data?.engagementDist?.find(e => e.tier === "inactive")?.count ?? 0), icon: Snowflake, color: "text-red-500", desc: "No engagement 30d" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <s.icon className={`h-8 w-8 ${s.color}`} />
                  <div>
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-xs font-medium">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TEMPLATES TAB ────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Template Performance</CardTitle>
              <CardDescription className="text-xs">Delivery &amp; read rates per template across all campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-64" /> : (
                <div className="space-y-0 divide-y divide-border">
                  {(data?.templateStats ?? []).map((tmpl, i) => (
                    <div key={tmpl.id} className="py-3 flex items-center gap-4">
                      <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tmpl.name}</p>
                        <p className="text-xs text-muted-foreground">Used {tmpl.usageCount}x</p>
                      </div>
                      <div className="flex items-center gap-6 text-xs shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-green-500">{tmpl.avgDeliveryRate.toFixed(1)}%</p>
                          <p className="text-muted-foreground">Delivery</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-primary">{tmpl.avgReadRate.toFixed(1)}%</p>
                          <p className="text-muted-foreground">Read</p>
                        </div>
                      </div>
                      <div className="w-24">
                        <Progress value={tmpl.avgReadRate} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Read Rate by Template</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48" /> : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={data?.templateStats ?? []} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Read Rate"]} />
                    <Bar dataKey="avgReadRate" name="Read Rate" fill="#7c3aed" radius={[0,3,3,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CAMPAIGNS TAB ────────────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Campaigns</CardTitle>
              <CardDescription className="text-xs">Ranked by engagement score in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-72" /> : (
                <div className="space-y-0 divide-y divide-border">
                  {(data?.topCampaigns ?? []).map((c, i) => (
                    <div key={c.id} className="py-3.5 flex items-center gap-4">
                      <span className="text-xs font-mono text-muted-foreground w-5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[c.status]}`}>{c.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{fmtN(c.recipientsCount)} recipients</p>
                      </div>
                      <div className="flex items-center gap-6 text-xs shrink-0">
                        <div className="text-center">
                          <p className="font-semibold text-green-500">{c.deliveryRate.toFixed(1)}%</p>
                          <p className="text-muted-foreground">Delivery</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-primary">{c.readRate.toFixed(1)}%</p>
                          <p className="text-muted-foreground">Read</p>
                        </div>
                        {c.engagementScore !== undefined && (
                          <div className="text-center">
                            <p className="font-semibold text-yellow-500">{c.engagementScore}</p>
                            <p className="text-muted-foreground">Score</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Campaign Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={(data?.topCampaigns ?? []).filter(c => c.deliveryRate > 0)} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="deliveryRate" name="Delivery" fill="#3b82f6" radius={[3,3,0,0]} barSize={18} />
                    <Bar dataKey="readRate"     name="Read"     fill="#7c3aed" radius={[3,3,0,0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
