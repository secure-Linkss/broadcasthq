"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, RefreshCw, Ticket, Clock, CheckCircle2, Circle, AlertCircle,
  XCircle, Send, Loader2, ChevronRight, MessageSquare, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface AdminTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  userId: string | null;
  assignedTo: string | null;
  lastActivityAt: string;
  createdAt: string;
  user?: { name: string | null; email: string } | null;
}

interface TicketMessage {
  id: string;
  authorName: string;
  authorRole: string;
  content: string;
  isInternal: boolean;
  isSolution: boolean;
  createdAt: string;
}

interface TicketDetail {
  ticket: AdminTicket & { description: string; resolution?: string };
  messages: TicketMessage[];
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open:             { label: "Open",              className: "text-blue-500 border-blue-500/30 bg-blue-500/10" },
  in_progress:      { label: "In Progress",       className: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" },
  waiting_response: { label: "Awaiting Response", className: "text-orange-500 border-orange-500/30 bg-orange-500/10" },
  resolved:         { label: "Resolved",          className: "text-green-500 border-green-500/30 bg-green-500/10" },
  closed:           { label: "Closed",            className: "text-muted-foreground border-border bg-muted/30" },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-muted-foreground", medium: "text-blue-500", high: "text-orange-500", urgent: "text-red-500",
};

export default function AdminTicketsPage() {
  const [tickets, setTickets]     = useState<AdminTicket[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState("all");
  const [priorityFilter, setPriority] = useState("all");
  const [q, setQ]                 = useState("");
  const [detail, setDetail]       = useState<TicketDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reply, setReply]         = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSolution, setIsSolution] = useState(false);
  const [sending, setSending]     = useState(false);
  const [updating, setUpdating]   = useState(false);

  const [stats, setStats]         = useState<Record<string, number>>({});

  async function loadStats() {
    const res = await fetch("/api/support/stats");
    if (res.ok) { const d = await res.json(); setStats(d.stats ?? {}); }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all")   params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (q.trim())                 params.set("q", q.trim());
      const res = await fetch(`/api/admin/tickets?${params}`);
      if (res.ok) { const d = await res.json(); setTickets(d.tickets); setTotal(d.total); }
    } finally { setLoading(false); }
  }, [statusFilter, priorityFilter, q]);

  useEffect(() => { load(); loadStats(); }, [load]);

  async function openDetail(ticket: AdminTicket) {
    const res = await fetch(`/api/admin/tickets/${ticket.id}`);
    if (res.ok) {
      const data = await res.json();
      setDetail(data);
      setDetailOpen(true);
    } else { toast.error("Failed to load ticket"); }
  }

  async function sendReply() {
    if (!detail || !reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${detail.ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply, isInternal, isSolution }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to send"); return; }
      toast.success(isInternal ? "Internal note added" : "Reply sent");
      setDetail(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev);
      setReply(""); setIsInternal(false); setIsSolution(false);
      load();
    } finally { setSending(false); }
  }

  async function updateStatus(ticketId: string, status: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Failed to update status"); return; }
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label ?? status}`);
      setDetail(prev => prev ? { ...prev, ticket: { ...prev.ticket, status } } : prev);
      load(); loadStats();
    } finally { setUpdating(false); }
  }

  async function updatePriority(ticketId: string, priority: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      });
      if (!res.ok) { toast.error("Failed to update priority"); return; }
      toast.success("Priority updated");
      setDetail(prev => prev ? { ...prev, ticket: { ...prev.ticket, priority } } : prev);
      load();
    } finally { setUpdating(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground">Manage and resolve user support requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total",       value: stats.total ?? 0,       color: "" },
          { label: "Open",        value: stats.open ?? 0,        color: "text-blue-500" },
          { label: "In Progress", value: stats.in_progress ?? 0, color: "text-yellow-500" },
          { label: "Resolved",    value: stats.resolved ?? 0,    color: "text-green-500" },
          { label: "Urgent",      value: stats.urgent ?? 0,      color: "text-red-500" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tickets..." className="pl-9" value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && load()} />
            </div>
            <Select value={statusFilter} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriority}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">{total} ticket{total !== 1 ? "s" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map(t => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openDetail(t)}>
                    <TableCell className="font-mono text-xs">{t.ticketNumber}</TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-sm font-medium">{t.subject}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.user ? (t.user.name ?? t.user.email) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG[t.status]?.className)}>
                        {STATUS_CONFIG[t.status]?.label ?? t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-xs capitalize font-medium", PRIORITY_COLOR[t.priority])}>
                        {t.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{t.category.replace("_", " ")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(t.lastActivityAt ?? t.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">{detail.ticket.ticketNumber}</span>
                  <span className="flex-1 text-base">{detail.ticket.subject}</span>
                </DialogTitle>
              </DialogHeader>

              {/* Controls */}
              <div className="flex flex-wrap gap-2 pb-2 border-b">
                <Select value={detail.ticket.status} onValueChange={v => updateStatus(detail.ticket.id, v)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={detail.ticket.priority} onValueChange={v => updatePriority(detail.ticket.id, v)}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                {detail.ticket.user && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                    From: <span className="font-medium text-foreground">
                      {detail.ticket.user.name ?? detail.ticket.user.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Thread */}
              <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[200px] max-h-[350px]">
                {detail.messages.map(msg => {
                  const isAdmin = ['super_admin', 'admin', 'owner'].includes(msg.authorRole);
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isAdmin ? "flex-row-reverse" : "")}>
                      <div className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        isAdmin ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {msg.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        isAdmin ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm",
                        msg.isInternal && "ring-1 ring-yellow-500/50 opacity-80",
                        msg.isSolution && "ring-2 ring-green-500"
                      )}>
                        {msg.isInternal && <p className="text-[10px] text-yellow-400 mb-0.5 font-medium">Internal Note</p>}
                        {msg.isSolution && <p className="text-[10px] text-green-400 mb-0.5 font-medium">✓ Solution</p>}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={cn("text-[10px] mt-1 opacity-70")}>
                          {msg.authorName} · {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply */}
              <div className="border-t pt-3 space-y-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)}
                        className="rounded" />
                      Internal note
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={isSolution} onChange={e => setIsSolution(e.target.checked)}
                        className="rounded" />
                      Mark as solution
                    </label>
                  </div>
                  <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()} className="gap-1.5">
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {isInternal ? "Add Note" : "Send Reply"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
