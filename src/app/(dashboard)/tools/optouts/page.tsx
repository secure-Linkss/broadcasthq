"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Download, Ban, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";

interface OptoutRecord {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  createdAt: string;
  lastActive: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  opted_out: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  blocked:   "bg-red-500/10 text-red-500 border-red-500/20",
};

const LIMIT = 20;

export default function ToolsOptoutsPage() {
  const { data: session } = useSession();
  const [records, setRecords] = useState<OptoutRecord[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(0);

  const workspaceId = (session?.user as any)?.workspaceId as string | undefined;

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const params = new URLSearchParams({
      workspaceId,
      limit: String(LIMIT),
      offset: String(page * LIMIT),
    });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/contacts/optouts?${params}`);
      const data = await res.json();
      setRecords(data.optouts ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load opt-out list.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, search, page]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const rows = ["Phone,Name,Status,Date"];
    records.forEach(r => {
      const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";
      rows.push(`"${r.phone}","${name}","${r.status}","${new Date(r.createdAt).toLocaleDateString()}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `optouts-${Date.now()}.csv`,
    });
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
          <p className="text-muted-foreground text-sm">
            {total.toLocaleString()} contacts with restricted status in your workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-primary/5">
        <CardContent className="p-4 flex gap-3 items-start">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">What's shown here?</p>
            <p>Contacts who replied <strong>STOP</strong> (opted out) or were manually blocked. These numbers are automatically excluded from all future campaigns. To re-enable a contact, go to <strong>Contacts</strong> and update their status.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search phone or name…"
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
                <TableHead>Phone</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : records.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                        <Ban className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        No opt-outs or blocked contacts found.
                      </TableCell>
                    </TableRow>
                  )
                  : records.map(r => (
                    <TableRow key={r.id} className="border-border/50">
                      <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                      <TableCell className="text-sm">
                        {[r.firstName, r.lastName].filter(Boolean).join(" ") || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                          {r.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.lastActive ? new Date(r.lastActive).toLocaleDateString() : "—"}
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
