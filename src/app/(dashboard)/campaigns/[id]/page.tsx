"use client";

import { useEffect, useState, useCallback } from "react";
import { Campaign } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell,
} from "recharts";
import {
  ArrowLeft, Copy, MoreHorizontal, FileText, CheckCircle2, AlertCircle,
  Eye, MessageSquare, Download, Zap, Shield, TrendingUp, Clock, Users,
  Target, Info, Flame, Crown, Snowflake, RefreshCw, Send,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { computeCampaignQuality, getBestSendHours } from "@/lib/engagement";
import { renderPersonalization } from "@/lib/personalization";

// ── Tier config ───────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  vip:      { label: "VIP",      color: "#f59e0b" },
  active:   { label: "Active",   color: "#10b981" },
  warm:     { label: "Warm",     color: "#3b82f6" },
  cold:     { label: "Cold",     color: "#6b7280" },
  inactive: { label: "Inactive", color: "#ef4444" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtN(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : n.toString();
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  running:   "bg-blue-500/10 text-blue-500 border-blue-500/20",
  scheduled: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  draft:     "bg-muted text-muted-foreground border-border",
  failed:    "bg-red-500/10 text-red-500 border-red-500/20",
};

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#7c3aed" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-muted/30" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x={size/2} y={size/2+5} textAnchor="middle" className="rotate-90"
        style={{ transform: `rotate(90deg) translate(0, -${size/2}px)`, fontSize: 14, fontWeight: 700, fill: color }}>
        {score}
      </text>
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineRow { hour: number; label: string; sent: number; delivered: number; read: number }
interface AudienceTierRow { tier: string; count: number }

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign]     = useState<any | null>(null);
  const [timeline, setTimeline]     = useState<TimelineRow[]>([]);
  const [audienceTiers, setAudienceTiers] = useState<AudienceTierRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [launching, setLaunching]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${params.id}`);
      if (!res.ok) throw new Error('Failed to load campaign');
      const data = await res.json();
      setCampaign(data.campaign);
      setTimeline(data.timeline ?? []);
      setAudienceTiers(data.audienceTiers ?? []);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleLaunch = async () => {
    if (!campaign || launching) return;
    const ok = window.confirm(`Launch "${campaign.name}" to ${fmtN(campaign.recipientsCount)} recipients?\n\nThis cannot be undone.`);
    if (!ok) return;
    setLaunching(true);
    await fetch("/api/campaigns/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id }),
    });
    setLaunching(false);
    load();
  };

  const exportReport = () => {
    if (!campaign) return;
    const rows = [
      ["Campaign", campaign.name],
      ["Status", campaign.status],
      ["Recipients", campaign.recipientsCount],
      ["Delivery Rate", `${campaign.deliveryRate}%`],
      ["Read Rate", `${campaign.readRate}%`],
      ["Failed", campaign.failCount],
      ["Engagement Score", campaign.engagementScore ?? "N/A"],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `campaign-${campaign.id}.csv`,
    });
    a.click();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24"/>)}</div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!campaign) return <div className="text-muted-foreground">Campaign not found.</div>;

  const deliveredCount = Math.round(campaign.recipientsCount * campaign.deliveryRate / 100);
  const readCount      = Math.round(campaign.recipientsCount * campaign.readRate / 100);
  const replyCount     = campaign.replyCount ?? 0;

  const funnelStages = [
    { name: "Recipients", value: campaign.recipientsCount, color: "#6b7280" },
    { name: "Sent",       value: campaign.recipientsCount - campaign.failCount, color: "#7c3aed" },
    { name: "Delivered",  value: deliveredCount, color: "#3b82f6" },
    { name: "Read",       value: readCount, color: "#10b981" },
    { name: "Replied",    value: replyCount, color: "#f59e0b" },
  ];

  const quality = computeCampaignQuality({
    hasTemplate:        !!campaign.templateName,
    recipientsCount:    campaign.recipientsCount,
    hasValidVariables:  true,
    templateApproved:   campaign.status !== "draft",
    audienceHasOptOuts: false,
    listHealthPct:      0.93,
  });

  const bestHours = getBestSendHours().slice(0, 5);

  const previewText = campaign.templateName
    ? renderPersonalization(
        `Hi {{first_name}}, ${campaign.description ?? "thank you for being a valued customer!"}`,
        { firstName: "Sarah", ...campaign.templateVariables }
      )
    : "No template selected.";

  const engagementScore = campaign.engagementScore ?? quality.score;

  // Audience tiers with colors
  const audienceDisplay = audienceTiers.map(seg => ({
    tier:  TIER_CONFIG[seg.tier]?.label ?? seg.tier,
    count: seg.count,
    color: TIER_CONFIG[seg.tier]?.color ?? "#6b7280",
  }));

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full">
              <Link href="/campaigns"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight">{campaign.name}</h2>
                <Badge variant="outline" className={STATUS_STYLES[campaign.status]}>
                  {campaign.status}
                </Badge>
                {engagementScore >= 80 && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1">
                    <Crown className="h-3 w-3" /> Top Performer
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Created {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                {campaign.sentDate && ` · Sent ${format(new Date(campaign.sentDate), "MMM d, yyyy 'at' h:mm a")}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {campaign.status === "draft" && (
              <Button onClick={handleLaunch} disabled={launching} className="gap-2">
                {launching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {launching ? "Launching…" : "Launch Campaign"}
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportReport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/campaigns/new?duplicate=${campaign.id}`}>
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Message Log</DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">Delete Campaign</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Recipients", value: fmtN(campaign.recipientsCount), icon: Users,        color: "text-muted-foreground" },
            { label: "Delivered",  value: `${campaign.deliveryRate}%`,    icon: CheckCircle2,  color: "text-green-500"  },
            { label: "Read",       value: `${campaign.readRate}%`,         icon: Eye,           color: "text-primary"    },
            { label: "Replies",    value: fmtN(replyCount),               icon: MessageSquare, color: "text-yellow-500" },
            { label: "Failed",     value: fmtN(campaign.failCount),       icon: AlertCircle,   color: "text-red-500"    },
            { label: "Score",      value: engagementScore != null ? String(engagementScore) : "—", icon: Zap, color: "text-purple-400" },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <kpi.icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance"  className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Performance</TabsTrigger>
            <TabsTrigger value="funnel"       className="gap-1.5"><Target className="h-3.5 w-3.5" /> Funnel</TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Intelligence</TabsTrigger>
            <TabsTrigger value="preview"      className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Preview</TabsTrigger>
          </TabsList>

          {/* ── Performance Tab ────────────────────────────────────────────── */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Delivery Timeline</CardTitle>
                  <CardDescription className="text-xs">Hourly message delivery breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <div className="flex items-center justify-center h-[220px] text-xs text-muted-foreground">
                      No message data yet for this campaign.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={timeline} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtN} />
                        <Tooltip formatter={(v) => fmtN(Number(v))} />
                        <Bar dataKey="sent"      name="Sent"      fill="#7c3aed50" radius={[3,3,0,0]} barSize={16} />
                        <Bar dataKey="delivered" name="Delivered" fill="#3b82f6"   radius={[3,3,0,0]} barSize={16} />
                        <Bar dataKey="read"      name="Read"      fill="#10b981"   radius={[3,3,0,0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Audience Breakdown</CardTitle>
                  <CardDescription className="text-xs">Recipients by engagement tier</CardDescription>
                </CardHeader>
                <CardContent>
                  {audienceDisplay.length === 0 ? (
                    <div className="flex items-center justify-center h-[120px] text-xs text-muted-foreground">
                      No audience data available.
                    </div>
                  ) : (
                    <div className="space-y-3 mt-1">
                      {audienceDisplay.map(seg => (
                        <div key={seg.tier}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium">{seg.tier}</span>
                            <span className="text-muted-foreground font-mono">{fmtN(seg.count)}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: `${Math.round((seg.count / campaign.recipientsCount) * 100)}%`,
                              background: seg.color,
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Separator className="my-3" />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Total audience</span>
                    <span className="font-medium">{fmtN(campaign.recipientsCount)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Funnel Tab ────────────────────────────────────────────────── */}
          <TabsContent value="funnel" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Engagement Funnel</CardTitle>
                  <CardDescription className="text-xs">Message lifecycle — from sent to replied</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mt-2">
                    {funnelStages.map((stage, i) => {
                      const pct = i === 0 ? 100 : Math.round((stage.value / (funnelStages[0]?.value || 1)) * 100);
                      const prevPct = i > 0 ? Math.round((funnelStages[i-1].value / (funnelStages[0]?.value || 1)) * 100) : 100;
                      const dropPct = i > 0 ? pct - prevPct : 0;
                      return (
                        <div key={stage.name} className="relative">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium">{stage.name}</span>
                            <span className="font-mono text-muted-foreground">
                              {fmtN(stage.value)}
                              <span className="ml-2 font-semibold" style={{ color: stage.color }}>{pct}%</span>
                              {dropPct < 0 && <span className="ml-1 text-red-400">({dropPct}%)</span>}
                            </span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: stage.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Funnel Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={funnelStages} layout="vertical" barSize={20}>
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmtN} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                      <Tooltip formatter={(v) => fmtN(Number(v))} />
                      <Bar dataKey="value" name="Count" radius={[0,4,4,0]}>
                        {funnelStages.map((s, i) => (
                          <Cell key={i} fill={s.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Intelligence Tab ──────────────────────────────────────────── */}
          <TabsContent value="intelligence" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Engagement Score
                  </CardTitle>
                  <CardDescription className="text-xs">Overall campaign performance rating</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 py-2">
                  <ScoreRing score={engagementScore ?? 0} size={80} />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {engagementScore >= 80 ? "Excellent" :
                       engagementScore >= 60 ? "Good" :
                       engagementScore >= 40 ? "Average" : "Needs Improvement"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Based on delivery + read + reply rates</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" /> Campaign Quality
                  </CardTitle>
                  <CardDescription className="text-xs">Pre-send quality indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quality.issues.length === 0
                    ? <div className="flex items-center gap-2 text-xs text-green-500"><CheckCircle2 className="h-4 w-4" /> No issues detected</div>
                    : quality.issues.map(issue => (
                        <div key={issue} className="flex items-center gap-2 text-xs text-red-400">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {issue}
                        </div>
                      ))
                  }
                  <Separator className="my-2" />
                  {quality.recommendations.map(rec => (
                    <div key={rec} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-400" /> {rec}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" /> Best Send Times
                  </CardTitle>
                  <CardDescription className="text-xs">Optimal hours for this audience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 mt-1">
                  {bestHours.map((h, i) => (
                    <div key={h.hour} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">#{i+1}</span>
                      <span className="text-xs font-medium w-10">{h.label}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${h.score}%` }} />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-8">{h.score}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" /> Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { icon: Clock,    color: "text-blue-400",   bg: "bg-blue-500/10",   title: "Optimize send time",    desc: "Evening sends typically show higher read rates for WhatsApp campaigns" },
                    { icon: Crown,    color: "text-yellow-400", bg: "bg-yellow-500/10", title: "Prioritize VIP tier",   desc: "VIP contacts consistently outperform other tiers on read and reply rates" },
                    { icon: Target,   color: "text-green-400",  bg: "bg-green-500/10",  title: "Segment audience",      desc: "Splitting inactive contacts into a re-engagement campaign improves overall rates" },
                    { icon: Snowflake,color: "text-red-400",    bg: "bg-red-500/10",    title: "Clean inactive contacts", desc: "Removing unengaged contacts improves deliverability and Meta quality rating" },
                    { icon: Zap,      color: "text-purple-400", bg: "bg-purple-500/10", title: "Add a clear CTA",       desc: "Campaigns with actionable calls-to-action see significantly higher reply rates" },
                  ].map(tip => (
                    <div key={tip.title} className={`p-3 rounded-lg border border-border ${tip.bg} flex gap-3`}>
                      <tip.icon className={`h-4 w-4 shrink-0 mt-0.5 ${tip.color}`} />
                      <div>
                        <p className="text-xs font-semibold">{tip.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Preview Tab ───────────────────────────────────────────────── */}
          <TabsContent value="preview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Message Preview</CardTitle>
                  <CardDescription className="text-xs">How this message appears on WhatsApp</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-4">
                  <div className="w-full max-w-[300px]">
                    <div className="bg-[#0b1120] rounded-xl overflow-hidden shadow-xl border border-white/10">
                      <div className="bg-[#075e54] px-4 py-3 flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">B</div>
                        <div>
                          <p className="text-white text-sm font-medium">BroadcastHQ</p>
                          <p className="text-white/60 text-[10px]">Business Account</p>
                        </div>
                      </div>
                      <div className="p-4 bg-[#ece5dd] min-h-[120px]">
                        <div className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm max-w-[85%] text-sm text-gray-800 leading-relaxed">
                          {previewText}
                          <p className="text-[10px] text-right text-gray-400 mt-2">
                            {campaign.sentDate ? format(new Date(campaign.sentDate), "h:mm a") : "Now"} ✓✓
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Template Variables</CardTitle>
                  <CardDescription className="text-xs">Personalization fields used in this campaign</CardDescription>
                </CardHeader>
                <CardContent>
                  {campaign.templateName && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 mb-4">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{campaign.templateName}</p>
                        <p className="text-[10px] text-muted-foreground">Template</p>
                      </div>
                      <Badge variant="outline" className="ml-auto text-[10px] text-green-500 border-green-500/30">Approved</Badge>
                    </div>
                  )}
                  <div className="space-y-2">
                    {Object.entries(campaign.templateVariables ?? {}).length === 0
                      ? <p className="text-xs text-muted-foreground">No variables used in this template.</p>
                      : Object.entries(campaign.templateVariables ?? {}).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-xs">
                            <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{`{{${k}}}`}</code>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium truncate">{String(v)}</span>
                          </div>
                        ))
                    }
                  </div>
                  {campaign.tags?.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex flex-wrap gap-1.5">
                        {campaign.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
