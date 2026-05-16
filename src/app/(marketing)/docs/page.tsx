import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Globe, Zap, BookOpen, Terminal, Lock } from "lucide-react";

export const metadata = { title: "API Documentation — BroadcastHQ" };

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/campaigns",
    desc: "List all campaigns for your workspace.",
    params: [
      { name: "status", type: "string", desc: "Filter by status: draft, scheduled, running, completed" },
      { name: "limit",  type: "number", desc: "Results per page (max 200, default 50)" },
      { name: "offset", type: "number", desc: "Pagination offset" },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/campaigns",
    desc: "Create a new campaign.",
    body: [
      { name: "name",         type: "string",   desc: "Campaign name (required)" },
      { name: "templateName", type: "string",   desc: "WhatsApp template name (required)" },
      { name: "tags",         type: "string[]", desc: "Optional tags" },
      { name: "scheduledAt",  type: "ISO date", desc: "Schedule time (optional, defaults to immediate)" },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/campaigns/:id/run",
    desc: "Trigger a campaign to send immediately.",
    body: [],
  },
  {
    method: "GET",
    path: "/api/v1/contacts",
    desc: "List contacts in your workspace.",
    params: [
      { name: "search", type: "string", desc: "Search by name or phone" },
      { name: "status", type: "string", desc: "active | opted_out | bounced" },
    ],
  },
  {
    method: "POST",
    path: "/api/v1/contacts",
    desc: "Create or update contacts (upsert). Accepts single object or array (max 1000).",
    body: [
      { name: "phone",      type: "string", desc: "E.164 format phone number (required)" },
      { name: "firstName",  type: "string", desc: "First name" },
      { name: "lastName",   type: "string", desc: "Last name" },
      { name: "tags",       type: "string[]", desc: "Contact tags" },
      { name: "customFields", type: "object", desc: "Key-value custom fields" },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/messages",
    desc: "List messages with delivery status.",
    params: [
      { name: "campaignId", type: "uuid",   desc: "Filter by campaign" },
      { name: "status",     type: "string", desc: "pending | sent | delivered | read | failed" },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/analytics",
    desc: "Get workspace-level analytics summary.",
    params: [],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-blue-500/10 text-blue-500",
  POST:   "bg-green-500/10 text-green-600",
  PATCH:  "bg-yellow-500/10 text-yellow-600",
  DELETE: "bg-red-500/10 text-red-500",
};

export default function DocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">
      <div className="mb-12">
        <Badge variant="outline" className="mb-4">Developer Docs</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">API Reference</h1>
        <p className="text-lg text-muted-foreground">
          Integrate BroadcastHQ into your own systems. Trigger campaigns, manage contacts, and query analytics — all via REST API.
        </p>
      </div>

      {/* Quick Start */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {[
          { icon: Key,      title: "Authentication",  desc: "API key auth via Authorization header" },
          { icon: Globe,    title: "Base URL",         desc: "https://yourapp.com/api/v1" },
          { icon: Terminal, title: "Format",           desc: "JSON request & response bodies" },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardContent className="p-5 flex gap-4">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Auth Section */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-primary" /> Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All API requests must include your API key in the <code className="bg-muted px-1 rounded text-xs">Authorization</code> header.
            Generate API keys from <strong>Settings → API Keys</strong> in your dashboard.
          </p>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs overflow-x-auto">
            <span className="text-muted-foreground"># Example request</span>{"\n"}
            curl https://yourapp.com/api/v1/campaigns \{"\n"}
            {"  "}-H &quot;Authorization: Bearer bhq_live_xxxxxxxxxxxxxxxxxxxx&quot; \{"\n"}
            {"  "}-H &quot;Content-Type: application/json&quot;
          </div>
          <p className="text-xs text-muted-foreground">
            Keys begin with <code className="bg-muted px-1 rounded">bhq_live_</code>. Each key is shown once at creation — store it securely. Rate limit: 100 requests / minute per key.
          </p>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div id="api" className="space-y-6">
        <h2 className="text-2xl font-bold">Endpoints</h2>
        {endpoints.map(ep => (
          <Card key={`${ep.method}${ep.path}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-bold ${METHOD_COLORS[ep.method]}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-foreground">{ep.path}</code>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{ep.desc}</p>
            </CardHeader>
            {((ep.params?.length ?? 0) > 0 || (ep.body?.length ?? 0) > 0) && (
              <CardContent>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="pb-2 font-medium">Parameter</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(ep.params ?? ep.body ?? []).map((p: { name: string; type: string; desc: string }) => (
                      <tr key={p.name}>
                        <td className="py-2 font-mono text-primary">{p.name}</td>
                        <td className="py-2 text-muted-foreground">{p.type}</td>
                        <td className="py-2 text-muted-foreground">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Rate Limits & Errors */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Rate Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>100 requests / minute per API key. Headers returned:</p>
            <div className="rounded bg-muted p-3 font-mono text-xs space-y-1">
              <div>X-RateLimit-Limit: 100</div>
              <div>X-RateLimit-Remaining: 95</div>
              <div>X-RateLimit-Reset: 1715000000</div>
            </div>
            <p>Exceeding the limit returns HTTP 429.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Error Format
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>All errors return JSON with an <code className="bg-muted px-1 rounded">error</code> field:</p>
            <div className="rounded bg-muted p-3 font-mono text-xs space-y-1">
              <div>{"{"}</div>
              <div>{"  "}error: &quot;User not found&quot;</div>
              <div>{"}"}</div>
            </div>
            <p>HTTP 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate limited, 500 server error.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
