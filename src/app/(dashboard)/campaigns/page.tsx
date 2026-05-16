"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Campaign } from "@/types";
import { CampaignsDataTable } from "@/components/campaigns/campaigns-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    api.campaigns.list().then((res) => {
      setCampaigns(res);
      setIsLoading(false);
    });
  }, []);

  const counts = {
    all: campaigns.length,
    running: campaigns.filter((c) => c.status === "running").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    draft: campaigns.filter((c) => c.status === "draft").length,
  };

  const filteredCampaigns = campaigns.filter(c => 
    activeFilter === "all" ? true : c.status === activeFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">
            Manage and track your broadcast campaigns.
          </p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={activeFilter === "all" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setActiveFilter("all")}
        >
          All ({counts.all})
        </Badge>
        <Badge 
          variant={activeFilter === "running" ? "default" : "outline"} 
          className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
          onClick={() => setActiveFilter("running")}
        >
          Running ({counts.running})
        </Badge>
        <Badge 
          variant={activeFilter === "scheduled" ? "default" : "outline"} 
          className="cursor-pointer bg-warning/10 text-warning hover:bg-warning/20 border-warning/20"
          onClick={() => setActiveFilter("scheduled")}
        >
          Scheduled ({counts.scheduled})
        </Badge>
        <Badge 
          variant={activeFilter === "completed" ? "default" : "outline"} 
          className="cursor-pointer bg-success/10 text-success hover:bg-success/20 border-success/20"
          onClick={() => setActiveFilter("completed")}
        >
          Completed ({counts.completed})
        </Badge>
        <Badge 
          variant={activeFilter === "draft" ? "default" : "outline"} 
          className="cursor-pointer"
          onClick={() => setActiveFilter("draft")}
        >
          Draft ({counts.draft})
        </Badge>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search campaigns..."
              className="pl-9 bg-card"
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 bg-card">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1 shrink-0">
          <Button 
            variant={view === "list" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 px-2"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button 
            variant={view === "grid" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 px-2"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </div>
      ) : (
        <>
          {view === "list" ? (
            <CampaignsDataTable data={filteredCampaigns} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Simplified Grid View for brevity */}
              {filteredCampaigns.map(c => (
                <div key={c.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer flex flex-col justify-between min-h-[160px]">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg hover:underline">{c.name}</h3>
                      <Badge variant="outline">{c.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      {c.recipientsCount.toLocaleString()} recipients
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
                    <span>Del: {c.deliveryRate}%</span>
                    <span>Read: {c.readRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
