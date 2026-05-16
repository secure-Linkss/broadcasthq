"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Database,
  Webhook, Upload, FileText, Zap, TrendingDown,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface SystemHealthData {
  pipeline: {
    messagesLast1h: number; messagesLast24h: number;
    failedLast1h: number; failedLast24h: number;
    failRateLast1h: number; failRateLast24h: number;
    pendingMessages: number; queueHealth: "healthy" | "warning" | "degraded";
  };
  campaigns: {
    running: number; failedLast7d: number;
    statusBreakdown: { status: string; count: number; avgDeliveryRate: number; totalRecipients: number }[];
  };
  webhooks: {
    summary: { total: number; active: number; failing: number; totalFails: number };
    failing: { id: string; name: string; url: string; failCount: number; lastStatus: number; lastTriggeredAt: string; isActive: boolean; workspaceId: string; wsName: string }[];
  };
  imports: {
    statusBreakdown: { status: string; count: number; totalRows: number; newContacts: number }[];
    recent: { id: string; filename: string; status: string; totalRows: number; processedRows: number; newContacts: number; skippedContacts: number; createdAt: string; updatedAt: string; workspaceId: string; wsName: string }[];
  };
  auditLogs: {
    eventsLast24h: number;
    recent: { id: string; action: string; resource: string; resourceId: string; ipAddress: string; createdAt: string; workspaceId: string; metadata: Record<string, unknown> }[];
  };
  dailyPipeline: { day: string; sent: number; failed: number; delivered: number; read: number }[];
  hourlyErrors: { hour: number; failed: number; total: number }[];
}

const QUEUE_COLOR = { healthy: "text-green-500", warning: "text-yellow-500", degraded: "text-red-500" };
const QUEUE_BG = { healthy: "bg-green-500/10", warning: "bg-yellow-500/10", degraded: "bg-red-500/10" };
const STATUS_STYLE: Record<string, string> = {
  completed: "bg-green-500/15 text-green-500",
  running:   "bg-primary/15 text-primary",
  pending:   "bg-yellow-500/15 text-yellow-500",
  failed:    "bg-red-500/15 text-red-500",
  processing:"bg-blue-500/15 text-blue-500",
  draft:     "bg-muted text-muted-foreground",
  scheduled: "bg-orange-500/15 text-orange-500",
};

function StatCard({ title, value, sub, icon: Icon, color = "text-primary", highlight = false }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-red-500/30" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="rounded-lg bg-muted p-2"><Icon className={`h-5 w-5 ${color}`} /></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/system-health")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load system health data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
      <AlertTriangle className="h-5 w-5" />
      <span>{error ?? "Failed to load system health data"}</span>
    </div>
  );

  const { pipeline, campaigns, webhooks, imports } = data;

  const dailyData = data.dailyPipeline.map(d => ({
    date: new Date(d.day).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    Sent: d.sent, Delivered: d.delivered, Failed: d.failed, Read: d.read,
  }));

  const hourlyData = data.hourlyErrors.map(h => ({
    hour: `${h.hour}:00`,
    failRate: h.total > 0 ? Math.round((h.failed / h.total) * 100) : 0,
    failures: h.failed,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          System Health & Observability
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time pipeline health, error rates, webhook status, and operational metrics.</p>
      </div>

      {/* Pipeline KPIs */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Message Pipeline</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Messages (1h)" value={pipeline.messagesLast1h.toLocaleString()} icon={Zap} sub="Last 60 minutes" />
          <StatCard title="Messages (24h)" value={pipeline.messagesLast24h.toLocaleString()} icon={Activity} sub="Last 24 hours" />
          <StatCard
            title="Fail Rate (1h)"
            value={`${pipeline.failRateLast1h}%`}
            icon={TrendingDown}
            color={pipeline.failRateLast1h > 10 ? "text-red-500" : pipeline.failRateLast1h > 5 ? "text-yellow-500" : "text-green-500"}
            highlight={pipeline.failRateLast1h > 10}
            sub={`${pipeline.failedLast1h} failures`}
          />
          <Card className={QUEUE_BG[pipeline.queueHealth]}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Queue Health</p>
                  <p className={`text-2xl font-bold mt-1 capitalize ${QUEUE_COLOR[pipeline.queueHealth]}`}>
                    {pipeline.queueHealth}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{pipeline.pendingMessages.toLocaleString()} pending</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <Database className={`h-5 w-5 ${QUEUE_COLOR[pipeline.queueHealth]}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Campaigns + Webhooks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Running Campaigns" value={campaigns.running} icon={Zap} color="text-primary" />
        <StatCard
          title="Failed Campaigns (7d)"
          value={campaigns.failedLast7d}
          icon={AlertTriangle}
          color={campaigns.failedLast7d > 0 ? "text-red-500" : "text-muted-foreground"}
          highlight={campaigns.failedLast7d > 0}
        />
        <StatCard title="Total Webhooks" value={webhooks.summary.total} icon={Webhook} sub={`${webhooks.summary.active} active`} />
        <StatCard
          title="Failing Webhooks"
          value={webhooks.summary.failing}
          icon={AlertTriangle}
          color={webhooks.summary.failing > 0 ? "text-red-500" : "text-green-500"}
          highlight={webhooks.summary.failing > 0}
          sub={`${webhooks.summary.totalFails} total errors`}
        />
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline (7d)</TabsTrigger>
          <TabsTrigger value="errors">Hourly Errors</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="imports">Import Jobs</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        {/* Pipeline Chart */}
        <TabsContent value="pipeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Delivery Pipeline (Last 7 Days)</CardTitle>
              <CardDescription>Sent, delivered, read, and failed messages per day.</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No message data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Sent" stroke="#8b5cf6" fill="url(#gSent)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Delivered" stroke="#3b82f6" fill="url(#gDelivered)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Failed" stroke="#ef4444" fill="url(#gFailed)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hourly Error Rate */}
        <TabsContent value="errors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hourly Error Rate (Last 24h)</CardTitle>
              <CardDescription>Failure rate percentage per hour — spikes indicate delivery issues.</CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No error data in the last 24 hours.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      formatter={(v, n) => [n === "failRate" ? `${v}%` : v, n === "failRate" ? "Fail Rate" : "Failures"]}
                    />
                    <Bar dataKey="failRate" name="failRate" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="mt-4 space-y-4">
          {/* Campaign status breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {campaigns.statusBreakdown.map(s => (
                  <div key={s.status} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                    <div>
                      <Badge variant="outline" className={`capitalize text-[10px] ${STATUS_STYLE[s.status] ?? ""}`}>
                        {s.status}
                      </Badge>
                      <p className="text-lg font-bold mt-1">{s.count}</p>
                    </div>
                    {s.avgDeliveryRate > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Avg Delivery</p>
                        <p className="text-sm font-medium">{s.avgDeliveryRate}%</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Failing webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-4 w-4 text-red-500" />
                Failing Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.webhooks.failing.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">All webhooks operating normally</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Fail Count</TableHead>
                      <TableHead>Last Status</TableHead>
                      <TableHead>Last Triggered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.webhooks.failing.map(wh => (
                      <TableRow key={wh.id}>
                        <TableCell className="font-medium">{wh.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{wh.wsName}</TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[200px]">{wh.url}</TableCell>
                        <TableCell className="text-red-500 font-medium tabular-nums">{wh.failCount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={wh.lastStatus && wh.lastStatus >= 400 ? "text-red-500 border-red-500/30" : "text-green-500 border-green-500/30"}>
                            {wh.lastStatus ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {wh.lastTriggeredAt ? formatDistanceToNow(new Date(wh.lastTriggeredAt), { addSuffix: true }) : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Jobs Tab */}
        <TabsContent value="imports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Recent Import Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.imports.recent.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No import jobs found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total Rows</TableHead>
                      <TableHead>Imported</TableHead>
                      <TableHead>Skipped</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.imports.recent.map(job => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium text-sm max-w-[150px] truncate">{job.filename}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{job.wsName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize text-[10px] ${STATUS_STYLE[job.status] ?? ""}`}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{job.totalRows.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums text-green-500">{job.newContacts.toLocaleString()}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{job.skippedContacts.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                System Audit Trail
              </CardTitle>
              <CardDescription>{data.auditLogs.eventsLast24h} events in last 24h</CardDescription>
            </CardHeader>
            <CardContent>
              {data.auditLogs.recent.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No audit log entries found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.auditLogs.recent.slice(0, 50).map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px]">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">{log.resource}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.workspaceId ? log.workspaceId.slice(0, 8) + "…" : "System"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
