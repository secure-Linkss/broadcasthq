"use client";

import { useState } from "react";
import { Campaign } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, Play, Copy, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { format } from "date-fns";

interface CampaignsDataTableProps {
  data: Campaign[];
}

export function CampaignsDataTable({ data }: CampaignsDataTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success/20 text-success border-success/20";
      case "running": return "bg-primary/20 text-primary border-primary/20";
      case "scheduled": return "bg-warning/20 text-warning border-warning/20";
      case "draft": return "bg-muted text-muted-foreground border-border";
      default: return "bg-destructive/20 text-destructive border-destructive/20";
    }
  };

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead>Campaign Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Delivery / Read</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No campaigns found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((campaign) => (
              <TableRow key={campaign.id} className="border-border/50">
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <Link href={`/campaigns/${campaign.id}`} className="hover:underline hover:text-primary transition-colors">
                      {campaign.name}
                    </Link>
                    <div className="flex gap-1 mt-1">
                      {campaign.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(campaign.status)}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {campaign.recipientsCount.toLocaleString()}
                </TableCell>
                <TableCell>
                  {campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-muted-foreground">Del:</span>
                        <span className="font-medium text-success">{campaign.deliveryRate}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-12 text-muted-foreground">Read:</span>
                        <span className="font-medium text-secondary">{campaign.readRate}%</span>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {campaign.sentDate 
                    ? format(new Date(campaign.sentDate), 'MMM d, yyyy') 
                    : campaign.scheduledDate 
                      ? format(new Date(campaign.scheduledDate), 'MMM d, yyyy')
                      : format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/campaigns/${campaign.id}`}>
                          <FileText className="mr-2 h-4 w-4" /> View Details
                        </Link>
                      </DropdownMenuItem>
                      {campaign.status === 'draft' && (
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" /> Launch
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
