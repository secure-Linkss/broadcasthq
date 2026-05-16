"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Shield, AlertTriangle, Bot, Ban, Activity, TrendingDown,
  Users, Building2, Zap, Eye, Clock, Globe,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SecurityData {
  botBlocks: {
    total: number; global: number; hitsLast24h: number;
    topHits: { id: string; pattern: string; type: string; hitCount: number; isGlobal: boolean; lastHitAt: string; reason: string }[];
  };
  workspaceRisk: {
    highFailRate: { workspaceId: string; name: string; planId: string; total: number; failed: number; failRate: number }[];
    inactive: { id: string; name: string; planId: string; createdAt: string; msgCount: number }[];
    flagged: { id: string; name: string; planId: string; createdAt: string }[];
    riskMap: Record<string, number>;
  };
  deliveryHealth: { workspaceId: string; name: string; planId: string; total: number; failed: number; delivered: number }[];
  recentAuditEvents: { id: string; action: string; resource: string; resourceId: string; ipAddress: string; createdAt: string; workspaceId: string; metadata: Record<string, unknown> }[];
  highVolumeCampaigns: { id: string; name: string; workspaceId: string; wsName: string; recipientsCount: number; status: string; createdAt: string; deliveryRate: number }[];
  suspiciousUsers: { id: string; email: string; name: string; role: string; status: string; createdAt: string; workspaceId: string; wsName: string }[];
  optOutSpikes: { workspaceId: string; name: string; optOuts: number; total: number }[];
}

const RISK_COLOR = (score: number) =>
  score >= 80 ? "text-red-500" :
  score >= 50 ? "text-orange-500" :
  score >= 25 ? "text-yellow-500" : "text-green-500";

const RISK_BG = (score: number) =>
  score >= 80 ? "bg-red-500" :
  score >= 50 ? "bg-orange-500" :
  score >= 25 ? "bg-yellow-500" : "bg-green-500";

const PLAN_BADGE: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-blue-500/15 text-blue-500",
  pro: "bg-purple-500/15 text-purple-500",
  enterprise: "bg-yellow-500/15 text-yellow-500",
};

function RiskBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${RISK_BG(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums w-8 text-right ${RISK_COLOR(score)}`}>{score}</span>
    </div>
  );
}

export default function AdminSecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/security")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Failed to load security data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  if (error || !data) return (
    <div className="flex items-center gap-2 text-destructive p-4 bg-destructive/10 rounded-lg">
      <AlertTriangle className="h-5 w-5" />
      <span>{error ?? "Failed to load security data"}</span>
    </div>
  );

  const totalRisk = data.workspaceRisk.flagged.length + data.workspaceRisk.highFailRate.length;
  const riskLevel = totalRisk > 5 ? "critical" : totalRisk > 2 ? "warning" : "healthy";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-destructive" />
          Security Intelligence Center
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Platform-wide threat monitoring, abuse detection, and risk analysis.</p>
      </div>

      {/* Top-level risk overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={totalRisk > 0 ? "border-red-500/30" : ""}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Platform Risk Level</p>
                <p className={`text-2xl font-bold mt-1 capitalize ${riskLevel === "critical" ? "text-red-500" : riskLevel === "warning" ? "text-yellow-500" : "text-green-500"}`}>
                  {riskLevel}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{totalRisk} workspace(s) flagged</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Shield className="h-5 w-5 text-destructive" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Bot Blocks Active</p>
                <p className="text-2xl font-bold mt-1">{data.botBlocks.total}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.botBlocks.global} global rules</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Bot className="h-5 w-5 text-orange-500" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Block Hits (24h)</p>
                <p className={`text-2xl font-bold mt-1 ${data.botBlocks.hitsLast24h > 100 ? "text-red-500" : "text-foreground"}`}>
                  {data.botBlocks.hitsLast24h}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Blocked requests</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Ban className="h-5 w-5 text-red-500" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">High-Volume Campaigns</p>
                <p className={`text-2xl font-bold mt-1 ${data.highVolumeCampaigns.length > 0 ? "text-yellow-500" : "text-foreground"}`}>
                  {data.highVolumeCampaigns.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">&gt;10k recipients</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Activity className="h-5 w-5 text-yellow-500" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="risk">
        <TabsList>
          <TabsTrigger value="risk">Workspace Risk</TabsTrigger>
          <TabsTrigger value="botblocks">Bot Blocks</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Signals</TabsTrigger>
          <TabsTrigger value="users">Suspicious Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Workspace Risk Tab */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          {data.workspaceRisk.highFailRate.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  High Failure Rate Workspaces
                </CardTitle>
                <CardDescription>Workspaces with &gt;15% message failure rate in the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Total Msgs</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Fail Rate</TableHead>
                      <TableHead>Risk Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.workspaceRisk.highFailRate.map(ws => {
                      const risk = data.workspaceRisk.riskMap[ws.workspaceId] ?? 0;
                      return (
                        <TableRow key={ws.workspaceId}>
                          <TableCell className="font-medium">{ws.name}</TableCell>
                          <TableCell><Badge variant="outline" className={PLAN_BADGE[ws.planId]}>{ws.planId}</Badge></TableCell>
                          <TableCell className="tabular-nums">{ws.total.toLocaleString()}</TableCell>
                          <TableCell className="tabular-nums text-red-500">{ws.failed.toLocaleString()}</TableCell>
                          <TableCell className="tabular-nums text-red-500 font-medium">{ws.failRate}%</TableCell>
                          <TableCell className="w-32"><RiskBar score={risk} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.workspaceRisk.flagged.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-500" />
                  Deactivated Workspaces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.workspaceRisk.flagged.map(ws => (
                      <TableRow key={ws.id}>
                        <TableCell className="font-medium">{ws.name}</TableCell>
                        <TableCell><Badge variant="outline" className={PLAN_BADGE[ws.planId]}>{ws.planId}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{format(new Date(ws.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell><RiskBar score={100} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.workspaceRisk.inactive.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  Ghost Workspaces (0 messages in 7+ days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.workspaceRisk.inactive.map(ws => (
                      <TableRow key={ws.id}>
                        <TableCell className="font-medium">{ws.name}</TableCell>
                        <TableCell><Badge variant="outline" className={PLAN_BADGE[ws.planId]}>{ws.planId}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(ws.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.workspaceRisk.highFailRate.length === 0 && data.workspaceRisk.flagged.length === 0 && data.workspaceRisk.inactive.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 text-green-500" />
                <p className="font-medium text-green-500">No workspace risk signals detected</p>
                <p className="text-sm mt-1">All workspaces are operating within normal parameters.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bot Blocks Tab */}
        <TabsContent value="botblocks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-orange-500" />
                Top Hit Bot Blocks
              </CardTitle>
              <CardDescription>Patterns blocked most frequently across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.botBlocks.topHits.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No bot blocks configured yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Hit Count</TableHead>
                      <TableHead>Last Hit</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.botBlocks.topHits.map(block => (
                      <TableRow key={block.id}>
                        <TableCell className="font-mono text-sm">{block.pattern}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px]">{block.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={block.isGlobal ? "default" : "outline"} className="text-[10px]">
                            {block.isGlobal ? "Global" : "Workspace"}
                          </Badge>
                        </TableCell>
                        <TableCell className="tabular-nums font-medium text-orange-500">{block.hitCount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {block.lastHitAt ? formatDistanceToNow(new Date(block.lastHitAt), { addSuffix: true }) : "Never"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{block.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Signals Tab */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                High-Volume Campaigns (&gt;10,000 recipients)
              </CardTitle>
              <CardDescription>Large broadcast campaigns that may require review for spam compliance.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.highVolumeCampaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No high-volume campaigns detected.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivery Rate</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.highVolumeCampaigns.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{c.wsName}</TableCell>
                        <TableCell className="tabular-nums font-medium">{c.recipientsCount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">{c.status}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{c.deliveryRate > 0 ? `${c.deliveryRate}%` : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Opt-out spikes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Delivery Failure by Workspace (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.optOutSpikes.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No failure data for this period.</p>
              ) : (
                <div className="space-y-2">
                  {data.optOutSpikes.map(ws => {
                    const rate = ws.total > 0 ? Math.round((ws.optOuts / ws.total) * 100) : 0;
                    return (
                      <div key={ws.workspaceId} className="flex items-center gap-3">
                        <span className="w-32 text-sm text-foreground truncate">{ws.name}</span>
                        <div className="flex-1">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(rate, 100)}%` }} />
                          </div>
                        </div>
                        <span className="text-xs tabular-nums text-red-500 font-medium w-10 text-right">{ws.optOuts.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground w-12 text-right">{rate}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspicious Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-yellow-500" />
                Stale Invited Users (30+ days, never activated)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.suspiciousUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No stale invitations found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Invited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.suspiciousUsers.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-sm">{u.email}</TableCell>
                        <TableCell>{u.name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-[10px]">{u.role}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.wsName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Recent Audit Events (Last 24h)
              </CardTitle>
              <CardDescription>Security-relevant actions logged across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentAuditEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No audit events in the last 24 hours.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {data.recentAuditEvents.slice(0, 30).map(event => (
                    <div key={event.id} className="flex items-start gap-3 py-2.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] uppercase">{event.action}</Badge>
                          <span className="text-sm text-foreground">{event.resource}</span>
                          {event.resourceId && (
                            <span className="text-xs text-muted-foreground font-mono">{event.resourceId.slice(0, 8)}…</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{event.ipAddress}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                          </span>
                        </div>
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
