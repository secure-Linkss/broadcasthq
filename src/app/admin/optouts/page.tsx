"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Trash2, RotateCcw, Download, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface OptoutRecord {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  workspaceId: string;
  workspaceName: string | null;
  createdAt: string;
  lastActive: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  opted_out: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  blocked:   "bg-red-500/10 text-red-500 border-red-500/20",
};

const LIMIT = 20;

export default function AdminOptoutsPage() {
  const [records, setRecords]     = useState<OptoutRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState("all");
  const [page, setPage]           = useState(0);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<OptoutRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
    if (search) params.set("search", search);
    if (status !== "all") params.set("status", status);
    try {
      const res = await fetch(`/api/admin/optouts?${params}`);
      const data = await res.json();
      setRecords(data.optouts ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  const restore = async (id: string) => {
    setActioning(id);
    try {
      await fetch(`/api/admin/optouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      toast.success("Contact restored to active.");
      load();
    } catch {
      toast.error("Failed to restore contact.");
    } finally {
      setActioning(null);
    }
  };

  const remove = async (id: string) => {
    setActioning(id);
    try {
      await fetch(`/api/admin/optouts/${id}`, { method: "DELETE" });
      toast.success("Record deleted.");
      setConfirmDel(null);
      load();
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setActioning(null);
    }
  };

  const exportCsv = () => {
    const rows = ["Phone,Name,Status,Workspace,Date"];
    records.forEach(r => {
      const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";
      rows.push(`"${r.phone}","${name}","${r.status}","${r.workspaceName ?? ""}","${new Date(r.createdAt).toLocaleDateString()}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `optouts-${Date.now()}.csv` });
    a.click();
    toast.success("CSV exported.");
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ban className="h-5 w-5 text-destructive" />
            <h1 className="text-2xl font-bold tracking-tight">Opt-outs &amp; Blocked</h1>
          </div>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} contacts with restricted status across all workspaces.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search phone or name…" className="pl-9" value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="opted_out">Opted Out</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Phone</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                : records.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                        <Ban className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        No opt-outs or blocked contacts found.
                      </TableCell>
                    </TableRow>
                  )
                  : records.map(r => (
                    <TableRow key={r.id} className="border-border/50">
                      <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                      <TableCell className="text-sm">
                        {[r.firstName, r.lastName].filter(Boolean).join(" ") || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.workspaceName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                          {r.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" disabled={actioning === r.id}
                            onClick={() => restore(r.id)}
                            className="h-7 px-2 text-green-500 hover:text-green-400 hover:bg-green-500/10">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />Restore
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDel(r)}>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <Dialog open={!!confirmDel} onOpenChange={() => setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Record</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong className="text-foreground">{confirmDel?.phone}</strong>? This cannot be undone.
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
