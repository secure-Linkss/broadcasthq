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
import { Search, RefreshCw, Trash2, Ban, CheckCircle2, ChevronLeft, ChevronRight, Plus, UserPlus, CreditCard, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

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

  // Create workspace dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", planId: "free", ownerEmail: "", ownerName: "" });
  const [creating, setCreating]     = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; wsName: string } | null>(null);
  const [copied, setCopied]         = useState(false);

  // Add user to workspace dialog
  const [addUserWs, setAddUserWs]   = useState<AdminWorkspace | null>(null);
  const [addUserForm, setAddUserForm] = useState({ email: "", name: "", role: "editor" });
  const [addingUser, setAddingUser] = useState(false);
  const [addedCreds, setAddedCreds] = useState<{ email: string; password: string } | null>(null);

  // Change plan dialog
  const [planWs, setPlanWs]         = useState<AdminWorkspace | null>(null);
  const [newPlan, setNewPlan]       = useState("free");
  const [newStatus, setNewStatus]   = useState("active");

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
    const res = await fetch(`/api/admin/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setActioning(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Failed to update workspace."); return; }
    toast.success("Workspace updated.");
    load();
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res  = await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create workspace."); return; }
      toast.success(`Workspace "${createForm.name}" created.`);
      setCreateOpen(false);
      setCreateForm({ name: "", planId: "free", ownerEmail: "", ownerName: "" });
      if (data.tempPassword) setCreatedCreds({ email: data.owner.email, password: data.tempPassword, wsName: data.workspace.name });
      load();
    } finally {
      setCreating(false);
    }
  }

  async function addUserToWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!addUserWs) return;
    setAddingUser(true);
    try {
      const res  = await fetch(`/api/admin/workspaces/${addUserWs.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addUserForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add user."); return; }
      toast.success(`User ${data.user.email} added to ${addUserWs.name}.`);
      setAddUserWs(null);
      setAddUserForm({ email: "", name: "", role: "editor" });
      if (data.tempPassword) setAddedCreds({ email: data.user.email, password: data.tempPassword });
      load();
    } finally {
      setAddingUser(false);
    }
  }

  async function changePlan() {
    if (!planWs) return;
    await patch(planWs.id, { planId: newPlan, subscriptionStatus: newStatus });
    setPlanWs(null);
  }

  async function deleteWs(id: string) {
    setActioning(id);
    const res = await fetch(`/api/admin/workspaces/${id}`, { method: "DELETE" });
    setActioning(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error ?? "Failed to delete workspace."); return; }
    toast.success("Workspace deleted.");
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Workspace
          </Button>
        </div>
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
                            title="Add User"
                            onClick={() => { setAddUserWs(ws); setAddUserForm({ email: "", name: "", role: "editor" }); }}
                          >
                            <UserPlus className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7"
                            title="Change Plan"
                            onClick={() => { setPlanWs(ws); setNewPlan(ws.planId); setNewStatus(ws.subscriptionStatus ?? "inactive"); }}
                          >
                            <CreditCard className="h-3.5 w-3.5 text-purple-500" />
                          </Button>
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

      {/* Delete confirmation */}
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

      {/* Create Workspace */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setCreateForm({ name: "", planId: "free", ownerEmail: "", ownerName: "" }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={createWorkspace} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Workspace Name *</Label>
              <Input placeholder="Acme Corp" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={createForm.planId} onValueChange={v => setCreateForm(f => ({ ...f, planId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner Email <span className="text-muted-foreground">(optional)</span></Label>
              <Input type="email" placeholder="owner@company.com" value={createForm.ownerEmail} onChange={e => setCreateForm(f => ({ ...f, ownerEmail: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input placeholder="Jane Smith" value={createForm.ownerName} onChange={e => setCreateForm(f => ({ ...f, ownerName: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Created credentials */}
      <Dialog open={!!createdCreds} onOpenChange={() => { setCreatedCreds(null); setCopied(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Workspace Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share these one-time credentials with the workspace owner. The password cannot be retrieved again.</p>
            <div className="rounded-md bg-muted p-3 font-mono text-sm space-y-1">
              <div><span className="text-muted-foreground">Workspace: </span><strong>{createdCreds?.wsName}</strong></div>
              <div><span className="text-muted-foreground">Email: </span>{createdCreds?.email}</div>
              <div><span className="text-muted-foreground">Password: </span>{createdCreds?.password}</div>
            </div>
            <Button
              variant="outline" className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${createdCreds?.email}\nPassword: ${createdCreds?.password}`);
                setCopied(true);
              }}
            >
              {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setCreatedCreds(null); setCopied(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User to Workspace */}
      <Dialog open={!!addUserWs} onOpenChange={v => { if (!v) setAddUserWs(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User to {addUserWs?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={addUserToWorkspace} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="user@example.com" value={addUserForm.email} onChange={e => setAddUserForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input placeholder="Jane Smith" value={addUserForm.name} onChange={e => setAddUserForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addUserForm.role} onValueChange={v => setAddUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddUserWs(null)}>Cancel</Button>
              <Button type="submit" disabled={addingUser}>
                {addingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Added user credentials */}
      <Dialog open={!!addedCreds} onOpenChange={() => { setAddedCreds(null); setCopied(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Added</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share these one-time credentials with the user. The password cannot be retrieved again.</p>
            <div className="rounded-md bg-muted p-3 font-mono text-sm space-y-1">
              <div><span className="text-muted-foreground">Email: </span>{addedCreds?.email}</div>
              <div><span className="text-muted-foreground">Password: </span>{addedCreds?.password}</div>
            </div>
            <Button
              variant="outline" className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${addedCreds?.email}\nPassword: ${addedCreds?.password}`);
                setCopied(true);
              }}
            >
              {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => { setAddedCreds(null); setCopied(false); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan / Subscription */}
      <Dialog open={!!planWs} onOpenChange={v => { if (!v) setPlanWs(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Plan — {planWs?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subscription Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanWs(null)}>Cancel</Button>
            <Button disabled={actioning === planWs?.id} onClick={changePlan}>
              {actioning === planWs?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
