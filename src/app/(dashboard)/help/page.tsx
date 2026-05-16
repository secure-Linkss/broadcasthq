"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen, MessageSquare, Zap, Shield, BarChart3,
  ChevronRight, ExternalLink, Search, HelpCircle, Mail, FileText,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  {
    icon: Zap, title: "Getting Started",
    desc: "Set up your workspace, connect WhatsApp Business, and send your first campaign.",
    articles: ["Connecting WhatsApp Business API", "Creating your first campaign", "Importing contacts", "Template approval guide"],
    color: "text-yellow-500",
  },
  {
    icon: MessageSquare, title: "Campaigns",
    desc: "Build, schedule, and monitor broadcast campaigns at scale.",
    articles: ["Campaign types explained", "Scheduling & time zones", "Audience segmentation", "A/B testing messages"],
    color: "text-primary",
  },
  {
    icon: BarChart3, title: "Analytics",
    desc: "Understand delivery rates, read rates, and campaign performance.",
    articles: ["Reading your analytics dashboard", "Delivery vs read rates", "Exporting reports", "Setting up custom date ranges"],
    color: "text-green-500",
  },
  {
    icon: Shield, title: "Compliance & Security",
    desc: "Stay compliant with WhatsApp policies and protect your sender reputation.",
    articles: ["WhatsApp Business Policy overview", "Opt-out management", "Rate limits & best practices", "GDPR compliance guide"],
    color: "text-red-500",
  },
];

const FAQS = [
  {
    q: "How many messages can I send per day?",
    a: "Limits depend on your WhatsApp Business API tier. New accounts start at 1,000 conversations/day and scale up based on quality rating.",
  },
  {
    q: "Can contacts reply to broadcast messages?",
    a: "Yes — replies appear in your Inbox. You have a 24-hour window to respond after a customer initiates contact.",
  },
  {
    q: "What happens when a contact opts out?",
    a: "They are automatically excluded from all future campaigns. Their record is moved to Opt-outs and cannot be re-added without their explicit consent.",
  },
  {
    q: "How do I get my templates approved?",
    a: "Submit templates via Settings → WhatsApp → Templates. Meta reviews within 24-48 hours. Avoid promotional language in utility templates.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — every new workspace gets 14 days on the Pro plan with no credit card required.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Help Center</h2>
        <p className="text-muted-foreground mt-1">Documentation, guides, and answers to common questions.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search documentation..." className="pl-9 h-11 bg-background" />
      </div>

      {/* Categories */}
      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIES.map(cat => (
          <Card key={cat.title} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <cat.icon className={`h-5 w-5 ${cat.color}`} />
                {cat.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{cat.desc}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {cat.articles.map(a => (
                  <li key={a}>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left py-0.5">
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      {a}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </h3>
        <div className="space-y-3">
          {FAQS.map(faq => (
            <Card key={faq.q}>
              <CardContent className="p-4">
                <p className="font-medium text-sm mb-1">{faq.q}</p>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="text-center">
          <CardContent className="p-6 space-y-3">
            <Mail className="h-8 w-8 mx-auto text-primary opacity-80" />
            <div>
              <p className="font-medium">Email Support</p>
              <p className="text-xs text-muted-foreground mt-1">Response within 24 hours on weekdays</p>
            </div>
            <Link href="/contact">
              <Button variant="outline" size="sm" className="w-full">
                support@broadcasthq.app
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6 space-y-3">
            <MessageSquare className="h-8 w-8 mx-auto text-green-500 opacity-80" />
            <div>
              <p className="font-medium">Live Chat</p>
              <p className="text-xs text-muted-foreground mt-1">Available Mon–Fri, 9am–6pm UTC</p>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Start Chat
            </Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="p-6 space-y-3">
            <FileText className="h-8 w-8 mx-auto text-yellow-500 opacity-80" />
            <div>
              <p className="font-medium">Full Documentation</p>
              <p className="text-xs text-muted-foreground mt-1">API reference, guides & tutorials</p>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1">
              docs.broadcasthq.app <ExternalLink className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">All systems operational</span>
          <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 text-xs">Healthy</Badge>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs">
          Status page <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
