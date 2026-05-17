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
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
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
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const duration = 1800;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, to]);

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
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
    title: "AI Contact Import",
    desc: "Drop any messy spreadsheet. Our Claude-powered AI maps columns, normalizes phone numbers, and cleans duplicates automatically.",
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

const stats = [
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
          className="relative z-10 w-full max-w-6xl mx-auto mt-20"
        >
          {/* Floating notification cards — left */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 1.1, ease: "easeOut" }}
            className="float-card-1 absolute -left-6 top-12 z-20 hidden lg:block"
          >
            <div className="gradient-border rounded-2xl bg-[#111827]/90 backdrop-blur-xl p-4 w-[200px] shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 text-xs font-bold">✓</span>
                </div>
                <div>
                  <p className="text-[11px] text-white font-semibold">Delivered</p>
                  <p className="text-[10px] text-white/40">2 sec ago</p>
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full w-[94%] bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
              </div>
              <p className="text-[10px] text-white/40 mt-1.5">4,237 / 4,500 delivered</p>
            </div>
          </motion.div>

          {/* Floating stat card — right */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 1.2, ease: "easeOut" }}
            className="float-card-2 absolute -right-6 top-8 z-20 hidden lg:block"
          >
            <div className="gradient-border rounded-2xl bg-[#111827]/90 backdrop-blur-xl p-4 w-[190px] shadow-2xl">
              <p className="text-[11px] text-white/40 mb-1">Read Rate</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">87</span>
                <span className="text-lg font-bold text-violet-400">%</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-[10px] text-emerald-400">↑ 12.3%</span>
                <span className="text-[10px] text-white/30">vs last campaign</span>
              </div>
            </div>
          </motion.div>

          {/* Floating message card — bottom right */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.4, ease: "easeOut" }}
            className="float-card-3 absolute right-4 -bottom-8 z-20 hidden md:block"
          >
            <div className="gradient-border rounded-2xl bg-[#111827]/90 backdrop-blur-xl p-3.5 w-[220px] shadow-2xl">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">AI</div>
                <p className="text-[11px] text-white font-semibold">Campaign sent</p>
              </div>
              <div className="bg-white/[0.04] rounded-xl p-2.5 text-[10px] text-white/60 leading-relaxed">
                Hi <span className="text-violet-300">{"{{name}}"}</span>! 🎉 Your exclusive offer expires in 24h...
              </div>
              <p className="text-[10px] text-white/30 mt-2 text-right">Just now · 5,000 recipients</p>
            </div>
          </motion.div>
          <div className="dashboard-glow rounded-2xl border border-white/[0.08] bg-[#111827]/60 backdrop-blur-2xl p-1.5">
            {/* Fade out bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0b1020] to-transparent z-10 rounded-b-2xl pointer-events-none" />

            <div className="rounded-xl overflow-hidden border border-white/[0.05] bg-[#0d1117] flex" style={{ height: 560 }}>
              {/* Mock sidebar */}
              <div className="w-56 border-r border-white/5 bg-[#111827]/80 p-4 hidden md:flex flex-col gap-6 flex-shrink-0">
                <div className="h-7 w-28 bg-white/10 rounded-lg" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                      key={i}
                      className={cn(
                        "h-9 rounded-lg flex items-center gap-2 px-3",
                        i === 2 ? "bg-violet-500/20 w-full" : "bg-white/[0.04] w-11/12"
                      )}
                    >
                      <div className={cn("h-3 w-3 rounded-sm flex-shrink-0", i === 2 ? "bg-violet-400" : "bg-white/15")} />
                      <div className={cn("h-2 rounded-full", i === 2 ? "bg-violet-400/60 w-20" : "bg-white/10 w-16")} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock main */}
              <div className="flex-1 p-7 space-y-5 opacity-90">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="h-5 w-44 bg-white/15 rounded-md" />
                    <div className="h-3 w-28 bg-white/6 rounded-md" />
                  </div>
                  <div className="h-9 w-36 bg-violet-600/80 rounded-lg shimmer" />
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { w: "w-20", val: "4.2M" },
                    { w: "w-16", val: "98.7%" },
                    { w: "w-24", val: "2,341" },
                    { w: "w-14", val: "$12.4k" },
                  ].map((c, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
                      <div className={cn("h-2.5 rounded bg-white/10", c.w)} />
                      <div className="h-7 w-20 bg-white/20 rounded-md" />
                      <div className="h-2 w-12 bg-emerald-500/40 rounded" />
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 h-36 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-32 bg-white/10 rounded" />
                    <div className="h-3 w-20 bg-white/6 rounded" />
                  </div>
                  {/* Fake bar chart */}
                  <div className="flex items-end gap-1.5 flex-1">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${h}%`,
                          background: i === 11
                            ? "linear-gradient(to top, #7c3aed, #a78bfa)"
                            : "rgba(255,255,255,0.06)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Table rows */}
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                      <div className="h-8 w-8 rounded-full bg-white/8 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2.5 w-36 bg-white/10 rounded" />
                        <div className="h-2 w-24 bg-white/5 rounded" />
                      </div>
                      <div className="h-6 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
            {stats.map((s, i) => (
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
