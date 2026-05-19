import { Badge } from "@/components/ui/badge";

interface Release {
  version: string;
  date: string;
  tag: "major" | "minor" | "patch" | "security";
  title: string;
  changes: { type: "added" | "improved" | "fixed" | "removed" | "security"; text: string }[];
}

const RELEASES: Release[] = [
  {
    version: "1.5.0",
    date: "May 2026",
    tag: "major",
    title: "Admin Revenue Dashboard & Workspace Management",
    changes: [
      { type: "added",    text: "Admin revenue dashboard with MRR, ARR, churn, and plan analytics" },
      { type: "added",    text: "Create workspace directly from admin panel with auto-generated credentials" },
      { type: "added",    text: "Add users to any workspace from admin — temp password shown once" },
      { type: "added",    text: "Force plan change and subscription status from admin workspace table" },
      { type: "added",    text: "Super admins now get a permanent enterprise workspace on first login" },
      { type: "added",    text: "Auto-downgrade accounts to free after final payment failure (3 attempts)" },
      { type: "added",    text: "Daily cron job to expire past_due/canceled subscriptions" },
      { type: "added",    text: "Subscription expiration & past-due banner on user dashboard" },
      { type: "added",    text: "Failed messages now shown on Performance Chart alongside sent/read" },
      { type: "improved", text: "Billing page now restricted to owner/admin roles only" },
      { type: "fixed",    text: "Help page API Docs link now opens externally in new tab" },
      { type: "fixed",    text: "Help page email button now opens mailto client" },
    ],
  },
  {
    version: "1.4.0",
    date: "April 2026",
    tag: "major",
    title: "Billing & Plans — Full Stripe Integration",
    changes: [
      { type: "added",    text: "Stripe checkout for Starter, Pro, and Enterprise plans" },
      { type: "added",    text: "Stripe customer portal for subscription management" },
      { type: "added",    text: "Webhook handler for payment_failed, subscription updates" },
      { type: "added",    text: "Usage bars on billing page with visual danger/warning states" },
      { type: "added",    text: "\"Most Popular\" badge on Pro plan" },
      { type: "improved", text: "Per-plan checkout loading states — no global spinner" },
      { type: "security", text: "Billing API endpoints now enforce role checks (owner/admin only)" },
    ],
  },
  {
    version: "1.3.0",
    date: "March 2026",
    tag: "major",
    title: "Support Tickets & Help Center",
    changes: [
      { type: "added",    text: "Full support ticket system with categories, priorities, and threading" },
      { type: "added",    text: "In-app ticket chat with admin/user message distinction" },
      { type: "added",    text: "Satisfaction rating after ticket resolution (1–5 emoji scale)" },
      { type: "added",    text: "Admin ticket dashboard with assignment and resolution tools" },
      { type: "added",    text: "Support online/offline indicator based on UTC business hours" },
      { type: "improved", text: "Help page search filters articles and FAQs in real time" },
    ],
  },
  {
    version: "1.2.0",
    date: "February 2026",
    tag: "major",
    title: "Analytics & Campaign Intelligence",
    changes: [
      { type: "added",    text: "30/7/90-day analytics with delivery rate, read rate, fail rate" },
      { type: "added",    text: "Daily message breakdown with trend comparison to previous period" },
      { type: "added",    text: "Top campaigns by read rate with engagement score" },
      { type: "added",    text: "Hourly send activity heatmap" },
      { type: "added",    text: "Template usage and performance statistics" },
      { type: "added",    text: "Engagement distribution by contact tier" },
    ],
  },
  {
    version: "1.1.0",
    date: "January 2026",
    tag: "minor",
    title: "Contacts, Inbox & CSV Import",
    changes: [
      { type: "added",    text: "CSV contact importer with rule-based column mapper" },
      { type: "added",    text: "Contact tags and engagement tier scoring" },
      { type: "added",    text: "Inbox with live WhatsApp-style conversation thread" },
      { type: "added",    text: "Opt-out management — contacts excluded from future campaigns automatically" },
      { type: "improved", text: "Contact search, filter by status, and bulk actions" },
    ],
  },
  {
    version: "1.0.0",
    date: "December 2025",
    tag: "major",
    title: "Initial Launch",
    changes: [
      { type: "added", text: "Multi-tenant SaaS platform with workspace isolation" },
      { type: "added", text: "WhatsApp Business API campaign broadcasts" },
      { type: "added", text: "Template management with Meta approval tracking" },
      { type: "added", text: "Scheduled campaigns with timezone support" },
      { type: "added", text: "Role-based access: owner, admin, editor, viewer" },
      { type: "added", text: "Admin panel: users, workspaces, campaigns, system health" },
      { type: "added", text: "Dark / light / system theme support" },
    ],
  },
];

const TAG_COLORS: Record<Release["tag"], string> = {
  major:    "bg-purple-500/10 text-purple-500 border-purple-500/20",
  minor:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
  patch:    "bg-gray-500/10 text-gray-400 border-gray-500/20",
  security: "bg-red-500/10 text-red-500 border-red-500/20",
};

const CHANGE_DOT: Record<string, string> = {
  added:    "bg-green-500",
  improved: "bg-blue-500",
  fixed:    "bg-yellow-500",
  removed:  "bg-gray-500",
  security: "bg-red-500",
};

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">
      <div className="mb-14">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Changelog</h1>
        <p className="text-muted-foreground text-lg">
          Every update, fix, and feature — in reverse chronological order.
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border/50 ml-[7px]" />
        <div className="space-y-14">
          {RELEASES.map(release => (
            <div key={release.version} className="relative pl-8">
              <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="font-mono text-sm font-semibold text-foreground">v{release.version}</span>
                <Badge variant="outline" className={`capitalize text-xs ${TAG_COLORS[release.tag]}`}>
                  {release.tag}
                </Badge>
                <span className="text-xs text-muted-foreground">{release.date}</span>
              </div>
              <h2 className="text-xl font-semibold mb-4">{release.title}</h2>
              <ul className="space-y-2">
                {release.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${CHANGE_DOT[c.type] ?? "bg-muted-foreground"}`} />
                    <span>
                      <span className="capitalize text-muted-foreground text-xs font-medium mr-1.5">{c.type}</span>
                      {c.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
