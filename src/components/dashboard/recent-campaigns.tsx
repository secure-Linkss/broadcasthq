"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Campaign } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function RecentCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.campaigns.list().then((res) => {
      setCampaigns(res.slice(0, 4)); // Get top 4
      setIsLoading(false);
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/20 text-success hover:bg-success/30 border-success/20";
      case "running": return "bg-primary/20 text-primary hover:bg-primary/30 border-primary/20";
      case "scheduled": return "bg-warning/20 text-warning hover:bg-warning/30 border-warning/20";
      case "draft": return "bg-muted text-muted-foreground hover:bg-muted/80 border-border";
      default: return "bg-destructive/20 text-destructive border-destructive/20";
    }
  };

  return (
    <Card className="col-span-3 bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>Your latest broadcast activity</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
          <Link href="/campaigns">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-6 w-[80px]" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="border-border/50 hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <Link href={`/campaigns/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(c.status)}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {c.recipientsCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
