import { Badge } from "@/components/ui/badge";
import { Rocket, Zap, BarChart3, Bot, Globe2, Shield, MessageSquare, Users } from "lucide-react";
import type { ElementType } from "react";

interface RoadmapItem {
  title: string;
  description: string;
  status: "shipped" | "in_progress" | "planned" | "exploring";
  quarter: string;
  icon: ElementType;
}

const ITEMS: RoadmapItem[] = [
  {
    status: "shipped",
    quarter: "Q1 2026",
    icon: BarChart3,
    title: "Advanced Analytics Dashboard",
    description: "30/7/90-day message performance, delivery trends, engagement heatmaps, and top campaign breakdowns.",
  },
  {
    status: "shipped",
    quarter: "Q1 2026",
    icon: Shield,
    title: "Role-Based Access Control",
    description: "Granular permissions: owner, admin, editor, viewer. Billing locked to owner/admin only.",
  },
  {
    status: "shipped",
    quarter: "Q2 2026",
    icon: Zap,
    title: "Stripe Billing & Subscription Management",
    description: "Full Stripe checkout, customer portal, webhook-driven plan upgrades and auto-downgrades.",
  },
  {
    status: "shipped",
    quarter: "Q2 2026",
    icon: MessageSquare,
    title: "In-App Support Tickets",
    description: "Create, track, and resolve support tickets directly inside the dashboard with a threaded chat UI.",
  },
  {
    status: "in_progress",
    quarter: "Q3 2026",
    icon: Bot,
    title: "AI-Powered Message Composer",
    description: "Generate WhatsApp-optimised message templates using Claude. Suggest tone, CTAs, and emoji usage based on campaign goal.",
  },
  {
    status: "in_progress",
    quarter: "Q3 2026",
    icon: Users,
    title: "Audience Segmentation Engine",
    description: "Build dynamic segments from contact properties, tags, engagement tier, and past campaign behaviour.",
  },
  {
    status: "planned",
    quarter: "Q3 2026",
    icon: Globe2,
    title: "Multi-Language Template Support",
    description: "Create and manage WhatsApp templates in multiple languages. Auto-detect contact locale and send in the right language.",
  },
  {
    status: "planned",
    quarter: "Q4 2026",
    icon: Rocket,
    title: "Two-Way Conversation Flows",
    description: "Build rule-based reply flows that respond automatically to keywords and guide contacts through sequences.",
  },
  {
    status: "planned",
    quarter: "Q4 2026",
    icon: BarChart3,
    title: "Campaign A/B Testing",
    description: "Split audiences and test message variants. Automatically promote the winning variant based on read rate.",
  },
  {
    status: "exploring",
    quarter: "2027",
    icon: Bot,
    title: "AI Campaign Intelligence",
    description: "Predict optimal send times per contact, surface at-risk opt-outs before they happen, and recommend next best actions.",
  },
  {
    status: "exploring",
    quarter: "2027",
    icon: Globe2,
    title: "SMS & Email Fallback",
    description: "Automatically fall back to SMS or email when a WhatsApp message fails to deliver.",
  },
];

const STATUS_CONFIG = {
  shipped:     { label: "Shipped",     cls: "bg-green-500/10 text-green-500 border-green-500/20",     dot: "bg-green-500" },
  in_progress: { label: "In Progress", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20",       dot: "bg-blue-500 animate-pulse" },
  planned:     { label: "Planned",     cls: "bg-purple-500/10 text-purple-500 border-purple-500/20", dot: "bg-purple-500" },
  exploring:   { label: "Exploring",   cls: "bg-gray-500/10 text-gray-400 border-gray-500/20",       dot: "bg-gray-500" },
};

const ORDER: RoadmapItem["status"][] = ["in_progress", "planned", "exploring", "shipped"];

export default function RoadmapPage() {
  const grouped = ORDER.reduce<Record<string, RoadmapItem[]>>((acc, s) => {
    acc[s] = ITEMS.filter(i => i.status === s);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-14 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Roadmap</h1>
        <p className="text-muted-foreground text-lg">
          What we&apos;re building, what&apos;s coming next, and where we&apos;re headed long-term. Updated regularly.
        </p>
      </div>

      {ORDER.map(status => {
        const items = grouped[status];
        if (!items?.length) return null;
        const cfg = STATUS_CONFIG[status];
        return (
          <section key={status} className="mb-14">
            <div className="flex items-center gap-3 mb-6">
              <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
              <h2 className="text-lg font-semibold">{cfg.label}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-border bg-card/60 p-5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant="outline" className={`text-[11px] ${cfg.cls}`}>{cfg.label}</Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">{item.quarter}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1.5">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="mt-10 rounded-xl border border-border bg-card/40 p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">Have a feature request?</p>
        <p className="text-sm">
          Open a{" "}
          <a href="/dashboard/help" className="text-primary hover:underline">support ticket</a>
          {" "}or email{" "}
          <a href="mailto:hello@broadcasthq.app" className="text-primary hover:underline">hello@broadcasthq.app</a>.
          We read every suggestion.
        </p>
      </div>
    </div>
  );
}
