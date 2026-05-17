"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  Users,
  BarChart3,
  Shield,
  Globe2,
  MessageSquare,
  Sparkles,
  Play,
  Star,
  TrendingUp,
  Clock,
  ChevronRight,
  Radio,
  Brain,
  Inbox,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, type Variants } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

/* ─── Animation variants ─── */
const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const stagger = (delay = 0.1): Variants => ({
  hidden:  {},
  visible: { transition: { staggerChildren: delay } },
});

/* ─── Animated counter ─── */
function Counter({ to, suffix = "", decimals = 0, duration = 1800 }: { to: number; suffix?: string; decimals?: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * to * Math.pow(10, decimals)) / Math.pow(10, decimals));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, to, duration, decimals]);

  return <span ref={ref}>{decimals > 0 ? val.toFixed(decimals) : val.toLocaleString()}{suffix}</span>;
}

/* ─── Interactive dashboard preview ─── */
type DashPage = 'dashboard' | 'campaigns' | 'contacts' | 'inbox' | 'analytics' | 'templates'
const DASH_NAV: { id: DashPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'contacts',  label: 'Contacts'  },
  { id: 'inbox',     label: 'Inbox'     },
  { id: 'analytics', label: 'Analytics' },
  { id: 'templates', label: 'Templates' },
]
const NAV_IDX: Record<DashPage, number> = { dashboard: 0, campaigns: 1, contacts: 2, inbox: 3, analytics: 4, templates: 5 }
const PROMO_STATS = { teams: 500, campaigns: 12400, messages: 4200000, readRate: 87.3, contacts: 890000 }
const LIVE_THRESHOLD = { teams: 2, campaigns: 3 }
type DStats = typeof PROMO_STATS
const fmtN = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`

function SC({ label, value, change, color, bg, border }: { label: string; value: string; change: string; color: string; bg: string; border: string }) {
  return (
    <div className="rounded-xl p-3 border" style={{ background: bg, borderColor: border }}>
      <p className="text-[9px] font-medium uppercase tracking-widest mb-2 leading-none" style={{ color: `${color}99` }}>{label}</p>
      <p className="text-[19px] font-bold text-white leading-none mb-1.5">{value}</p>
      <p className="text-[9px] font-semibold" style={{ color }}>{change}</p>
    </div>
  )
}

function PageOverview({ s }: { s: DStats }) {
  return (
    <div className="p-4 space-y-3 h-full overflow-auto" style={{ scrollbarWidth: 'none' }}>
      <div>
        <p className="text-[14px] font-semibold text-white">Good morning, John 👋</p>
        <p className="text-[10px] text-white/35">Monday, 17 May 2026 — Week 20</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <SC label="Today's Messages" value="12,430" change="↑ 18% vs yesterday" color="#a78bfa" bg="rgba(167,139,250,0.1)" border="rgba(167,139,250,0.2)" />
        <SC label="Active Campaigns" value="3"       change="● Running live"     color="#34d399" bg="rgba(52,211,153,0.1)"  border="rgba(52,211,153,0.2)"  />
        <SC label="New Contacts"     value="84"      change="Added today"        color="#f59e0b" bg="rgba(245,158,11,0.1)"  border="rgba(245,158,11,0.2)"  />
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="text-[9px] text-white/30 font-semibold uppercase tracking-widest mb-2.5">Recent Campaigns</p>
        {[
          { name: "Summer Flash Sale 🔥", status: "Active",    read: "91%", c: "#34d399", bg: "rgba(52,211,153,0.12)"  },
          { name: "Re-engagement 3.0",    status: "Completed", read: "84%", c: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
          { name: "New Collection Drop",  status: "Scheduled", read: "—",   c: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
          { name: "Flash Deal Apr",       status: "Completed", read: "88%", c: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-white/[0.04] last:border-0">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: r.c }} />
            <p className="text-[11px] text-white font-medium truncate flex-1">{r.name}</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0" style={{ color: r.c, background: r.bg }}>{r.status}</span>
            <p className="text-[10px] text-white/50 w-8 text-right shrink-0">{r.read}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {["+ New Campaign", "Import Contacts", "Reports"].map((a, i) => (
          <div key={i} className={cn("flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold border", i === 0 ? "bg-violet-600 text-white border-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.3)]" : "bg-white/[0.03] text-white/40 border-white/[0.07]")}>{a}</div>
        ))}
      </div>
    </div>
  )
}

function PageCampaigns({ s }: { s: DStats }) {
  const bars = [48,63,41,78,59,85,67,91,55,74,62,100]
  return (
    <div className="p-4 space-y-3 h-full overflow-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <SC label="Sent"      value={fmtN(s.messages)} change="↑ 18% MoM"   color="#a78bfa" bg="rgba(167,139,250,0.1)" border="rgba(167,139,250,0.2)" />
        <SC label="Delivered" value="98.7%"            change="↑ 0.4% MoM"  color="#34d399" bg="rgba(52,211,153,0.1)"  border="rgba(52,211,153,0.2)"  />
        <SC label="Read Rate" value={`${s.readRate}%`} change="↑ 12% MoM"   color="#60a5fa" bg="rgba(96,165,250,0.1)"  border="rgba(96,165,250,0.2)"  />
        <SC label="Campaigns" value={fmtN(s.campaigns)}change="All time"    color="#f59e0b" bg="rgba(245,158,11,0.1)"  border="rgba(245,158,11,0.2)"  />
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 pt-3 pb-2 shrink-0" style={{ height: 100 }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-white/45 font-medium">Delivery — Last 12 Days</span>
          <div className="flex gap-2.5">
            <span className="flex items-center gap-1 text-[9px] text-violet-400"><span className="h-1.5 w-1.5 rounded-full bg-violet-500 inline-block"/>Sent</span>
            <span className="flex items-center gap-1 text-[9px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"/>Delivered</span>
          </div>
        </div>
        <div className="flex items-end gap-1" style={{ height: 50 }}>
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex items-end" style={{ height: '100%' }}>
              <div style={{ width: '100%', height: `${h}%`, background: i === bars.length-1 ? 'linear-gradient(to top,#7c3aed,#c4b5fd)' : i >= bars.length-3 ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.2)', borderRadius: '2px 2px 0 0' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { name: "Summer Flash Sale 🔥", status: "Active",    sent: "5,000", read: "91%", c: "#34d399", bg: "rgba(52,211,153,0.12)"  },
          { name: "Re-engagement 3.0",    status: "Completed", sent: "2,341", read: "84%", c: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
          { name: "New Collection Drop",  status: "Draft",     sent: "—",     read: "—",   c: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: r.c }} />
            <p className="text-[11px] text-white font-medium truncate flex-1">{r.name}</p>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ color: r.c, background: r.bg }}>{r.status}</span>
            <p className="text-[10px] text-white/40 w-10 text-right shrink-0">{r.sent}</p>
            <p className="text-[10px] text-white font-semibold w-8 text-right shrink-0">{r.read}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PageContacts({ s }: { s: DStats }) {
  const rows = [
    { init: "SC", name: "Sarah Chen",    phone: "+44 7700 900 123", tag: "VIP",    tier: "#a78bfa", tl: "VIP"    },
    { init: "MR", name: "Marcus Rivera", phone: "+1 213 555 0147",  tag: "Active", tier: "#34d399", tl: "Active" },
    { init: "AP", name: "Aisha Patel",   phone: "+91 98765 43210",  tag: "Warm",   tier: "#fbbf24", tl: "Warm"   },
    { init: "DK", name: "David Kim",     phone: "+82 10 1234 5678", tag: "Cold",   tier: "#6b7280", tl: "Cold"   },
    { init: "EW", name: "Emma Wilson",   phone: "+61 412 345 678",  tag: "Active", tier: "#34d399", tl: "Active" },
  ]
  return (
    <div className="p-4 space-y-3 h-full overflow-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="grid grid-cols-3 gap-2.5">
        <SC label="Total Contacts" value={fmtN(s.contacts)}                         change="All time"     color="#a78bfa" bg="rgba(167,139,250,0.1)" border="rgba(167,139,250,0.2)" />
        <SC label="Active"         value={fmtN(Math.floor(s.contacts * 0.95))}       change="Subscribed"   color="#34d399" bg="rgba(52,211,153,0.1)"  border="rgba(52,211,153,0.2)"  />
        <SC label="Opted Out"      value={fmtN(Math.floor(s.contacts * 0.013))}      change="Unsubscribed" color="#f87171" bg="rgba(248,113,113,0.1)" border="rgba(248,113,113,0.2)" />
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_55px_52px] gap-2 px-3 py-2 border-b border-white/[0.05]">
          {['','Name / Phone','Tag','Tier'].map((h,i) => <span key={i} className="text-[9px] text-white/25 font-semibold uppercase tracking-wide">{h}</span>)}
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_55px_52px] gap-2 items-center px-3 py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">{r.init}</div>
            <div>
              <p className="text-[11px] text-white font-medium leading-none mb-0.5">{r.name}</p>
              <p className="text-[9px] text-white/30 font-mono">{r.phone}</p>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/50 border border-white/[0.08] text-center truncate">{r.tag}</span>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: r.tier }} />
              <span className="text-[9px]" style={{ color: r.tier }}>{r.tl}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PageInbox() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="hidden sm:flex w-44 border-r border-white/[0.05] bg-[#0a101c] p-2 flex-col gap-1 overflow-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
        <p className="text-[9px] text-white/25 font-semibold uppercase tracking-widest px-2 py-1">Conversations</p>
        {[
          { init: "SC", name: "Sarah Chen",    preview: "Thanks for the offer! 🎉",  time: "2m",  unread: 2, active: true  },
          { init: "MR", name: "Marcus Rivera",  preview: "Can you tell me more...",   time: "15m", unread: 0, active: false },
          { init: "GT", name: "GlobalTech",    preview: "Yes, we're interested...",  time: "1h",  unread: 1, active: false },
          { init: "EW", name: "Emma Wilson",    preview: "Got it, thanks! 👍",        time: "3h",  unread: 0, active: false },
        ].map((c, i) => (
          <div key={i} className={cn("flex items-start gap-2 rounded-lg px-2 py-2 cursor-pointer", c.active ? "bg-violet-600/20 border border-violet-500/20" : "hover:bg-white/[0.03]")}>
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">{c.init}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[10px] text-white font-medium truncate">{c.name}</p>
                <span className="text-[8px] text-white/25 shrink-0 ml-1">{c.time}</span>
              </div>
              <p className="text-[9px] text-white/40 truncate">{c.preview}</p>
            </div>
            {c.unread > 0 && <span className="h-4 w-4 rounded-full bg-violet-500 flex items-center justify-center text-[8px] text-white font-bold shrink-0">{c.unread}</span>}
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/[0.05] px-4 py-2.5 flex items-center gap-2.5 shrink-0 bg-[#0c1220]">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">SC</div>
          <div>
            <p className="text-[11px] text-white font-semibold leading-none mb-0.5">Sarah Chen</p>
            <p className="text-[9px] text-emerald-400 leading-none">● Online · Summer Flash Sale</p>
          </div>
          <div className="ml-auto flex gap-2">
            <div className="h-6 px-2.5 bg-white/[0.04] border border-white/[0.07] rounded-lg flex items-center">
              <span className="text-[9px] text-white/40">Assign</span>
            </div>
            <div className="h-6 px-2.5 bg-emerald-600/80 rounded-lg flex items-center">
              <span className="text-[9px] text-white font-medium">Resolve</span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2.5 overflow-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex justify-end">
            <div className="max-w-[76%] bg-violet-600/85 rounded-2xl rounded-tr-sm px-3 py-2 shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
              <p className="text-[10px] text-white leading-relaxed">Hi Sarah! 🎉 Your exclusive Summer deal expires tonight. Tap to claim ↗</p>
              <p className="text-[8px] text-violet-200/50 mt-0.5 text-right">11:42 AM ✓✓</p>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[76%] bg-white/[0.06] border border-white/[0.07] rounded-2xl rounded-tl-sm px-3 py-2">
              <p className="text-[10px] text-white/80 leading-relaxed">OMG thanks!! Already claimed it 🙌 Best deal ever!</p>
              <p className="text-[8px] text-white/25 mt-0.5">11:43 AM</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[76%] bg-violet-600/85 rounded-2xl rounded-tr-sm px-3 py-2 shadow-[0_2px_8px_rgba(124,58,237,0.3)]">
              <p className="text-[10px] text-white leading-relaxed">Amazing! Enjoy 20% off. Let us know if you need anything 💜</p>
              <p className="text-[8px] text-violet-200/50 mt-0.5 text-right">11:44 AM ✓✓</p>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[76%] bg-white/[0.06] border border-white/[0.07] rounded-2xl rounded-tl-sm px-3 py-2">
              <p className="text-[10px] text-white/80 leading-relaxed">Can I ask about the new collection drop too? 🛍️</p>
              <p className="text-[8px] text-white/25 mt-0.5">11:46 AM</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.05] p-2.5 flex items-center gap-2 bg-[#0a101c] shrink-0">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2">
            <p className="text-[10px] text-white/20">Type a reply...</p>
          </div>
          <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(124,58,237,0.4)]">
            <span className="text-white text-[10px] font-bold">↑</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PageAnalytics({ s }: { s: DStats }) {
  const pts = [55,68,49,81,62,88,71,93,58,79,65,98]
  const W = 300, H = 60
  const poly = pts.map((v, i) => `${(i/(pts.length-1))*W},${H-(v/100)*H}`).join(' ')
  const area = `M0,${H} ${pts.map((v, i) => `L${(i/(pts.length-1))*W},${H-(v/100)*H}`).join(' ')} L${W},${H} Z`
  return (
    <div className="p-4 space-y-3 h-full overflow-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {["7D","30D","90D"].map((t, i) => (
            <span key={i} className={cn("text-[9px] px-2.5 py-1 rounded-full font-medium cursor-pointer border", i === 1 ? "bg-violet-600/20 border-violet-500/30 text-violet-300" : "bg-white/[0.04] border-white/[0.07] text-white/35")}>{t}</span>
          ))}
        </div>
        <span className="text-[9px] text-violet-400 font-medium cursor-pointer">Export ↓</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <SC label="Delivery Rate"  value="98.7%"                      change="↑ 0.4% MoM"  color="#34d399" bg="rgba(52,211,153,0.1)"  border="rgba(52,211,153,0.2)"  />
        <SC label="Read Rate"      value={`${s.readRate.toFixed(1)}%`} change="↑ 12% MoM"   color="#60a5fa" bg="rgba(96,165,250,0.1)"  border="rgba(96,165,250,0.2)"  />
        <SC label="Response Rate"  value="23.4%"                      change="↑ 5.1% MoM"  color="#a78bfa" bg="rgba(167,139,250,0.1)" border="rgba(167,139,250,0.2)" />
        <SC label="Opt-out Rate"   value="0.8%"                       change="↓ 0.2% MoM"  color="#f87171" bg="rgba(248,113,113,0.1)" border="rgba(248,113,113,0.2)" />
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 pt-3 pb-2">
        <p className="text-[10px] text-white/45 font-medium mb-2">Delivery Trend — May 2026</p>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 50 }}>
          <defs>
            <linearGradient id="lGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#lGrad)" />
          <polyline points={poly} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx={(11/11)*W} cy={H-(98/100)*H} r="3" fill="#a78bfa" />
        </svg>
        <div className="flex justify-between mt-1">
          {['1 May','5','9','13','17','21','25','30'].map((d,i) => <span key={i} className="text-[8px] text-white/20">{d}</span>)}
        </div>
      </div>
    </div>
  )
}

function PageTemplates() {
  const tmpls = [
    { name: "Summer Flash Sale",  cat: "MARKETING", used: 12, preview: "Hi {{name}}! 🎉 Your exclusive Summer deal...", c: "#a78bfa" },
    { name: "Product Launch",     cat: "MARKETING", used: 8,  preview: "Exciting news! Our new product is finally...", c: "#a78bfa" },
    { name: "Re-engagement",      cat: "UTILITY",   used: 23, preview: "We miss you! Come back and see what's new...", c: "#60a5fa" },
    { name: "Order Confirmed",    cat: "UTILITY",   used: 45, preview: "Your order #{{id}} has been confirmed ✅...",   c: "#60a5fa" },
    { name: "Welcome Message",    cat: "UTILITY",   used: 67, preview: "Welcome to {{brand}}! 🎉 We're so excited...", c: "#60a5fa" },
    { name: "Promo Code Drop",    cat: "MARKETING", used: 3,  preview: "{{name}}, your code {{code}} expires in...",   c: "#a78bfa" },
  ]
  return (
    <div className="p-4 space-y-3 h-full overflow-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5">
          <p className="text-[10px] text-white/20">Search templates...</p>
        </div>
        <div className="h-7 px-3 bg-violet-600 rounded-lg flex items-center shrink-0 shadow-[0_0_8px_rgba(124,58,237,0.3)]">
          <span className="text-white text-[10px] font-semibold">+ New</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tmpls.map((t, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/[0.14] transition-colors cursor-pointer group">
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-[11px] text-white font-semibold leading-tight group-hover:text-violet-200 transition-colors">{t.name}</p>
              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold ml-1 shrink-0" style={{ color: t.c, background: `${t.c}18` }}>{t.cat}</span>
            </div>
            <p className="text-[9px] text-white/40 leading-relaxed mb-1.5 line-clamp-2">{t.preview}</p>
            <p className="text-[8px] text-white/25">Used {t.used}× this month</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main dashboard preview ─── */
function DashboardPreview() {
  const [page, setPage] = useState<DashPage>('campaigns')
  const [dir, setDir] = useState(1)
  const [stats, setStats] = useState(PROMO_STATS)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.json())
      .then(d => {
        const s = d?.stats
        if (!s) return
        if (s.teams >= LIVE_THRESHOLD.teams && s.campaigns >= LIVE_THRESHOLD.campaigns) {
          setStats({ teams: s.teams, campaigns: s.campaigns, messages: s.messages, readRate: s.readRate || 87.3, contacts: s.contacts })
          setIsLive(true)
        }
      })
      .catch(() => {})
  }, [])

  const goTo = (id: DashPage) => {
    setDir(NAV_IDX[id] >= NAV_IDX[page] ? 1 : -1)
    setPage(id)
  }

  const META: Record<DashPage, { title: string; sub: string; url: string }> = {
    dashboard: { title: 'Overview',   sub: 'Mon, 17 May 2026',                                     url: 'dashboard' },
    campaigns: { title: 'Campaigns',  sub: `May 2026 · ${stats.campaigns.toLocaleString()} total`, url: 'campaigns' },
    contacts:  { title: 'Contacts',   sub: `${fmtN(stats.contacts)} contacts synced`,              url: 'contacts'  },
    inbox:     { title: 'Inbox',      sub: '3 unread conversations',                               url: 'inbox'     },
    analytics: { title: 'Analytics',  sub: 'Last 30 days · May 2026',                             url: 'analytics' },
    templates: { title: 'Templates',  sub: '6 active templates',                                  url: 'templates' },
  }

  const content: Record<DashPage, React.ReactNode> = {
    dashboard: <PageOverview  s={stats} />,
    campaigns: <PageCampaigns s={stats} />,
    contacts:  <PageContacts  s={stats} />,
    inbox:     <PageInbox />,
    analytics: <PageAnalytics s={stats} />,
    templates: <PageTemplates />,
  }

  return (
    <div className="rounded-2xl border border-white/[0.1] shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden bg-[#0c1220]">
      {/* Accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500" />

      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/[0.06] bg-[#0f1723] select-none">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70" />
        <div className="ml-3 flex-1 max-w-xs bg-white/[0.04] border border-white/[0.07] rounded-md px-3 py-1 text-[11px] text-white/40 font-mono flex items-center gap-2 overflow-hidden">
          <span className="text-emerald-400 text-[10px]">🔒</span>
          <AnimatePresence mode="wait">
            <motion.span key={page + '_url'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="truncate">
              app.broadcasthq.com/{META[page].url}
            </motion.span>
          </AnimatePresence>
        </div>
        {isLive ? (
          <span className="ml-auto text-[10px] text-emerald-400 font-bold tracking-wider flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />LIVE DATA
          </span>
        ) : (
          <span className="ml-auto text-[9px] text-white/20 tracking-widest shrink-0 font-mono">DEMO</span>
        )}
      </div>

      {/* Mobile tab bar */}
      <div className="flex md:hidden border-b border-white/[0.05] bg-[#0a101c] overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {DASH_NAV.map(item => (
          <button key={item.id} onClick={() => goTo(item.id)} className={cn(
            "flex-none px-4 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 outline-none",
            page === item.id ? "text-violet-300 border-violet-500 bg-violet-500/5" : "text-white/35 border-transparent"
          )}>{item.label}</button>
        ))}
      </div>

      {/* Body */}
      <div className="flex h-[420px] md:h-[480px]">
        {/* Sidebar — desktop only */}
        <div className="hidden md:flex w-48 border-r border-white/[0.05] bg-[#0a101c] p-4 flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-2 px-2 mb-5">
            <div className="h-6 w-6 rounded-md bg-violet-600 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(124,58,237,0.5)]">
              <span className="text-white text-[9px] font-black">BQ</span>
            </div>
            <span className="text-[12px] font-semibold text-white tracking-tight">BroadcastHQ</span>
          </div>
          {DASH_NAV.map(item => (
            <motion.button key={item.id} onClick={() => goTo(item.id)}
              whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}
              className={cn("h-8 rounded-lg flex items-center gap-2.5 px-3 text-[11px] font-medium transition-all text-left w-full outline-none cursor-pointer",
                page === item.id ? "bg-violet-600/25 text-violet-300 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.2)]" : "text-white/35 hover:text-white/70 hover:bg-white/[0.05]"
              )}
            >
              <motion.span className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ background: page === item.id ? '#a78bfa' : 'rgba(255,255,255,0.15)' }}
                animate={page === item.id ? { scale: [1, 1.6, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              />
              {item.label}
            </motion.button>
          ))}
          <div className="mt-auto border-t border-white/[0.05] pt-3">
            <div className="flex items-center gap-2 px-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">JD</div>
              <div>
                <p className="text-[11px] text-white font-medium leading-none mb-0.5">John Doe</p>
                <p className="text-[9px] text-violet-400/80 font-medium leading-none">Pro Plan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Topbar with animated title */}
          <div className="border-b border-white/[0.05] px-4 py-2.5 flex items-center justify-between bg-[#0c1220] shrink-0">
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={page + '_hdr'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  <p className="text-[13px] font-semibold text-white leading-none mb-1">{META[page].title}</p>
                  <p className="text-[10px] text-white/30">{META[page].sub}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-7 px-2.5 border border-white/[0.07] rounded-lg bg-white/[0.03] hidden sm:flex items-center">
                <span className="text-[10px] text-white/35">Filter ▾</span>
              </div>
              <div className="h-7 px-3 bg-violet-600 rounded-lg flex items-center shadow-[0_0_12px_rgba(124,58,237,0.4)]">
                <span className="text-white text-[10px] font-semibold">+ New</span>
              </div>
            </div>
          </div>

          {/* Animated page content */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div key={page}
                initial={{ opacity: 0, x: dir * 22 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -22 }}
                transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute inset-0"
              >
                {content[page]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Bento feature card ─── */
const features = [
  {
    icon: Radio,
    title: "High-Volume Broadcasting",
    desc: "Send personalized campaigns to thousands of contacts in seconds with our optimized multi-tenant routing engine.",
    color: "from-violet-500/20 to-purple-600/5",
    iconColor: "text-violet-400",
    span: "col-span-1",
  },
  {
    icon: Brain,
    title: "Smart Contact Import",
    desc: "Drop any messy spreadsheet. Our engine auto-detects columns, normalizes phone numbers, and cleans duplicates — AI steps in only for unusual formats.",
    color: "from-indigo-500/20 to-blue-600/5",
    iconColor: "text-indigo-400",
    span: "col-span-1",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Track delivery, read rates, and conversion funnels live with beautiful visualizations and exportable reports.",
    color: "from-cyan-500/20 to-teal-600/5",
    iconColor: "text-cyan-400",
    span: "col-span-1",
  },
  {
    icon: Inbox,
    title: "Unified Team Inbox",
    desc: "Handle replies collaboratively. Assign conversations, leave internal notes, and resolve tickets as a team.",
    color: "from-emerald-500/20 to-green-600/5",
    iconColor: "text-emerald-400",
    span: "col-span-1",
  },
  {
    icon: Shield,
    title: "Official Meta Cloud API",
    desc: "Connect directly via Meta's official API. Zero ban risk, full compliance, and enterprise-grade uptime SLAs.",
    color: "from-rose-500/20 to-pink-600/5",
    iconColor: "text-rose-400",
    span: "col-span-1",
  },
  {
    icon: Globe2,
    title: "Global Edge Delivery",
    desc: "Built on edge infrastructure ensuring sub-100ms message delivery latency anywhere in the world.",
    color: "from-amber-500/20 to-orange-600/5",
    iconColor: "text-amber-400",
    span: "col-span-1",
  },
];

const heroStats = [
  { value: 4200000, suffix: "+", label: "Messages delivered daily" },
  { value: 98, suffix: "%",   label: "Delivery success rate" },
  { value: 500,  suffix: "+", label: "Teams worldwide" },
  { value: 100,  suffix: "ms", label: "Avg. delivery latency" },
];

const testimonials = [
  {
    quote: "BroadcastHQ cut our campaign setup time from hours to minutes. The AI import alone saved us two full workdays per month.",
    name: "Sarah Chen",
    role: "Head of Growth, Nexus Labs",
    stars: 5,
  },
  {
    quote: "The delivery analytics are incredibly granular. We can actually see which messages convert and optimize in real time.",
    name: "Marcus Rivera",
    role: "Marketing Director, Quantum Brands",
    stars: 5,
  },
  {
    quote: "Finally a WhatsApp platform that doesn't feel like it was built in 2015. The UX is exceptional, the API is clean.",
    name: "Aisha Patel",
    role: "CTO, Starlight Commerce",
    stars: 5,
  },
];

const steps = [
  {
    n: "01",
    icon: Users,
    title: "Import Your Contacts",
    desc: "Upload any CSV or spreadsheet. Our AI normalizes, deduplicates, and enriches your list instantly.",
  },
  {
    n: "02",
    icon: MessageSquare,
    title: "Build Your Campaign",
    desc: "Craft personalized messages with dynamic variables using our intuitive template builder.",
  },
  {
    n: "03",
    icon: TrendingUp,
    title: "Launch & Analyze",
    desc: "Send at scale and watch real-time delivery, read, and conversion metrics pour in.",
  },
];

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const mockupY = useTransform(scrollY, [0, 600], [0, 80]);

  return (
    <div className="min-h-screen bg-[#0b1020] text-foreground selection:bg-primary/30 overflow-hidden">

      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" href="/" light />

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-white/60">
            {[
              { href: "/features", label: "Features" },
              { href: "/pricing",  label: "Pricing" },
              { href: "/about",    label: "About" },
              { href: "/docs",     label: "Docs" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm font-medium text-white/60 hover:text-white transition-colors">
              Sign In
            </Link>
            <Button asChild className="rounded-full px-5 bg-white text-black hover:bg-white/90 shadow-[0_0_24px_rgba(255,255,255,0.12)] text-sm font-semibold h-9">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 overflow-hidden">

        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="orb-1 absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[100px]" />
          <div className="orb-2 absolute top-[40%] right-[5%] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[100px]" />
          <div className="orb-3 absolute bottom-[10%] left-[30%] w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]" />
          <div className="grid-bg grid-bg-fade absolute inset-0" />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-10 text-sm text-white/70"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>Now with AI-powered contact import</span>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-[88px] font-bold tracking-tighter leading-[1.05] mb-7"
          >
            <span className="text-white">WhatsApp marketing</span>
            <br />
            <span className="gradient-text-primary text-glow">engineered for scale.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Send personalized broadcast campaigns to thousands of contacts via the official Meta API. AI-powered imports, real-time analytics, collaborative inbox — all in one place.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              asChild
              className="h-13 px-8 rounded-full text-base font-semibold glow-primary shadow-[0_0_40px_rgba(124,58,237,0.4)] hover:shadow-[0_0_60px_rgba(124,58,237,0.6)] transition-all duration-300"
            >
              <Link href="/signup" className="flex items-center gap-2">
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-13 px-8 rounded-full text-base text-white/70 hover:text-white hover:bg-white/5 border border-white/10"
            >
              <Play className="h-4 w-4 mr-2 fill-current" />
              Watch demo
            </Button>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-white/35"
          >
            {["No credit card required", "14-day free trial", "Official Meta API"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, ease: "easeOut" }}
          style={{ y: mockupY }}
          className="relative z-10 w-full max-w-5xl mx-auto mt-20"
        >
          {/* Fade out bottom so it blends into next section */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0b1020] to-transparent z-10 rounded-b-2xl pointer-events-none" />
          <DashboardPreview />
        </motion.div>
      </section>

      {/* ─── Logo belt ─── */}
      <section className="py-12 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center mb-8">
            Trusted by innovative teams worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-30 grayscale">
            {["Acme Corp", "GlobalTech", "Nexus Labs", "Starlight", "QuantumIO", "Orbital"].map((b, i) => (
              <span key={i} className="text-lg md:text-xl font-bold tracking-tight text-white">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {heroStats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <p className="text-sm text-white/40 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-border/50" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger(0.08)}
            className="text-center mb-20 max-w-3xl mx-auto"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
              Everything you need
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-5">
              A complete platform,<br />not a collection of tools.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-white/45 leading-relaxed">
              Stop duct-taping together five different products. BroadcastHQ is the single platform your team needs to run world-class WhatsApp marketing.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger(0.07)}
            className="grid md:grid-cols-3 gap-5"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={cn(
                  "relative group p-7 rounded-2xl border border-white/[0.07] bg-gradient-to-br overflow-hidden cursor-default",
                  "hover:border-white/[0.14] transition-colors duration-300",
                  f.color
                )}
              >
                {/* Inner glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/[0.02] rounded-2xl" />

                <div className={cn("h-11 w-11 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300")}>
                  <f.icon className={cn("h-5 w-5", f.iconColor)} />
                </div>
                <h3 className="text-base font-semibold text-white mb-3">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger(0.08)}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Up and running in minutes.
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
            {/* Connector lines (desktop only) */}
            <div className="absolute top-14 left-[calc(33%-24px)] right-[calc(33%-24px)] h-px bg-gradient-to-r from-violet-500/30 via-violet-500/50 to-violet-500/30 hidden md:block pointer-events-none" />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative flex flex-col items-center text-center p-7 rounded-2xl border border-white/[0.07] bg-white/[0.02]"
              >
                <div className="relative mb-6">
                  <div className="h-14 w-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center z-10 relative">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="absolute -top-1 -right-1 text-[10px] font-bold text-primary/60 bg-background border border-primary/20 rounded-full h-5 w-5 flex items-center justify-center">
                    {step.n.slice(-1)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger(0.08)}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
              Testimonials
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Loved by growth teams.
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger(0.1)}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="p-7 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex flex-col gap-5 cursor-default hover:border-white/[0.14] transition-colors"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-white/70 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/[0.06]">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-white/40">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-32 px-6 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-[#0b1020] to-indigo-900/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[100px]" />
          <div className="grid-bg absolute inset-0 opacity-40" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger(0.1)}
          className="relative z-10 max-w-4xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-8 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" />
            Start in under 5 minutes
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-7"
          >
            Ready to grow on<br />
            <span className="gradient-text-primary">WhatsApp?</span>
          </motion.h2>

          <motion.p variants={fadeUp} className="text-xl text-white/50 mb-10 max-w-xl mx-auto leading-relaxed">
            Join 500+ teams using BroadcastHQ to reach their audience and drive real revenue through WhatsApp.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="h-14 px-10 text-base rounded-full font-semibold bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              <Link href="/signup">Create Free Workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="h-14 px-8 text-base rounded-full text-white/60 hover:text-white hover:bg-white/5 border border-white/10"
            >
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-white/30">
            {["No credit card required", "14-day free trial", "Cancel anytime"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] bg-[#0d1117] py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <Logo size="sm" href="/" light />
              <p className="text-sm text-white/35 leading-relaxed max-w-xs">
                WhatsApp broadcast campaigns at scale. Reach your audience where they are.
              </p>
            </div>

            {[
              {
                title: "Product",
                links: [
                  { label: "Features", href: "/features" },
                  { label: "Pricing",  href: "/pricing" },
                  { label: "Changelog", href: "#" },
                  { label: "Roadmap",  href: "#" },
                ],
              },
              {
                title: "Developers",
                links: [
                  { label: "API Docs",      href: "/docs" },
                  { label: "API Reference", href: "/docs#api" },
                  { label: "Status",        href: "#" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "About",   href: "/about" },
                  { label: "Blog",    href: "#" },
                  { label: "Careers", href: "#" },
                  { label: "Contact", href: "/contact" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy Policy",   href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                ],
              },
            ].map(section => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map(l => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-white/35 hover:text-white/70 transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-white/[0.06] gap-4">
            <p className="text-xs text-white/25">© {new Date().getFullYear()} BroadcastHQ. All rights reserved.</p>
            <p className="text-xs text-white/25">Built on Next.js, Neon Postgres &amp; Stripe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
