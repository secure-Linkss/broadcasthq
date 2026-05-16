"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface AdminCampaign {
  id: string; name: string; status: string;
  recipientsCount: number; deliveryRate: number; readRate: number; failCount: number;
  sentDate: string | null; createdAt: string;
  workspaceId: string; workspaceName: string | null; workspacePlan: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-gray-500/10 text-gray-500 border-gray-500/20",
  scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  running:   "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  failed:    "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("all");
  const [page, setPage]           = useState(0);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/admin/campaigns?${params}`);
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  const exportCsv = () => {
    const rows = ["Name,Workspace,Plan,Status,Recipients,Delivery%,Read%,Fails,Sent Date"];
    campaigns.forEach(c => {
      rows.push(`"${c.name}","${c.workspaceName ?? ""}","${c.workspacePlan ?? ""}","${c.status}","${c.recipientsCount}","${c.deliveryRate.toFixed(1)}","${c.readRate.toFixed(1)}","${c.failCount}","${c.sentDate ? new Date(c.sentDate).toLocaleDateString() : ""}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `campaigns-${Date.now()}.csv`,
    });
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} campaigns across all workspaces.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={campaigns.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns…"
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Campaign</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                <TableHead className="text-right">Delivery</TableHead>
                <TableHead className="text-right">Read Rate</TableHead>
                <TableHead className="text-right">Fails</TableHead>
                <TableHead>Sent</TableHead>
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
                : campaigns.map(c => (
                    <TableRow key={c.id} className="border-border/50">
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{c.name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{c.workspaceName ?? "—"}</p>
                          {c.workspacePlan && (
                            <Badge variant="outline" className="text-xs capitalize mt-0.5">{c.workspacePlan}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[c.status] ?? ""}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{c.recipientsCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={c.deliveryRate > 80 ? "text-green-600" : c.deliveryRate > 50 ? "text-yellow-600" : "text-red-500"}>
                          {c.deliveryRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <span className={c.readRate > 30 ? "text-green-600" : "text-muted-foreground"}>
                          {c.readRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {c.failCount > 0 ? (
                          <span className="text-red-500">{c.failCount}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.sentDate ? new Date(c.sentDate).toLocaleDateString() : "—"}
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
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
