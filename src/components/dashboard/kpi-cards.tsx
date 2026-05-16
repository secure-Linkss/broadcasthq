"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AnalyticsSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, MessageSquare, CheckCircle2, Eye, Activity, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCards() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.analytics.getSummary().then((res) => {
      setData(res);
      setIsLoading(false);
    });
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const kpis = [
    {
      title: "Total Messages",
      value: data ? formatNumber(data.totalMessagesSent) : "0",
      change: "+12.5%",
      isPositive: true,
      icon: MessageSquare,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Delivery Rate",
      value: data ? `${data.deliveryRate}%` : "0%",
      change: "+1.2%",
      isPositive: true,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Read Rate",
      value: data ? `${data.readRate}%` : "0%",
      change: "-0.5%",
      isPositive: false,
      icon: Eye,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      title: "Active Campaigns",
      value: data?.activeCampaigns.toString() || "0",
      change: "+3",
      isPositive: true,
      icon: Activity,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Monthly Spend",
      value: data ? `$${data.monthlySpend}` : "$0",
      change: "-$45",
      isPositive: true, // less spend is good in some contexts, but let's assume it's positive trend
      icon: CreditCard,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[80px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi, index) => (
        <Card key={index} className="bg-card hover:bg-muted/50 transition-colors border-border/50 shadow-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="flex items-center text-xs mt-1">
              <span
                className={`flex items-center font-medium ${
                  kpi.isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {kpi.isPositive ? (
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                )}
                {kpi.change}
              </span>
              <span className="ml-2 text-muted-foreground">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
