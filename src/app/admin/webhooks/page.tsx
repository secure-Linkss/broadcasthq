"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Trash2, Plus, Webhook, CheckCircle2, XCircle, AlertCircle, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface WebhookRecord {
  id: string;
  workspaceId: string;
  workspaceName: string | null;
  name: string;
  url: string;
  isActive: boolean;
  failCount: number;
  lastTriggeredAt: string | null;
  lastStatus: number | null;
  events: string[];
  createdAt: string;
}

const LIMIT = 20;

function StatusIcon({ status, failCount }: { status: number | null; failCount: number }) {
  if (!status) return <span className="text-muted-foreground/30 text-xs">—</span>;
  if (failCount > 5) return <XCircle className="h-4 w-4 text-red-500" />;
  if (status >= 200 && status < 300) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status >= 400) return <XCircle className="h-4 w-4 text-red-500" />;
  return <AlertCircle className="h-4 w-4 text-yellow-500" />;
}

export default function AdminWebhooksPage() {
  const [webhooks, setWebhooks]   = useState<WebhookRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(0);
  const [confirmDel, setConfirmDel] = useState<WebhookRecord | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<WebhookRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/admin/webhooks?${params}`);
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load webhooks.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    setActioning(id);
    try {
      await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE" });
      toast.success("Webhook deleted.");
      setConfirmDel(null);
      load();
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setActioning(null);
    }
  };

  const toggleActive = async (wh: WebhookRecord) => {
    setActioning(wh.id);
    try {
      await fetch(`/api/admin/webhooks/${wh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !wh.isActive }),
      });
      toast.success(wh.isActive ? "Webhook disabled." : "Webhook enabled.");
      load();
    } catch {
      toast.error("Failed to update.");
    } finally {
      setActioning(null);
    }
  };

  const exportCsv = () => {
    const rows = ["Name,Workspace,URL,Active,Fails,Last Status,Created"];
    webhooks.forEach(w => {
      rows.push(`"${w.name}","${w.workspaceName ?? ""}","${w.url}","${w.isActive}","${w.failCount}","${w.lastStatus ?? ""}","${new Date(w.createdAt).toLocaleDateString()}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `webhooks-${Date.now()}.csv`,
    });
    a.click();
    toast.success("CSV exported.");
  };

  const totalPages = Math.ceil(total / LIMIT);
  const failingCount = webhooks.filter(w => w.failCount > 5).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Webhook className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          </div>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} webhook endpoints across all workspaces.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: total,                                      color: "text-foreground" },
          { label: "Active",  value: webhooks.filter(w => w.isActive).length,    color: "text-green-500"  },
          { label: "Failing", value: failingCount,                               color: "text-red-500"    },
          { label: "Disabled",value: webhooks.filter(w => !w.isActive).length,   color: "text-muted-foreground" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or URL…"
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Name</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Fails</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : webhooks.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                        <Webhook className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        No webhooks found.
                      </TableCell>
                    </TableRow>
                  )
                  : webhooks.map(w => (
                    <TableRow key={w.id} className="border-border/50">
                      <TableCell className="font-medium text-sm">{w.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{w.workspaceName ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">{w.url}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(w.events ?? []).slice(0, 2).map(e => (
                            <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                          ))}
                          {(w.events ?? []).length > 2 && (
                            <Badge variant="outline" className="text-xs">+{w.events.length - 2}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon status={w.lastStatus} failCount={w.failCount} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {w.failCount > 0 ? <span className="text-red-500 font-medium">{w.failCount}</span> : "0"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {w.lastTriggeredAt ? new Date(w.lastTriggeredAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actioning === w.id}
                            onClick={() => toggleActive(w)}
                            className={`h-7 px-2 text-xs ${w.isActive ? "text-muted-foreground" : "text-green-500 hover:text-green-400"}`}
                          >
                            {w.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary hover:text-primary"
                            onClick={() => setShowDetail(w)}
                          >
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDel(w)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Webhook Details</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs mb-0.5">Name</p><p className="font-medium">{showDetail.name}</p></div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Workspace</p><p className="font-medium">{showDetail.workspaceName ?? "—"}</p></div>
              </div>
              <div><p className="text-muted-foreground text-xs mb-0.5">URL</p><p className="font-mono text-xs break-all">{showDetail.url}</p></div>
              <div><p className="text-muted-foreground text-xs mb-0.5">Events</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {showDetail.events.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-muted-foreground text-xs mb-0.5">Status</p><p>{showDetail.isActive ? <span className="text-green-500">Active</span> : <span className="text-muted-foreground">Disabled</span>}</p></div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Fail Count</p><p className={showDetail.failCount > 0 ? "text-red-500 font-bold" : ""}>{showDetail.failCount}</p></div>
                <div><p className="text-muted-foreground text-xs mb-0.5">Last HTTP</p><p>{showDetail.lastStatus ?? "—"}</p></div>
              </div>
              <div><p className="text-muted-foreground text-xs mb-0.5">Last Triggered</p><p>{showDetail.lastTriggeredAt ? new Date(showDetail.lastTriggeredAt).toLocaleString() : "Never"}</p></div>
              <div><p className="text-muted-foreground text-xs mb-0.5">Created</p><p>{new Date(showDetail.createdAt).toLocaleString()}</p></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDel} onOpenChange={() => setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Webhook</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong className="text-foreground">{confirmDel?.name}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" disabled={actioning === confirmDel?.id}
              onClick={() => confirmDel && remove(confirmDel.id)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
