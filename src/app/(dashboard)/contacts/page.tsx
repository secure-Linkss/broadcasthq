"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Contact, EngagementTier } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Upload,
  Download,
  MoreHorizontal,
  User,
  Mail,
  Tag,
  Phone,
  ChevronDown,
  Star,
  Zap,
  Flame,
  Snowflake,
  Activity,
  AlertTriangle,
  Trash2,
  RefreshCw,
  HeartPulse,
  SlidersHorizontal,
  Globe,
  MapPin,
  MessageSquare,
  Eye,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { getTierConfig, getAllTiers } from "@/lib/engagement";

// ─── Tier badge helper ────────────────────────────────────────────────────────

const TIER_ICONS: Record<EngagementTier, React.ReactNode> = {
  vip:      <Star className="h-3 w-3" />,
  active:   <Zap className="h-3 w-3" />,
  warm:     <Flame className="h-3 w-3" />,
  cold:     <Snowflake className="h-3 w-3" />,
  inactive: <Activity className="h-3 w-3" />,
};

const TIER_STYLES: Record<EngagementTier, string> = {
  vip:      "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  active:   "bg-green-500/15 text-green-500 border-green-500/30",
  warm:     "bg-blue-500/15 text-blue-500 border-blue-500/30",
  cold:     "bg-slate-400/15 text-slate-400 border-slate-400/30",
  inactive: "bg-red-500/15 text-red-500 border-red-500/30",
};

function TierBadge({ tier }: { tier?: EngagementTier }) {
  if (!tier) return null;
  const cfg = getTierConfig(tier);
  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[10px] px-1.5 py-0 font-medium ${TIER_STYLES[tier]}`}
    >
      {TIER_ICONS[tier]}
      {cfg.label}
    </Badge>
  );
}

function ScoreBar({ score = 0 }: { score?: number }) {
  const color =
    score >= 80 ? "bg-yellow-500" :
    score >= 60 ? "bg-green-500"  :
    score >= 35 ? "bg-blue-500"   :
    score >= 15 ? "bg-slate-400"  : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-muted-foreground w-6 text-right">{score}</span>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    "bg-success/20 text-success border-success/20",
    opted_out: "bg-warning/20 text-warning border-warning/20",
    bounced:   "bg-destructive/20 text-destructive border-destructive/20",
    unverified:"bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-[10px] ${styles[status] ?? styles.unverified}`}>
      {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}

// ─── Contact Detail Sheet ─────────────────────────────────────────────────────

function ContactDetailSheet({
  contact,
  open,
  onClose,
}: {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!contact) return null;
  const tier = contact.engagementTier ?? "cold";
  const cfg = getTierConfig(tier as EngagementTier);
  const readRate = contact.totalMessagesReceived
    ? Math.round(((contact.totalMessagesRead ?? 0) / contact.totalMessagesReceived) * 100)
    : 0;
  const replyRate = contact.totalMessagesReceived
    ? Math.round(((contact.totalReplies ?? 0) / contact.totalMessagesReceived) * 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
              {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">
                {contact.firstName} {contact.lastName}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Phone className="h-3 w-3" />
                {contact.phone}
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2">
                <TierBadge tier={contact.engagementTier} />
                <StatusBadge status={contact.status} />
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {/* Engagement stats */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Engagement Intelligence
              </h4>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">{contact.totalMessagesReceived ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Received</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">{contact.totalMessagesRead ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Read</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">{contact.totalReplies ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Replied</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Eye className="h-3 w-3" /> Read rate</span>
                  <span className="font-medium">{readRate}%</span>
                </div>
                <Progress value={readRate} className="h-1.5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><MessageSquare className="h-3 w-3" /> Reply rate</span>
                  <span className="font-medium">{replyRate}%</span>
                </div>
                <Progress value={replyRate} className="h-1.5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="h-3 w-3" /> Engagement score</span>
                  <span className="font-medium">{contact.engagementScore ?? 0}/100</span>
                </div>
                <Progress value={contact.engagementScore ?? 0} className="h-1.5" />
              </div>
              <p className="text-xs text-muted-foreground mt-3 p-2.5 bg-muted/40 rounded-md">{cfg.description}</p>
            </div>

            <Separator />

            {/* Contact info */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Contact Details
              </h4>
              <div className="space-y-2.5">
                {contact.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{contact.email}</span>
                  </div>
                )}
                {(contact.city || contact.country) && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{[contact.city, contact.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {contact.lastEngagedAt && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Last engaged {formatDistanceToNow(new Date(contact.lastEngagedAt), { addSuffix: true })}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Added {format(new Date(contact.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>

            {contact.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.map(t => (
                      <span key={t} className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-sm">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {Object.keys(contact.customFields).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3">Custom Fields</h4>
                  <div className="space-y-1.5">
                    {Object.entries(contact.customFields).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button className="flex-1" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" /> Send Message
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <User className="mr-2 h-4 w-4" /> Edit Contact
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── List Health Sheet ────────────────────────────────────────────────────────

function ListHealthSheet({
  contacts,
  open,
  onClose,
}: {
  contacts: Contact[];
  open: boolean;
  onClose: () => void;
}) {
  const total = contacts.length;
  const active = contacts.filter(c => c.status === "active").length;
  const bounced = contacts.filter(c => c.status === "bounced").length;
  const optedOut = contacts.filter(c => c.status === "opted_out").length;
  const inactive = contacts.filter(c => c.engagementTier === "inactive").length;
  const cold = contacts.filter(c => c.engagementTier === "cold").length;
  const vip = contacts.filter(c => c.engagementTier === "vip").length;
  const healthPct = total ? Math.round((active / total) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            List Health Report
          </SheetTitle>
          <SheetDescription>
            Audience quality analysis and cleanup recommendations
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-6">
            {/* Overall health */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Overall List Health</span>
                <span className={`text-2xl font-bold ${healthPct >= 80 ? "text-green-500" : healthPct >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                  {healthPct}%
                </span>
              </div>
              <Progress value={healthPct} className="h-2.5" />
              <p className="text-xs text-muted-foreground mt-2">
                {healthPct >= 80 ? "Excellent — your list is in great shape" :
                 healthPct >= 60 ? "Good — some cleanup recommended" :
                 "Needs attention — clean list for better deliverability"}
              </p>
            </div>

            {/* Status breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Status Breakdown</h4>
              <div className="space-y-2">
                {[
                  { label: "Active", count: active, total, color: "bg-green-500", pct: total ? Math.round((active/total)*100) : 0 },
                  { label: "Opted Out", count: optedOut, total, color: "bg-yellow-500", pct: total ? Math.round((optedOut/total)*100) : 0 },
                  { label: "Bounced", count: bounced, total, color: "bg-red-500", pct: total ? Math.round((bounced/total)*100) : 0 },
                ].map(({ label, count, color, pct }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                    <span className="text-muted-foreground flex-1">{label}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                    <span className="text-muted-foreground text-xs w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Engagement breakdown */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Engagement Segments</h4>
              <div className="space-y-2">
                {getAllTiers().map(({ tier, config }) => {
                  const count = contacts.filter(c => c.engagementTier === tier).length;
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={tier} className="flex items-center gap-3 text-sm">
                      <span className={`text-xs ${config.color} shrink-0`}>{TIER_ICONS[tier as EngagementTier]}</span>
                      <span className="text-muted-foreground flex-1">{config.label}</span>
                      <span className="font-medium tabular-nums">{count}</span>
                      <span className="text-muted-foreground text-xs w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Recommendations
              </h4>
              <div className="space-y-2.5">
                {bounced > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
                    <Trash2 className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-500">Remove {bounced} bounced contacts</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Bounced contacts hurt deliverability scores</p>
                    </div>
                  </div>
                )}
                {inactive > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                    <RefreshCw className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-500">Re-engage {inactive} inactive contacts</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Send a win-back campaign to boost engagement</p>
                    </div>
                  </div>
                )}
                {vip > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                    <Star className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-500">{vip} VIP contacts deserve priority</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Create an exclusive campaign for your top engagers</p>
                    </div>
                  </div>
                )}
                {cold > inactive && (
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                    <Snowflake className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-500">{cold} cold contacts to nurture</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Warm them up with a targeted nurture sequence</p>
                    </div>
                  </div>
                )}
                {bounced === 0 && inactive === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                    <Activity className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-500">Your list looks healthy!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Keep it up — consistent engagement drives results</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
          <Button className="flex-1" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" /> Run Cleanup
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TIER_FILTERS: { label: string; value: EngagementTier | "all" }[] = [
  { label: "All", value: "all" },
  { label: "VIP", value: "vip" },
  { label: "Active", value: "active" },
  { label: "Warm", value: "warm" },
  { label: "Cold", value: "cold" },
  { label: "Inactive", value: "inactive" },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<EngagementTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    api.contacts.list().then((res) => {
      setContacts(res);
      setIsLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (tierFilter !== "all" && c.engagementTier !== tierFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.toLowerCase();
        if (!name.includes(q) && !c.phone.includes(q) && !c.email?.toLowerCase().includes(q) && !c.tags.some(t => t.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [contacts, tierFilter, statusFilter, search]);

  // Health summary stats
  const totalActive = contacts.filter(c => c.status === "active").length;
  const totalOptedOut = contacts.filter(c => c.status === "opted_out").length;
  const totalBounced = contacts.filter(c => c.status === "bounced").length;
  const totalInactive = contacts.filter(c => c.engagementTier === "inactive").length;

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const exportContacts = (ids?: string[]) => {
    const params = new URLSearchParams();
    if (ids?.length) {
      params.set('ids', ids.join(','));
    } else {
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (tierFilter !== 'all')   params.set('tier', tierFilter);
    }
    const url = `/api/contacts/export?${params.toString()}`;
    const a   = Object.assign(document.createElement('a'), { href: url });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contacts</h2>
          <p className="text-muted-foreground">
            {contacts.length.toLocaleString()} contacts · Manage audience, segments, and engagement
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/contacts/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Health summary cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active", value: totalActive, icon: <Activity className="h-4 w-4" />, color: "text-green-500", bg: "bg-green-500/10" },
            { label: "Opted Out", value: totalOptedOut, icon: <AlertTriangle className="h-4 w-4" />, color: "text-yellow-500", bg: "bg-yellow-500/10" },
            { label: "Bounced", value: totalBounced, icon: <Trash2 className="h-4 w-4" />, color: "text-red-500", bg: "bg-red-500/10" },
            { label: "Inactive", value: totalInactive, icon: <Snowflake className="h-4 w-4" />, color: "text-slate-400", bg: "bg-slate-400/10" },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${bg} ${color} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Tier filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TIER_FILTERS.map(({ label, value }) => {
            const count = value === "all"
              ? contacts.length
              : contacts.filter(c => c.engagementTier === value).length;
            return (
              <button
                key={value}
                onClick={() => setTierFilter(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                  tierFilter === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {value !== "all" && TIER_ICONS[value as EngagementTier]}
                {label}
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${tierFilter === value ? "bg-white/20" : "bg-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + filters row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              type="search"
              placeholder="Search by name, phone, email, or tag..."
              className="pl-9 bg-card"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-card shrink-0">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Status: {statusFilter === "all" ? "All" : statusFilter.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["all", "active", "opted_out", "bounced", "unverified"].map(s => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={statusFilter === s ? "bg-accent" : ""}>
                  {s === "all" ? "All Statuses" : s.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="bg-card shrink-0"
            onClick={() => setHealthOpen(true)}
          >
            <HeartPulse className="mr-2 h-4 w-4 text-primary" />
            List Health
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground shrink-0" onClick={() => exportContacts()}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2.5 rounded-lg border border-primary/20 text-sm font-medium">
          <span>{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-primary/30 mx-1" />
          <Button variant="ghost" size="sm" className="h-7 hover:bg-primary/20 hover:text-primary">Add Tag</Button>
          <Button variant="ghost" size="sm" className="h-7 hover:bg-primary/20 hover:text-primary" onClick={() => exportContacts([...selectedIds])}>Export</Button>
          <Button variant="ghost" size="sm" className="h-7 hover:bg-primary/20 hover:text-primary">Add to Campaign</Button>
          <Button variant="ghost" size="sm" className="h-7 text-destructive hover:bg-destructive/20 hover:text-destructive ml-auto">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead className="hidden sm:table-cell">Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Last Active</TableHead>
                <TableHead className="w-[52px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No contacts match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(contact => (
                  <TableRow key={contact.id} className="border-border/50 hover:bg-muted/30">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={() => toggleOne(contact.id)}
                        aria-label={`Select ${contact.firstName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setDetailContact(contact)}
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {contact.firstName?.charAt(0)}{contact.lastName?.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground hover:underline truncate">
                            {contact.firstName} {contact.lastName}
                          </span>
                          {contact.email && (
                            <span className="text-[11px] text-muted-foreground truncate">{contact.email}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-xs text-muted-foreground">{contact.phone}</span>
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={contact.engagementTier} />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <ScoreBar score={contact.engagementScore} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={contact.status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {contact.lastEngagedAt
                        ? formatDistanceToNow(new Date(contact.lastEngagedAt), { addSuffix: true })
                        : contact.lastActive
                          ? formatDistanceToNow(new Date(contact.lastActive), { addSuffix: true })
                          : "Never"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setDetailContact(contact)}>
                            <User className="mr-2 h-4 w-4" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" /> Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Tag className="mr-2 h-4 w-4" /> Manage Tags
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Contact
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-3 border-t border-border/50">
            <div>Showing {filtered.length} of {contacts.length} contacts</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </div>
      )}

      {/* Sheets */}
      <ContactDetailSheet
        contact={detailContact}
        open={!!detailContact}
        onClose={() => setDetailContact(null)}
      />
      <ListHealthSheet
        contacts={contacts}
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
      />
    </div>
  );
}
