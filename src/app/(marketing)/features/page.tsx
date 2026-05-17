"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import {
  Radio, Users, MessageSquare, Layers, Building2,
  Brain, FileSearch, PhoneCall,
  BarChart3, TrendingUp, Target, DollarSign,
  Shield, Key, ScrollText, Lock, Gauge,
  ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger = (d = 0.07): Variants => ({
  hidden:  {},
  visible: { transition: { staggerChildren: d } },
});

type Category = "core" | "ai" | "analytics" | "security";

const TABS: { id: Category; label: string }[] = [
  { id: "core",      label: "Core Platform" },
  { id: "ai",        label: "AI Features"   },
  { id: "analytics", label: "Analytics"     },
  { id: "security",  label: "Security"      },
];

const FEATURES: Record<Category, { icon: React.ElementType; title: string; desc: string; badge?: string }[]> = {
  core: [
    { icon: Radio,        title: "Broadcast Campaigns",   desc: "Send personalised WhatsApp messages to thousands of contacts in minutes. Schedule, segment, and A/B test with ease.", badge: "Core" },
    { icon: Users,        title: "Contact Management",    desc: "Import contacts via CSV, AI-powered column mapping, bulk upsert, tagging, and custom fields. All in one place.", badge: "Core" },
    { icon: Layers,       title: "Message Templates",     desc: "Create and manage approved WhatsApp Business API templates. Sync directly from Meta Business Manager.", badge: "Core" },
    { icon: MessageSquare,title: "Unified Inbox",         desc: "Handle replies collaboratively. Assign conversations to team members, drop internal notes, resolve tickets.", badge: "Core" },
    { icon: Building2,    title: "Team Collaboration",    desc: "Invite team members with granular roles: owner, admin, editor, viewer. Full audit log of all actions.", badge: "Team" },
    { icon: Key,          title: "API Access",            desc: "Full REST API with API key authentication. Trigger campaigns, manage contacts, and query analytics from your own systems.", badge: "API" },
  ],
  ai: [
    { icon: Brain,       title: "Smart Contact Import",  desc: "Upload any CSV — our rule-based engine instantly auto-detects columns. AI steps in only for unusual formats.", badge: "Smart" },
    { icon: FileSearch,  title: "Smart File Parser",     desc: "Drop in PDFs, Word docs, or Excel files. Our AI extracts names, phone numbers, emails, and custom fields automatically.", badge: "AI" },
    { icon: PhoneCall,  title: "WhatsApp Validator",    desc: "Bulk validate phone numbers before sending. Detect invalid formats, duplicates, and numbers not registered on WhatsApp.", badge: "AI" },
  ],
  analytics: [
    { icon: BarChart3,   title: "Real-time Analytics",   desc: "Track delivery rates, read rates, click-throughs, and conversions. See exactly how every campaign performs in real time.", badge: "Analytics" },
    { icon: TrendingUp,  title: "Campaign Performance",  desc: "Compare campaigns side by side. Identify top performers and replicate what works across your audience segments.", badge: "Analytics" },
    { icon: Target,      title: "Audience Insights",     desc: "Understand who engages with your messages. Segment audiences based on behaviour, tags, and custom attributes.", badge: "Analytics" },
    { icon: DollarSign,  title: "Revenue Attribution",   desc: "Connect WhatsApp engagement to revenue outcomes. See which campaigns drive the most conversions and ROI.", badge: "Analytics" },
  ],
  security: [
    { icon: Shield,      title: "Role-based Access",     desc: "Fine-grained permissions: owner, admin, editor, viewer. Control exactly what each team member can see and do.", badge: "Security" },
    { icon: Key,         title: "API Key Management",    desc: "Create scoped API keys with per-resource permissions. Rotate, revoke, and audit all key usage.", badge: "Security" },
    { icon: ScrollText,  title: "Audit Logs",            desc: "Full immutable audit trail of all admin actions, logins, and configuration changes for compliance.", badge: "Security" },
    { icon: Lock,        title: "Encryption",            desc: "All data encrypted at rest (AES-256) and in transit (TLS 1.3). We never store plaintext credentials.", badge: "Security" },
    { icon: Gauge,       title: "Rate Limiting",         desc: "Built-in rate limiting and bot detection on all API endpoints to protect your account and data.", badge: "Security" },
  ],
};

const BADGE_COLORS: Record<string, string> = {
  Core:      "bg-violet-500/10 text-violet-400 border-violet-500/20",
  Team:      "bg-orange-500/10 text-orange-400 border-orange-500/20",
  API:       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  AI:        "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Analytics: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Security:  "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function FeaturesPage() {
  const [active, setActive] = useState<Category>("core");

  return (
    <div className="bg-[#0b1020] min-h-screen">
      {/* ── Hero ── */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 grid-bg grid-bg-fade opacity-25 pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger(0.1)}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <motion.div variants={fadeUp}>
            <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Feature Overview
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-5">
            A complete platform,<br />
            <span className="gradient-text-primary">not a collection of tools.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-white/50 mb-10 max-w-2xl mx-auto">
            Stop duct-taping together five different products. BroadcastHQ is the single platform your team needs to run world-class WhatsApp marketing.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full px-8 glow-primary-sm">
              <Link href="/signup">Start Free Trial <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Tabs ── */}
      <section className="px-6 pb-5 sticky top-16 z-20 bg-[#0b1020]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                active === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            key={active}
            initial="hidden"
            animate="visible"
            variants={stagger(0.07)}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {FEATURES[active].map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group relative p-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] transition-colors"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  {f.badge && (
                    <Badge variant="outline" className={cn("text-xs", BADGE_COLORS[f.badge] ?? "")}>{f.badge}</Badge>
                  )}
                </div>
                <h3 className="font-semibold text-white mb-3">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger(0.1)}
          className="max-w-3xl mx-auto text-center rounded-2xl border border-primary/20 bg-primary/5 p-14"
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
            Start free. Scale when ready.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/50 mb-8">
            No credit card required. Up to 1,000 messages per month on the free plan — forever.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full px-8 glow-primary-sm">
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
