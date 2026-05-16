"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Search, RefreshCw, Trash2, Plus, Bot, Shield, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface BotBlock {
  id: string;
  pattern: string;
  type: string;
  reason: string | null;
  isGlobal: boolean;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  phone:   "bg-blue-500/10 text-blue-500 border-blue-500/20",
  keyword: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  regex:   "bg-orange-500/10 text-orange-500 border-orange-500/20",
  ip:      "bg-red-500/10 text-red-500 border-red-500/20",
};

const LIMIT = 20;

export default function AdminBotBlocksPage() {
  const [blocks, setBlocks]       = useState<BotBlock[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage]           = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDel, setConfirmDel] = useState<BotBlock | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [form, setForm] = useState({ pattern: "", type: "phone", reason: "", isGlobal: false });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    try {
      const res = await fetch(`/api/admin/bot-blocks?${params}`);
      const data = await res.json();
      setBlocks(data.blocks ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load bot blocks.");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.pattern.trim()) { toast.error("Pattern is required."); return; }
    setActioning("create");
    try {
      const res = await fetch("/api/admin/bot-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Bot block created.");
      setShowCreate(false);
      setForm({ pattern: "", type: "phone", reason: "", isGlobal: false });
      load();
    } catch {
      toast.error("Failed to create bot block.");
    } finally {
      setActioning(null);
    }
  };

  const remove = async (id: string) => {
    setActioning(id);
    try {
      await fetch(`/api/admin/bot-blocks/${id}`, { method: "DELETE" });
      toast.success("Bot block removed.");
      setConfirmDel(null);
      load();
    } catch {
      toast.error("Failed to delete.");
    } finally {
      setActioning(null);
    }
  };

  const exportCsv = () => {
    const rows = ["Pattern,Type,Global,Hits,Reason,Created"];
    blocks.forEach(b => {
      rows.push(`"${b.pattern}","${b.type}","${b.isGlobal}","${b.hitCount}","${b.reason ?? ""}","${new Date(b.createdAt).toLocaleDateString()}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `bot-blocks-${Date.now()}.csv`,
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
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Bot Blocks</h1>
          </div>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} blocked patterns (phones, keywords, IPs, regex).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Block</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Blocks",  value: total,                              color: "text-foreground" },
          { label: "Global Blocks", value: blocks.filter(b => b.isGlobal).length, color: "text-red-500" },
          { label: "Total Hits",    value: blocks.reduce((s, b) => s + b.hitCount, 0), color: "text-orange-500" },
          { label: "Regex Rules",   value: blocks.filter(b => b.type === "regex").length, color: "text-purple-500" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pattern or reason…"
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="keyword">Keyword</SelectItem>
              <SelectItem value="regex">Regex</SelectItem>
              <SelectItem value="ip">IP Address</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Pattern</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Hits</TableHead>
                <TableHead>Last Hit</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added</TableHead>
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
                : blocks.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                        <Shield className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        No bot blocks configured.
                      </TableCell>
                    </TableRow>
                  )
                  : blocks.map(b => (
                    <TableRow key={b.id} className="border-border/50">
                      <TableCell className="font-mono text-xs max-w-[160px] truncate">{b.pattern}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${TYPE_COLORS[b.type] ?? ""}`}>
                          {b.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={b.isGlobal ? "text-xs bg-red-500/10 text-red-500 border-red-500/20" : "text-xs text-muted-foreground"}>
                          {b.isGlobal ? "Global" : "Workspace"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {b.hitCount > 0 ? <span className="text-orange-500">{b.hitCount}</span> : "0"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.lastHitAt ? new Date(b.lastHitAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                        {b.reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDel(b)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bot Block</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Number</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="regex">Regex Pattern</SelectItem>
                  <SelectItem value="ip">IP Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pattern</Label>
              <Input
                placeholder={form.type === "phone" ? "+14155552671" : form.type === "regex" ? "^spam.*" : "spam keyword"}
                value={form.pattern}
                onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Why is this pattern blocked?"
                rows={2}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isGlobal}
                onCheckedChange={v => setForm(f => ({ ...f, isGlobal: v }))}
              />
              <div>
                <p className="text-sm font-medium">Global block</p>
                <p className="text-xs text-muted-foreground">Applies across all workspaces</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={create} disabled={actioning === "create"}>Create Block</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDel} onOpenChange={() => setConfirmDel(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Block</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove block for <strong className="text-foreground font-mono">{confirmDel?.pattern}</strong>? This will allow matching traffic again.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Button>
            <Button variant="destructive" disabled={actioning === confirmDel?.id}
              onClick={() => confirmDel && remove(confirmDel.id)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
