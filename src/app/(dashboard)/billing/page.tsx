"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Zap, ExternalLink, AlertTriangle, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PLAN_FEATURES: Record<string, string[]> = {
  free:       ["1,000 messages/month", "500 contacts", "5 campaigns", "1 user seat", "Basic analytics"],
  starter:    ["10,000 messages/month", "5,000 contacts", "20 campaigns", "3 user seats", "API access", "Standard analytics"],
  pro:        ["50,000 messages/month", "25,000 contacts", "Unlimited campaigns", "10 user seats", "AI smart import", "Priority support", "Advanced analytics"],
  enterprise: ["Unlimited messages", "Unlimited contacts", "Unlimited campaigns", "Unlimited seats", "Custom domain", "Dedicated support", "SLA guarantee"],
};

const PLAN_PRICES: Record<string, number> = { free: 0, starter: 29, pro: 79, enterprise: 199 };
const PLAN_LIMITS: Record<string, { contacts: number; messages: number; campaigns: number }> = {
  free:       { contacts: 500,    messages: 1_000,   campaigns: 5  },
  starter:    { contacts: 5_000,  messages: 10_000,  campaigns: 20 },
  pro:        { contacts: 25_000, messages: 50_000,  campaigns: -1 },
  enterprise: { contacts: -1,     messages: -1,       campaigns: -1 },
};

const BILLING_ROLES = ["owner", "admin", "super_admin"];

interface WorkspaceData {
  planId:             string;
  subscriptionStatus: string | null;
  stripeCustomerId:   string | null;
  billingPeriodEnd:   string | null;
}

interface UsageData {
  summary: {
    totalContacts:    number;
    totalCampaigns:   number;
    totalMessagesSent: number;
  };
}

export default function BillingPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [workspace, setWorkspace]         = useState<WorkspaceData | null>(null);
  const [usage, setUsage]                 = useState<UsageData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Role gate — redirect non-billing-roles
  useEffect(() => {
    if (sessionStatus === "loading") return;
    const role = session?.user?.role ?? "";
    if (!BILLING_ROLES.includes(role)) {
      toast.error("Only account owners and admins can access billing.");
      router.replace("/dashboard");
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    const role = session?.user?.role ?? "";
    if (!BILLING_ROLES.includes(role)) return;

    const load = async () => {
      const [wsRes, usageRes] = await Promise.all([
        fetch("/api/billing/workspace"),
        fetch("/api/analytics"),
      ]);
      if (wsRes.ok)    setWorkspace(await wsRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
      setLoading(false);
    };
    load();
  }, [session, sessionStatus]);

  const openPortal = async () => {
    setPortalLoading(true);
    const res  = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    setPortalLoading(false);
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error ?? "Could not open billing portal.");
    }
  };

  const startCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const res  = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Could not start checkout. Ensure Stripe is configured.");
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  // Show nothing while session loads (avoid flash before redirect)
  if (sessionStatus === "loading") return null;

  const role = session?.user?.role ?? "";
  if (!BILLING_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Billing is only accessible to account owners and admins.
        </p>
      </div>
    );
  }

  const planId = workspace?.planId ?? "free";
  const status = workspace?.subscriptionStatus;
  const limits = PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;

  const usageItems = [
    { name: "Contacts",      used: usage?.summary?.totalContacts    ?? 0, limit: limits.contacts  },
    { name: "Messages Sent", used: usage?.summary?.totalMessagesSent ?? 0, limit: limits.messages  },
    { name: "Campaigns",     used: usage?.summary?.totalCampaigns   ?? 0, limit: limits.campaigns },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72 col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing & Plans</h2>
          <p className="text-muted-foreground">Manage your subscription and usage.</p>
        </div>
        {workspace?.stripeCustomerId && (
          <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
            {portalLoading ? "Opening…" : "Manage Billing"}
          </Button>
        )}
      </div>

      {status === "past_due" && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Payment failed. Update your payment method to avoid service interruption.
          <Button size="sm" variant="outline" onClick={openPortal} className="ml-auto">Fix Now</Button>
        </div>
      )}

      {status === "canceled" && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Your subscription has been canceled. Choose a plan below to reactivate.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan */}
        <Card className="col-span-1 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">Current Plan</Badge>
              <span className={`text-sm font-medium capitalize ${
                status === "active"   ? "text-green-500"  :
                status === "past_due" ? "text-orange-500" :
                status === "trialing" ? "text-blue-500"   :
                "text-muted-foreground"
              }`}>
                {status ?? "free"}
              </span>
            </div>
            <CardTitle className="text-2xl capitalize">{planId}</CardTitle>
            <CardDescription className="text-base text-foreground mt-2">
              <span className="font-bold text-3xl">${PLAN_PRICES[planId] ?? 0}</span>
              <span className="text-muted-foreground"> / month</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {(PLAN_FEATURES[planId] ?? []).map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {planId !== "free" && workspace?.stripeCustomerId ? (
              <Button variant="outline" className="w-full" onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {portalLoading ? "Opening…" : "Change Plan"}
              </Button>
            ) : planId === "free" ? (
              <Button
                className="w-full"
                onClick={() => startCheckout("starter")}
                disabled={checkoutLoading === "starter"}
              >
                {checkoutLoading === "starter"
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
                  : <><Zap className="mr-2 h-4 w-4" />Upgrade to Starter</>}
              </Button>
            ) : null}
          </CardFooter>
        </Card>

        {/* Usage */}
        <Card className="col-span-2 bg-card">
          <CardHeader>
            <CardTitle>Current Usage</CardTitle>
            <CardDescription>
              {workspace?.billingPeriodEnd
                ? `Resets ${new Date(workspace.billingPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                : "Monthly usage — resets each billing cycle"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usageItems.map(item => {
              const unlimited = item.limit === -1;
              const pct = unlimited ? 10 : Math.min((item.used / item.limit) * 100, 100);
              const isWarning  = !unlimited && pct > 80;
              const isDanger   = !unlimited && pct >= 100;
              const label = unlimited
                ? `${item.used.toLocaleString()} / ∞`
                : `${item.used.toLocaleString()} / ${item.limit.toLocaleString()}`;

              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className={isDanger ? "text-red-500 font-semibold" : isWarning ? "text-orange-500 font-medium" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isDanger ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isDanger   && <p className="text-xs text-red-500 font-medium">Limit reached — upgrade to continue.</p>}
                  {isWarning && !isDanger && <p className="text-xs text-orange-500">Approaching limit — consider upgrading.</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Upgrade cards */}
      {planId !== "enterprise" && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Upgrade Options</CardTitle>
            <CardDescription>Scale your reach with a plan that fits your business.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["starter", "pro", "enterprise"] as const)
                .filter(p => p !== planId)
                .map(p => {
                  const isPopular = p === "pro";
                  const isLoading = checkoutLoading === p;
                  return (
                    <div
                      key={p}
                      className={`rounded-lg border p-4 flex flex-col gap-3 relative ${
                        isPopular ? "border-primary/40 bg-primary/5" : "border-border"
                      }`}
                    >
                      {isPopular && (
                        <Badge className="absolute -top-2.5 left-4 text-[10px] px-2 py-0.5 bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      )}
                      <div>
                        <p className="font-semibold capitalize">{p}</p>
                        <p className="text-xl font-bold text-primary mt-0.5">
                          ${PLAN_PRICES[p]}
                          <span className="text-xs text-muted-foreground font-normal">/mo</span>
                        </p>
                      </div>
                      <ul className="space-y-1.5 text-xs text-muted-foreground flex-1">
                        {(PLAN_FEATURES[p] ?? []).map(f => (
                          <li key={f} className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        variant={isPopular ? "default" : "outline"}
                        className="w-full"
                        disabled={isLoading || checkoutLoading !== null}
                        onClick={() => startCheckout(p)}
                      >
                        {isLoading
                          ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Processing…</>
                          : `Upgrade to ${p.charAt(0).toUpperCase() + p.slice(1)}`}
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing info footer */}
      <p className="text-xs text-muted-foreground text-center">
        Payments are processed securely via Stripe. Subscriptions renew monthly and can be canceled at any time.
      </p>
    </div>
  );
}
