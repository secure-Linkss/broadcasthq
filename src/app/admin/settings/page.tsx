"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert, Bell, Globe, Database, Key } from "lucide-react";

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newRegAllowed, setNewRegAllowed]     = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground text-sm">Global configuration for BroadcastHQ.</p>
      </div>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <CardDescription>Platform-level security toggles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-sm">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Block all non-admin access to the platform.</p>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
              className="data-[state=checked]:bg-destructive"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium text-sm">Allow New Registrations</p>
              <p className="text-xs text-muted-foreground">Toggle to pause new user signups.</p>
            </div>
            <Switch checked={newRegAllowed} onCheckedChange={setNewRegAllowed} />
          </div>
        </CardContent>
      </Card>

      {/* Environment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Environment</CardTitle>
          </div>
          <CardDescription>Current runtime environment variables status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: "DATABASE_URL",            required: true  },
              { key: "NEXTAUTH_SECRET",          required: true  },
              { key: "STRIPE_SECRET_KEY",        required: true  },
              { key: "STRIPE_WEBHOOK_SECRET",    required: true  },
              { key: "ANTHROPIC_API_KEY",        required: false },
              { key: "TWILIO_ACCOUNT_SID",       required: false },
              { key: "META_APP_SECRET",          required: false },
              { key: "ADMIN_EMAILS",             required: true  },
            ].map(({ key, required }) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{key}</code>
                <Badge variant="outline" className={required
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                }>
                  {required ? "Required" : "Optional"}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Configure environment variables in your deployment provider or <code className="bg-muted px-1 rounded">.env.local</code>.
          </p>
        </CardContent>
      </Card>

      {/* Plan Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Stripe Plan IDs</CardTitle>
          </div>
          <CardDescription>Price IDs configured via environment variables.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { plan: "Starter ($29/mo)", env: "STRIPE_STARTER_PRICE_ID" },
              { plan: "Pro ($79/mo)",     env: "STRIPE_PRO_PRICE_ID" },
              { plan: "Enterprise ($199/mo)", env: "STRIPE_ENTERPRISE_PRICE_ID" },
            ].map(({ plan, env }) => (
              <div key={env} className="flex items-center gap-3">
                <Label className="w-40 text-sm shrink-0">{plan}</Label>
                <Input
                  readOnly
                  value={`Set via ${env}`}
                  className="font-mono text-xs text-muted-foreground bg-muted"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Platform Info</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <Badge variant="outline">1.0.0</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Framework</span>
            <span className="font-medium">Next.js 14 (App Router)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database</span>
            <span className="font-medium">Neon Postgres + Drizzle ORM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auth</span>
            <span className="font-medium">NextAuth v5 (Credentials + JWT)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payments</span>
            <span className="font-medium">Stripe Checkout + Webhook</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
