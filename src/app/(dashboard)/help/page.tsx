"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen, MessageSquare, Zap, Shield, BarChart3, ChevronRight,
  ExternalLink, Search, HelpCircle, Mail, FileText, Plus, Ticket,
  Clock, CheckCircle2, AlertCircle, XCircle, Loader2, Send,
  RefreshCw, ArrowLeft, Circle, Tag,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  lastActivityAt: string;
  createdAt: string;
  resolvedAt?: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    icon: Zap, title: "Getting Started", color: "text-yellow-500",
    desc: "Set up your workspace, connect WhatsApp Business, and send your first campaign.",
    articles: ["Connecting WhatsApp Business API", "Creating your first campaign", "Importing contacts", "Template approval guide"],
  },
  {
    icon: MessageSquare, title: "Campaigns", color: "text-primary",
    desc: "Build, schedule, and monitor broadcast campaigns at scale.",
    articles: ["Campaign types explained", "Scheduling & time zones", "Audience segmentation", "A/B testing messages"],
  },
  {
    icon: BarChart3, title: "Analytics", color: "text-green-500",
    desc: "Understand delivery rates, read rates, and campaign performance.",
    articles: ["Reading your analytics dashboard", "Delivery vs read rates", "Exporting reports", "Setting up custom date ranges"],
  },
  {
    icon: Shield, title: "Compliance & Security", color: "text-red-500",
    desc: "Stay compliant with WhatsApp policies and protect your sender reputation.",
    articles: ["WhatsApp Business Policy overview", "Opt-out management", "Rate limits & best practices", "GDPR compliance guide"],
  },
];

const FAQS = [
  { q: "How many messages can I send per day?", a: "Limits depend on your WhatsApp Business API tier. New accounts start at 1,000 conversations/day and scale up based on quality rating." },
  { q: "Can contacts reply to broadcast messages?", a: "Yes — replies appear in your Inbox. You have a 24-hour window to respond after a customer initiates contact." },
  { q: "What happens when a contact opts out?", a: "They are automatically excluded from all future campaigns. Their record is moved to Opt-outs and cannot be re-added without their explicit consent." },
  { q: "How do I get my templates approved?", a: "Submit templates via Settings → WhatsApp → Templates. Meta reviews within 24-48 hours. Avoid promotional language in utility templates." },
  { q: "Is there a free trial?", a: "Yes — every new workspace gets 14 days on the Pro plan with no credit card required." },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.FC<any>; className: string }> = {
  open:             { label: "Open",              icon: Circle,       className: "text-blue-500 border-blue-500/30 bg-blue-500/10" },
  in_progress:      { label: "In Progress",       icon: Clock,        className: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" },
  waiting_response: { label: "Awaiting Response", icon: AlertCircle,  className: "text-orange-500 border-orange-500/30 bg-orange-500/10" },
  resolved:         { label: "Resolved",          icon: CheckCircle2, className: "text-green-500 border-green-500/30 bg-green-500/10" },
  closed:           { label: "Closed",            icon: XCircle,      className: "text-muted-foreground border-border bg-muted/30" },
};

const PRIORITY_COLOR: Record<string, string> = {
  low:    "text-muted-foreground",
  medium: "text-blue-500",
  high:   "text-orange-500",
  urgent: "text-red-500",
};

// ─── Helper: support online indicator ─────────────────────────────────────────

function isSupportOnline() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay  = now.getUTCDay(); // 0=Sun
  return utcDay >= 1 && utcDay <= 5 && utcHour >= 9 && utcHour < 18;
}

// ─── New Ticket Dialog ────────────────────────────────────────────────────────

function NewTicketDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [subject, setSubject]   = useState("");
  const [desc, setDesc]         = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description: desc, category, priority }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create ticket"); return; }
      toast.success(`Ticket ${data.ticket.ticketNumber} created`);
      setOpen(false);
      setSubject(""); setDesc(""); setCategory("general"); setPriority("medium");
      onCreated();
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Ticket</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input placeholder="Brief description of your issue" value={subject}
              onChange={e => setSubject(e.target.value)} required minLength={5} maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="bug_report">Bug Report</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, or screenshots."
              value={desc} onChange={e => setDesc(e.target.value)}
              required minLength={10} maxLength={5000} rows={5}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ticket Thread ─────────────────────────────────────────────────────────────

function TicketThread({ ticket, onBack }: { ticket: Ticket; onBack: () => void }) {
  const [messages, setMessages]   = useState<TicketMessage[]>([]);
  const [reply, setReply]         = useState("");
  const [sending, setSending]     = useState(false);
  const [rating, setRating]       = useState<number | null>(null);
  const [ratingDone, setRatingDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const res = await fetch(`/api/support/tickets/${ticket.id}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }

  useEffect(() => { loadMessages(); }, [ticket.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to send"); return; }
      setReply("");
      setMessages(prev => [...prev, data.message]);
    } catch { toast.error("Network error"); }
    finally { setSending(false); }
  }

  async function submitRating(r: number) {
    setRating(r);
    await fetch(`/api/support/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ satisfactionRating: r }),
    });
    setRatingDone(true);
    toast.success("Thank you for your feedback!");
  }

  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
  const StatusIcon = statusCfg.icon;
  const canReply = !['closed'].includes(ticket.status);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base truncate">{ticket.subject}</h3>
            <Badge variant="outline" className={cn("text-xs gap-1", statusCfg.className)}>
              <StatusIcon className="h-3 w-3" /> {statusCfg.label}
            </Badge>
            <Badge variant="outline" className={cn("text-xs capitalize", PRIORITY_COLOR[ticket.priority])}>
              {ticket.priority}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ticket.ticketNumber} · {format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}
          </p>
        </div>
      </div>

      {/* Thread */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[450px] overflow-y-auto p-4 space-y-4">
            {messages.map(msg => {
              const isAdmin = ['super_admin', 'admin', 'owner'].includes(msg.authorRole);
              return (
                <div key={msg.id} className={cn("flex gap-3", isAdmin ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isAdmin ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {msg.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div className={cn("max-w-[75%] space-y-1", isAdmin ? "items-end" : "items-start")}>
                    <div className={cn(
                      "rounded-2xl px-4 py-3 text-sm",
                      isAdmin
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm",
                      msg.isSolution && "ring-2 ring-green-500"
                    )}>
                      {msg.isSolution && (
                        <div className="flex items-center gap-1 text-xs text-green-400 mb-1 font-medium">
                          <CheckCircle2 className="h-3 w-3" /> Solution
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <div className={cn("flex items-center gap-1 px-1", isAdmin ? "flex-row-reverse" : "")}>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {isAdmin ? "Support" : msg.authorName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          {canReply ? (
            <form onSubmit={sendReply} className="border-t p-4 flex gap-2">
              <Input
                placeholder="Type your reply..."
                value={reply}
                onChange={e => setReply(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={sending || !reply.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          ) : (
            <div className="border-t p-4 text-center text-sm text-muted-foreground">
              This ticket is closed. <NewTicketDialog onCreated={() => {}} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating */}
      {ticket.status === 'resolved' && !ratingDone && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">How satisfied are you with the resolution?</p>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(r => (
                <button key={r} onClick={() => submitRating(r)}
                  className={cn(
                    "text-2xl transition-transform hover:scale-110",
                    rating === r ? "scale-125" : ""
                  )}>
                  {r <= 2 ? "😞" : r === 3 ? "😐" : r === 4 ? "😊" : "🤩"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tickets List ─────────────────────────────────────────────────────────────

function TicketsList() {
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [selected, setSelected]   = useState<Ticket | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/support/tickets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        setTotal(data.total);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  if (selected) return <TicketThread ticket={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", "open", "in_progress", "waiting_response", "resolved", "closed"].map(s => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)} className="capitalize text-xs">
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label ?? s}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <NewTicketDialog onCreated={load} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">No tickets found.</p>
          <NewTicketDialog onCreated={load} />
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => {
            const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={ticket.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm"
                onClick={() => setSelected(ticket)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-muted-foreground font-mono">{ticket.ticketNumber}</span>
                        <Badge variant="outline" className={cn("text-[11px] gap-1 py-0", statusCfg.className)}>
                          <StatusIcon className="h-3 w-3" /> {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[11px] capitalize py-0", PRIORITY_COLOR[ticket.priority])}>
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline" className="text-[11px] capitalize py-0">{ticket.category}</Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last activity {formatDistanceToNow(new Date(ticket.lastActivityAt ?? ticket.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">{total} ticket{total !== 1 ? "s" : ""} total</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const online = isSupportOnline();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [helpSearch, setHelpSearch] = useState("");

  useEffect(() => {
    fetch("/api/support/stats")
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Help Center</h2>
          <p className="text-muted-foreground mt-1">Documentation, guides, and support tickets.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", online ? "bg-green-500 animate-pulse" : "bg-muted-foreground")} />
          <span className="text-xs text-muted-foreground">
            Support {online ? "online now" : "offline — leaves a ticket"}
          </span>
        </div>
      </div>

      {/* Stats bar for users who have tickets */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Open",       value: stats.open,        color: "text-blue-500"   },
            { label: "In Progress",value: stats.in_progress, color: "text-yellow-500" },
            { label: "Resolved",   value: stats.resolved,    color: "text-green-500"  },
            { label: "Total",      value: stats.total,       color: "text-foreground" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="help">
        <TabsList className="grid w-full grid-cols-3 max-w-sm">
          <TabsTrigger value="help">Help Center</TabsTrigger>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>

        {/* ── Help Center tab ── */}
        <TabsContent value="help" className="space-y-6 pt-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              className="pl-9 h-11 bg-background"
              value={helpSearch}
              onChange={e => setHelpSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {CATEGORIES.filter(cat => !helpSearch || cat.title.toLowerCase().includes(helpSearch.toLowerCase()) || cat.articles.some(a => a.toLowerCase().includes(helpSearch.toLowerCase()))).map(cat => (
              <Card key={cat.title} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <cat.icon className={`h-5 w-5 ${cat.color}`} />
                    {cat.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{cat.desc}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {cat.articles.map(a => (
                      <li key={a}>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left py-0.5">
                          <ChevronRight className="h-3 w-3 shrink-0" /> {a}
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {FAQS.filter(faq => !helpSearch || faq.q.toLowerCase().includes(helpSearch.toLowerCase()) || faq.a.toLowerCase().includes(helpSearch.toLowerCase())).map(faq => (
                <Card key={faq.q}>
                  <CardContent className="p-4">
                    <p className="font-medium text-sm mb-1">{faq.q}</p>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── My Tickets tab ── */}
        <TabsContent value="tickets" className="pt-4">
          <TicketsList />
        </TabsContent>

        {/* ── Contact tab ── */}
        <TabsContent value="contact" className="pt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <div className="relative inline-block">
                  <MessageSquare className="h-8 w-8 mx-auto text-primary opacity-80" />
                  <div className={cn(
                    "absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-background",
                    online ? "bg-green-500" : "bg-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="font-medium">Support Chat</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {online ? "We're online now!" : "Currently offline — Mon–Fri 9am–6pm UTC"}
                  </p>
                </div>
                <NewTicketDialog onCreated={() => {}} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <Mail className="h-8 w-8 mx-auto text-blue-500 opacity-80" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-xs text-muted-foreground mt-1">Response within 24 hours on weekdays</p>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  support@broadcasthq.app
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center space-y-3">
                <FileText className="h-8 w-8 mx-auto text-yellow-500 opacity-80" />
                <div>
                  <p className="font-medium">Documentation</p>
                  <p className="text-xs text-muted-foreground mt-1">API reference, guides & tutorials</p>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-1">
                  docs.broadcasthq.app <ExternalLink className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* System status */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">All systems operational</span>
              <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 text-xs">Healthy</Badge>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Status page <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
