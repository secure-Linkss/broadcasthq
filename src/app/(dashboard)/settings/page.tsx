"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Smartphone, ShieldCheck, Link2, Key, Bell, Building, Eye, EyeOff,
  Copy, CheckCheck, AlertTriangle, Loader2, Plus, Trash2, RotateCcw,
  Code2, Clock, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const tabs = [
  { id: "workspace",  label: "Workspace",      icon: Building   },
  { id: "whatsapp",   label: "WhatsApp",        icon: Smartphone },
  { id: "api-keys",   label: "API Keys",        icon: Code2      },
  { id: "notifications", label: "Notifications", icon: Bell      },
  { id: "security",   label: "Security",        icon: Key        },
];

interface WaConnection {
  isConnected:        boolean;
  phoneNumber:        string | null;
  wabaId:             string | null;
  phoneNumberId:      string | null;
  verificationStatus: string | null;
  qualityRating:      string | null;
  messagingLimit:     string | null;
}

interface WorkspaceData {
  id:   string;
  name: string;
}

interface ApiKey {
  id:          string;
  name:        string;
  keyPrefix:   string;
  permissions: Record<string, string[]>;
  isActive:    boolean;
  lastUsedAt:  string | null;
  expiresAt:   string | null;
  createdAt:   string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("workspace");

  // Workspace
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [wsName, setWsName]       = useState("");
  const [wsSaving, setWsSaving]   = useState(false);
  const [wsLoading, setWsLoading] = useState(true);

  // WhatsApp
  const [waData, setWaData]               = useState<WaConnection | null>(null);
  const [waLoading, setWaLoading]         = useState(true);
  const [waConnecting, setWaConnecting]   = useState(false);
  const [waDisconnecting, setWaDisconnecting] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [waForm, setWaForm] = useState({ wabaId: "", phoneNumberId: "", accessToken: "" });

  // API Keys
  const [apiKeys, setApiKeys]           = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading]   = useState(true);
  const [newKeyName, setNewKeyName]     = useState("");
  const [creatingKey, setCreatingKey]   = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey]       = useState<string | null>(null);

  // Security
  const [pwForm, setPwForm]           = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving]       = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]       = useState(false);

  // Generic copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

  const loadKeys = useCallback(() => {
    setKeysLoading(true);
    fetch("/api/keys")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setApiKeys(d.keys ?? []))
      .catch(() => {})
      .finally(() => setKeysLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/settings/workspace")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setWorkspace(d); setWsName(d.name); } })
      .finally(() => setWsLoading(false));

    fetch("/api/settings/whatsapp")
      .then(r => r.ok ? r.json() : null)
      // API returns { status: {...} } — unwrap it
      .then(d => { if (d?.status) setWaData(d.status); })
      .finally(() => setWaLoading(false));

    loadKeys();
  }, [loadKeys]);

  const canManage = session?.user?.role
    ? ["owner", "admin", "super_admin"].includes(session.user.role)
    : false;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const saveWorkspaceName = async () => {
    if (!wsName.trim()) return;
    setWsSaving(true);
    try {
      const res  = await fetch("/api/settings/workspace", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: wsName.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setWorkspace(data); toast.success("Workspace name updated."); }
      else         toast.error(data.error ?? "Failed to save.");
    } finally {
      setWsSaving(false);
    }
  };

  const connectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaConnecting(true);
    try {
      const res  = await fetch("/api/settings/whatsapp/connect", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(waForm),
      });
      const data = await res.json();
      if (res.ok) {
        // Re-fetch status to get fresh data
        const status = await fetch("/api/settings/whatsapp").then(r => r.json());
        setWaData(status?.status ?? null);
        setShowConnectForm(false);
        setWaForm({ wabaId: "", phoneNumberId: "", accessToken: "" });
        toast.success("WhatsApp connected and verified.");
      } else {
        toast.error(data.error ?? "Connection failed.");
      }
    } finally {
      setWaConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => {
    setWaDisconnecting(true);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: false }),
      });
      if (res.ok) {
        setWaData(prev => prev ? { ...prev, isConnected: false } : null);
        toast.success("WhatsApp disconnected.");
      } else {
        toast.error("Failed to disconnect.");
      }
    } finally {
      setWaDisconnecting(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res  = await fetch("/api/keys", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevealedSecret(data.secret);
        setNewKeyName("");
        setShowNewKeyDialog(false);
        loadKeys();
      } else {
        toast.error(data.error ?? "Failed to create key.");
      }
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    setDeletingKeyId(id);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) { setApiKeys(prev => prev.filter(k => k.id !== id)); toast.success("API key revoked."); }
      else          toast.error("Failed to revoke key.");
    } finally {
      setDeletingKeyId(null);
    }
  };

  const toggleKeyActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/keys/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ isActive }),
    });
    if (res.ok) {
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, isActive } : k));
      toast.success(isActive ? "Key re-enabled." : "Key disabled.");
    } else {
      toast.error("Failed to update key.");
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { toast.error("New passwords do not match."); return; }
    if (pwForm.next.length < 8)         { toast.error("Password must be at least 8 characters."); return; }
    setPwSaving(true);
    try {
      const res  = await fetch("/api/auth/change-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (res.ok) { setPwForm({ current: "", next: "", confirm: "" }); toast.success("Password updated."); }
      else          toast.error(data.error ?? "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  const webhookUrl = `${appUrl}/api/webhooks/meta`;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your workspace preferences and integrations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "secondary" : "ghost"}
                className={cn("justify-start shrink-0", activeTab === tab.id ? "bg-primary/10 text-primary hover:bg-primary/20" : "")}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 space-y-6">

          {/* ── Workspace ── */}
          {activeTab === "workspace" && (
            <Card>
              <CardHeader>
                <CardTitle>Workspace Profile</CardTitle>
                <CardDescription>Update your workspace display name.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {wsLoading ? (
                  <Skeleton className="h-10 max-w-md" />
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="wsName">Workspace Name</Label>
                    <Input
                      id="wsName"
                      value={wsName}
                      onChange={e => setWsName(e.target.value)}
                      disabled={!canManage}
                      className="bg-background max-w-md"
                    />
                    {!canManage && (
                      <p className="text-xs text-muted-foreground">Only owners and admins can edit workspace settings.</p>
                    )}
                  </div>
                )}
              </CardContent>
              {canManage && (
                <CardFooter className="border-t border-border pt-6">
                  <Button onClick={saveWorkspaceName} disabled={wsSaving || wsLoading}>
                    {wsSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Changes"}
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}

          {/* ── WhatsApp ── */}
          {activeTab === "whatsapp" && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>WhatsApp Business API</CardTitle>
                    <CardDescription>Connect your Meta Cloud API to send bulk messages to customers.</CardDescription>
                  </div>
                  {waLoading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <Badge variant="outline" className={
                      waData?.isConnected
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                    }>
                      {waData?.isConnected ? "Connected" : "Not Connected"}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  {waLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                    </div>
                  ) : waData?.isConnected ? (
                    <>
                      <div className="flex items-center gap-4 p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                        <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Smartphone className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{waData.phoneNumber ?? "—"}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                            {waData.verificationStatus === "verified"
                              ? "Verified Business Account"
                              : waData.verificationStatus ?? "Pending verification"}
                          </p>
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-1">
                          {waData.qualityRating && (
                            <Badge variant="outline">Quality: {waData.qualityRating}</Badge>
                          )}
                          {waData.messagingLimit && (
                            <span className="text-xs text-muted-foreground">Limit: {waData.messagingLimit}</span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>WABA ID</Label>
                          <Input value={waData.wabaId ?? ""} readOnly className="bg-muted font-mono text-muted-foreground" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Phone Number ID</Label>
                          <Input value={waData.phoneNumberId ?? ""} readOnly className="bg-muted font-mono text-muted-foreground" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-500/30 bg-orange-500/5">
                      <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-600">No WhatsApp account connected</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You need a Meta WhatsApp Business Account (WABA) to send bulk messages.
                          Get your credentials from the <strong>Meta for Developers</strong> console under WhatsApp → API Setup.
                        </p>
                      </div>
                    </div>
                  )}

                  {showConnectForm && canManage && (
                    <form onSubmit={connectWhatsApp} className="space-y-4 pt-4 border-t border-border">
                      <p className="text-sm font-medium">Enter Meta Cloud API credentials</p>
                      <div className="grid gap-2">
                        <Label htmlFor="wabaId">WABA ID</Label>
                        <Input
                          id="wabaId"
                          placeholder="123456789012345"
                          value={waForm.wabaId}
                          onChange={e => setWaForm(f => ({ ...f, wabaId: e.target.value }))}
                          required
                          className="bg-background font-mono"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                        <Input
                          id="phoneNumberId"
                          placeholder="123456789012345"
                          value={waForm.phoneNumberId}
                          onChange={e => setWaForm(f => ({ ...f, phoneNumberId: e.target.value }))}
                          required
                          className="bg-background font-mono"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="accessToken">Permanent Access Token</Label>
                        <Input
                          id="accessToken"
                          type="password"
                          placeholder="EAAxxxxxxxxxx..."
                          value={waForm.accessToken}
                          onChange={e => setWaForm(f => ({ ...f, accessToken: e.target.value }))}
                          required
                          className="bg-background font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          Generate a permanent token in Meta Business Manager → System Users → Generate Token.
                          Your credentials are verified live against the Meta Graph API before being saved.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={waConnecting}>
                          {waConnecting
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying with Meta…</>
                            : "Connect & Verify"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setShowConnectForm(false)}>Cancel</Button>
                      </div>
                    </form>
                  )}
                </CardContent>

                {canManage && (
                  <CardFooter className="border-t border-border pt-6 flex justify-between">
                    {waData?.isConnected ? (
                      <>
                        <Button
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                          onClick={disconnectWhatsApp}
                          disabled={waDisconnecting}
                        >
                          {waDisconnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Disconnecting…</> : "Disconnect"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowConnectForm(v => !v)}>
                          <Link2 className="mr-2 h-4 w-4" /> Update Credentials
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setShowConnectForm(v => !v)}>
                        <Link2 className="mr-2 h-4 w-4" /> Connect WhatsApp
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>

              {/* Webhook config */}
              <Card>
                <CardHeader>
                  <CardTitle>Webhook Configuration</CardTitle>
                  <CardDescription>
                    Set these in your Meta App Dashboard under WhatsApp → Configuration to receive delivery receipts and inbound replies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Callback URL</Label>
                    <div className="flex gap-2">
                      <Input value={webhookUrl} readOnly className="bg-muted font-mono text-muted-foreground text-xs" />
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => copyToClipboard(webhookUrl, "webhook")}
                      >
                        {copiedField === "webhook" ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Verify Token</Label>
                    <div className="flex gap-2">
                      <Input
                        value={process.env.NEXT_PUBLIC_META_VERIFY_TOKEN ?? "(set META_WEBHOOK_VERIFY_TOKEN in env)"}
                        readOnly
                        className="bg-muted font-mono text-muted-foreground text-xs"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_META_VERIFY_TOKEN ?? "", "verify")}
                      >
                        {copiedField === "verify" ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground text-sm">Subscribed Fields</p>
                    <p>Enable these webhook fields: <code className="bg-muted px-1 rounded">messages</code>, <code className="bg-muted px-1 rounded">message_deliveries</code>, <code className="bg-muted px-1 rounded">message_reads</code></p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── API Keys ── */}
          {activeTab === "api-keys" && (
            <div className="space-y-6">
              {/* Revealed secret banner */}
              {revealedSecret && (
                <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                    <p className="text-sm font-semibold text-yellow-700">Copy your API key now — it will not be shown again.</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={revealedSecret}
                      readOnly
                      className="font-mono text-xs bg-background border-yellow-500/30"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(revealedSecret);
                        setCopiedKey(revealedSecret);
                        setTimeout(() => setCopiedKey(null), 2000);
                      }}
                    >
                      {copiedKey === revealedSecret ? <CheckCheck className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setRevealedSecret(null)}>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </Button>
                  </div>
                </div>
              )}

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>
                      Generate keys to access BroadcastHQ via the REST API. Keys grant access to campaigns, contacts, messages, and analytics.
                    </CardDescription>
                  </div>
                  {canManage && (
                    <Button size="sm" onClick={() => setShowNewKeyDialog(true)} className="shrink-0">
                      <Plus className="mr-2 h-4 w-4" /> Generate Key
                    </Button>
                  )}
                </CardHeader>

                <CardContent>
                  {keysLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-14" />
                      ))}
                    </div>
                  ) : apiKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Code2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium">No API keys yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Generate a key to start using the BroadcastHQ API.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map(key => (
                        <div key={key.id} className="flex items-start gap-4 p-3 rounded-lg border border-border bg-muted/20">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{key.name}</p>
                              <Badge
                                variant="outline"
                                className={key.isActive
                                  ? "bg-green-500/10 text-green-600 border-green-500/20 text-[10px]"
                                  : "bg-gray-500/10 text-gray-500 border-gray-500/20 text-[10px]"}
                              >
                                {key.isActive ? "Active" : "Disabled"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <code className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                                {key.keyPrefix}••••••••••••••••
                              </code>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Created {format(new Date(key.createdAt), "MMM d, yyyy")}
                              </span>
                              {key.lastUsedAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  Last used {format(new Date(key.lastUsedAt), "MMM d")}
                                </span>
                              )}
                              {key.expiresAt && (
                                <span className="text-[10px] text-orange-500">
                                  Expires {format(new Date(key.expiresAt), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(key.permissions).map(([resource, perms]) => (
                                <Badge key={resource} variant="secondary" className="text-[9px] px-1.5 h-4">
                                  {resource}:{perms.join(",")}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                                title={key.isActive ? "Disable key" : "Enable key"}
                                onClick={() => toggleKeyActive(key.id, !key.isActive)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                title="Revoke key"
                                disabled={deletingKeyId === key.id}
                                onClick={() => revokeApiKey(key.id)}
                              >
                                {deletingKeyId === key.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* API reference box */}
              <Card className="border-dashed">
                <CardContent className="pt-6 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" /> Quick Start
                  </p>
                  <div className="rounded-md bg-muted p-3 font-mono text-xs space-y-1 text-muted-foreground overflow-x-auto">
                    <p><span className="text-blue-400">GET</span>  {appUrl}/api/v1/contacts</p>
                    <p><span className="text-blue-400">POST</span> {appUrl}/api/v1/campaigns</p>
                    <p><span className="text-blue-400">POST</span> {appUrl}/api/v1/campaigns/:id/run</p>
                    <p><span className="text-blue-400">GET</span>  {appUrl}/api/v1/analytics</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pass your key in the <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;key&gt;</code> header.
                    Full docs available at <a href="/docs" className="text-primary underline">/docs</a>.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what updates you want to receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { label: "Campaign Completion", desc: "Notify when a campaign finishes sending.", def: true  },
                  { label: "New Inbox Messages",  desc: "Desktop notification for new replies.",  def: true  },
                  { label: "Billing Alerts",       desc: "Alerts when approaching usage limits.",  def: true  },
                  { label: "Low Delivery Rate",    desc: "Alert when a campaign drops below 60% delivery.", def: true },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={item.def} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Security ── */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Use a strong, unique password.</CardDescription>
              </CardHeader>
              <form onSubmit={changePassword}>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="currentPw">Current Password</Label>
                    <div className="relative">
                      <Input
                        id="currentPw"
                        type={showCurrent ? "text" : "password"}
                        value={pwForm.current}
                        onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                        required
                        className="bg-background pr-10"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCurrent(v => !v)}>
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="newPw">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPw"
                        type={showNext ? "text" : "password"}
                        value={pwForm.next}
                        onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                        required
                        minLength={8}
                        className="bg-background pr-10"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNext(v => !v)}>
                        {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 max-w-md">
                    <Label htmlFor="confirmPw">Confirm New Password</Label>
                    <Input
                      id="confirmPw"
                      type="password"
                      value={pwForm.confirm}
                      onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      required
                      className="bg-background"
                    />
                    {pwForm.confirm && pwForm.next !== pwForm.confirm && (
                      <p className="text-xs text-destructive">Passwords do not match.</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border pt-6">
                  <Button type="submit" disabled={pwSaving}>
                    {pwSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating…</> : "Update Password"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>
      </div>

      {/* ── New API Key Dialog ── */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Give your key a descriptive name. The secret will only be shown once after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Label htmlFor="keyName">Key Name</Label>
            <Input
              id="keyName"
              placeholder="e.g. Production Integration, Zapier, Internal Script"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createApiKey()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>Cancel</Button>
            <Button onClick={createApiKey} disabled={creatingKey || !newKeyName.trim()}>
              {creatingKey ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : "Generate Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
