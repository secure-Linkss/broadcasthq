"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Shield, Edit3, Eye, Trash2, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";

interface Member {
  id:         string;
  name:       string | null;
  email:      string;
  role:       string;
  status:     string;
  lastActive: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-500/20",
  owner:       "bg-primary/10 text-primary border-primary/30",
  admin:       "bg-green-500/10 text-green-600 border-green-500/20",
  editor:      "bg-blue-500/10 text-blue-500 border-blue-500/20",
  viewer:      "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export default function TeamPage() {
  const { data: session } = useSession();
  const [members, setMembers]         = useState<Member[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm]   = useState({ name: "", email: "", role: "editor" });
  const [inviting, setInviting]       = useState(false);
  const [removingId, setRemovingId]   = useState<string | null>(null);

  const myRole = session?.user?.role ?? "";
  const canManage = ["owner", "admin", "super_admin"].includes(myRole);

  const load = () => {
    setLoading(true);
    fetch("/api/team")
      .then(r => r.ok ? r.json() : [])
      .then(setMembers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const res  = await fetch("/api/team", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Invitation sent to ${inviteForm.email}.`);
        setIsInviteOpen(false);
        setInviteForm({ name: "", email: "", role: "editor" });
        load();
      } else {
        toast.error(data.error ?? "Failed to send invite.");
      }
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const res  = await fetch(`/api/team/${memberId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Role updated.");
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } else {
      toast.error(data.error ?? "Failed to update role.");
    }
  };

  const handleRemove = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from this workspace?`)) return;
    setRemovingId(memberId);
    try {
      const res  = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Member removed.");
        setMembers(prev => prev.filter(m => m.id !== memberId));
      } else {
        toast.error(data.error ?? "Failed to remove member.");
      }
    } finally {
      setRemovingId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner" || role === "super_admin") return <Shield className="h-3 w-3 mr-1 text-primary" />;
    if (role === "admin")  return <Shield className="h-3 w-3 mr-1 text-green-600" />;
    if (role === "editor") return <Edit3  className="h-3 w-3 mr-1 text-blue-500" />;
    return <Eye className="h-3 w-3 mr-1 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
          <p className="text-muted-foreground">Manage who has access to this workspace.</p>
        </div>

        {canManage && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-border">
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>They will receive a temporary password to log in.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="inviteName">Full Name</Label>
                    <Input
                      id="inviteName"
                      value={inviteForm.name}
                      onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="bg-background"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inviteEmail">Email address</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="colleague@company.com"
                      className="bg-background"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="inviteRole">Role</Label>
                    <select
                      id="inviteRole"
                      value={inviteForm.role}
                      onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : "Send Invite"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Active</TableHead>
              {canManage && <TableHead className="w-[70px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  {canManage && <TableCell />}
                </TableRow>
              ))
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="h-24 text-center text-muted-foreground">
                  No team members found.
                </TableCell>
              </TableRow>
            ) : (
              members.map(member => (
                <TableRow key={member.id} className="border-border/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {(member.name ?? member.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{member.name ?? "Pending User"}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize text-xs ${ROLE_COLORS[member.role] ?? ""}`}>
                      <span className="flex items-center">{getRoleIcon(member.role)}{member.role.replace("_", " ")}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.status === "active" ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Invited</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.lastActive ? format(new Date(member.lastActive), "MMM d, yyyy") : "Never"}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={removingId === member.id}>
                            {removingId === member.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                          {["admin", "editor", "viewer"].filter(r => r !== member.role).map(r => (
                            <DropdownMenuItem key={r} onClick={() => handleRoleChange(member.id, r)} className="capitalize">
                              Set as {r}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleRemove(member.id, member.email)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role reference */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Role Permissions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-2 flex items-center"><Shield className="h-3 w-3 mr-2 text-green-600" /> Admin</h4>
            <p className="text-muted-foreground">Manage billing, settings, team members, and full campaign functionality.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2 flex items-center"><Edit3 className="h-3 w-3 mr-2 text-blue-500" /> Editor</h4>
            <p className="text-muted-foreground">Create and launch campaigns, manage contacts and templates. Cannot manage billing or team.</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-2 flex items-center"><Eye className="h-3 w-3 mr-2 text-muted-foreground" /> Viewer</h4>
            <p className="text-muted-foreground">View-only: analytics, past campaigns, and read-only inbox.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
