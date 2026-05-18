"use client";

import { useSession } from "next-auth/react";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RecentCampaigns } from "@/components/dashboard/recent-campaigns";
import { WhatsAppStatusCard } from "@/components/dashboard/whatsapp-status-card";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";

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
