"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Trash2, Ban, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

interface AdminWorkspace {
  id: string; name: string; planId: string; subscriptionStatus: string | null;
  isActive: boolean; createdAt: string;
  userCount: number; campaignCount: number; contactCount: number; messageCount: number;
}

const PLAN_COLORS: Record<string, string> = {
  free:       "bg-gray-500/10 text-gray-500 border-gray-500/20",
  starter:    "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pro:        "bg-purple-500/10 text-purple-500 border-purple-500/20",
  enterprise: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [plan, setPlan]             = useState("all");
  const [page, setPage]             = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<AdminWorkspace | null>(null);
  const [actioning, setActioning]   = useState<string | null>(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
    if (search) params.set("search", search);
    if (plan !== "all") params.set("plan", plan);
    const res = await fetch(`/api/admin/workspaces?${params}`);
    const data = await res.json();
    setWorkspaces(data.workspaces ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [search, plan, page]);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setActioning(id);
    await fetch(`/api/admin/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setActioning(null);
    load();
  }

  async function deleteWs(id: string) {
    setActioning(id);
    await fetch(`/api/admin/workspaces/${id}`, { method: "DELETE" });
    setActioning(null);
    setConfirmDelete(null);
    load();
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground text-sm">{total.toLocaleString()} workspaces on the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workspace name…"
              className="pl-9"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={plan} onValueChange={v => { setPlan(v); setPage(0); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Sub Status</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead className="text-right">Campaigns</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : workspaces.map(ws => (
                    <TableRow key={ws.id} className={`border-border/50 ${!ws.isActive ? "opacity-60" : ""}`}>
                      <TableCell className="font-medium text-sm">{ws.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${PLAN_COLORS[ws.planId] ?? ""}`}>
                          {ws.planId}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${
                          ws.subscriptionStatus === "active"   ? "bg-green-500/10 text-green-600 border-green-500/20" :
                          ws.subscriptionStatus === "past_due" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                          ws.subscriptionStatus === "canceled" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          "bg-gray-500/10 text-gray-500 border-gray-500/20"
                        }`}>
                          {ws.subscriptionStatus ?? "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{ws.userCount}</TableCell>
                      <TableCell className="text-right text-sm">{ws.contactCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{ws.campaignCount}</TableCell>
                      <TableCell className="text-right text-sm">{ws.messageCount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(ws.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            disabled={actioning === ws.id}
                            onClick={() => patch(ws.id, { isActive: !ws.isActive })}
                            title={ws.isActive ? "Deactivate" : "Activate"}
                          >
                            {ws.isActive
                              ? <Ban className="h-3.5 w-3.5 text-orange-500" />
                              : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            }
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setConfirmDelete(ws)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete workspace <strong className="text-foreground">{confirmDelete?.name}</strong> and all its data? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={actioning === confirmDelete?.id} onClick={() => confirmDelete && deleteWs(confirmDelete.id)}>
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
