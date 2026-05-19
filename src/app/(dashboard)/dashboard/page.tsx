"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RecentCampaigns } from "@/components/dashboard/recent-campaigns";
import { WhatsAppStatusCard } from "@/components/dashboard/whatsapp-status-card";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Button } from "@/components/ui/button";
import { Plus, Upload, AlertTriangle, XCircle, CreditCard } from "lucide-react";
import Link from "next/link";

interface WorkspaceBilling {
  planId: string;
  subscriptionStatus: string | null;
  billingPeriodEnd: string | null;
}

function SubscriptionBanner() {
  const [billing, setBilling] = useState<WorkspaceBilling | null>(null);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    fetch("/api/billing/workspace").then(r => r.json()).then(setBilling).catch(() => {});
  }, []);

  if (!billing || billing.planId === "free") return null;

  const status = billing.subscriptionStatus;
  const periodEnd = billing.billingPeriodEnd ? new Date(billing.billingPeriodEnd) : null;
  const daysLeft = periodEnd ? Math.ceil((periodEnd.getTime() - Date.now()) / 86_400_000) : null;
  const expiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0 && status === "active";
  const isPastDue   = status === "past_due";
  const isCanceled  = status === "canceled";
  const canBill     = role && ["owner", "admin", "super_admin"].includes(role);

  if (!expiringSoon && !isPastDue && !isCanceled) return null;

  const config = isCanceled
    ? { bg: "bg-red-500/10 border-red-500/30",   icon: XCircle,       iconClass: "text-red-500",    text: "Your subscription has been canceled. Your account will downgrade to free at the end of the billing period." }
    : isPastDue
    ? { bg: "bg-orange-500/10 border-orange-500/30", icon: AlertTriangle, iconClass: "text-orange-500", text: "Your payment is past due. Please update your payment method to avoid service interruption." }
    : { bg: "bg-yellow-500/10 border-yellow-500/30", icon: AlertTriangle, iconClass: "text-yellow-500", text: `Your ${billing.planId} plan expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew to keep your features.` };

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bg}`}>
      <Icon className={`h-4 w-4 shrink-0 ${config.iconClass}`} />
      <p className="text-sm flex-1">{config.text}</p>
      {canBill && (
        <Button size="sm" variant="outline" className="gap-1 shrink-0" asChild>
          <Link href="/billing"><CreditCard className="h-3.5 w-3.5" /> Manage Billing</Link>
        </Button>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const rawFirst  = session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0] ?? "";
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {firstName ? `${getGreeting()}, ${firstName}` : "Overview"}
          </h2>
          <p className="text-muted-foreground">
            Monitor your messaging performance and account health.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/contacts/import">
              <Upload className="mr-2 h-4 w-4" />
              Import Contacts
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* Subscription health banner */}
      <SubscriptionBanner />

      {/* KPI cards */}
      <KpiCards />

      {/* Smart alerts */}
      <AlertsWidget />

      {/* Main chart + recent campaigns */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-4 lg:grid-cols-7">
        <PerformanceChart />
        <RecentCampaigns />
      </div>

      {/* Bottom row: WhatsApp status + activity feed */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <WhatsAppStatusCard />
        <div className="col-span-2">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
