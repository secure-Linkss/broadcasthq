import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Terms of Service — BroadcastHQ" };

const sections = [
  { id: "acceptance",    title: "1. Acceptance of Terms",    body: `By accessing or using BroadcastHQ ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing the Service.` },
  { id: "license",       title: "2. Use License",            body: `Permission is granted to use the Service for lawful business purposes in accordance with these Terms. You may not: modify or copy proprietary materials; use the Service for commercial spam or mass unsolicited messaging; attempt to decompile or reverse engineer any software; or transfer account access to any third party.` },
  { id: "account",       title: "3. Account Responsibilities", body: `You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any other breach of security.` },
  { id: "prohibited",    title: "4. Prohibited Uses",        body: `You may not use the Service to: send spam or unsolicited messages; violate WhatsApp's terms of service or community guidelines; distribute malware or malicious code; engage in any form of data harvesting or scraping; impersonate any person or entity; or violate any applicable law or regulation.` },
  { id: "billing",       title: "5. Subscription & Billing", body: `Paid plans are billed in advance on a monthly or annual basis. You authorise us to charge your payment method on a recurring basis. Refunds are not provided for partial months. You may cancel at any time, and your access will continue until the end of the current billing period.` },
  { id: "data",          title: "6. Data & Privacy",         body: `We collect and process personal data as described in our Privacy Policy. By using the Service, you consent to such processing. You are responsible for ensuring that any contact data you upload has been collected with appropriate consent under applicable data protection laws.` },
  { id: "whatsapp",      title: "7. WhatsApp Policy Compliance", body: `You acknowledge that BroadcastHQ is built on top of the Meta (WhatsApp Business) platform. You agree to comply with WhatsApp Business Policy, WhatsApp Commerce Policy, and all applicable Meta developer terms at all times. Violations may result in immediate account suspension.` },
  { id: "termination",   title: "8. Termination",            body: `We may terminate or suspend access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will cease immediately. Your data will be retained for 90 days before deletion.` },
  { id: "disclaimer",    title: "9. Disclaimer",             body: `The Service is provided on an "as is" basis. BroadcastHQ makes no warranties, expressed or implied, and hereby disclaims all warranties, including merchantability and fitness for a particular purpose. Delivery of WhatsApp messages is subject to Meta's infrastructure and is not guaranteed.` },
  { id: "liability",     title: "10. Limitation of Liability", body: `In no event shall BroadcastHQ be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.` },
  { id: "governing-law", title: "11. Governing Law",         body: `These Terms shall be governed and construed in accordance with the laws of England and Wales, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.` },
  { id: "changes",       title: "12. Changes to Terms",      body: `We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or in-app notification with at least 14 days notice. Continued use of the Service after changes constitutes acceptance of the new Terms.` },
  { id: "contact",       title: "13. Contact",               body: `Questions about the Terms of Service should be sent to legal@broadcasthq.com. For urgent legal matters, contact our registered office at: BroadcastHQ Ltd, 1 Tech Square, London, EC2A 4HE, United Kingdom.` },
];

export default function TermsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-16 text-center">
        <Badge variant="outline" className="mb-4 gap-1.5"><ScrollText className="h-3 w-3" />Legal</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">Terms of Service</h1>
        <p className="text-muted-foreground text-lg">Last updated: May 1, 2026</p>
        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] gap-12">
        {/* Sticky TOC */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contents</p>
            {sections.map(s => (
              <Link
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1 pl-3 border-l border-border hover:border-primary"
              >
                {s.title}
              </Link>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="space-y-10 text-muted-foreground leading-relaxed">
          {sections.map(({ id, title, body }) => (
            <section key={id} id={id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-primary inline-block" />
                {title}
              </h2>
              <p className="pl-3 border-l border-border/50">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
