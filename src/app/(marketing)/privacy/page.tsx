import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Privacy Policy — BroadcastHQ" };

const sections = [
  { id: "collection",   title: "1. Information We Collect",    body: `We collect information you provide directly to us, such as when you create an account (name, email, password), set up a workspace, import contacts, or contact support. We also automatically collect usage data, including log files, IP addresses, browser type, pages viewed, and actions taken within the Service.` },
  { id: "usage",        title: "2. How We Use Your Information", body: `We use the information we collect to: provide, maintain, and improve the Service; process transactions and send related information; send technical notices and support messages; respond to your comments and questions; monitor and analyse usage trends; detect and prevent fraudulent activity; and comply with legal obligations.` },
  { id: "contact-data", title: "3. Contact Data",              body: `When you import contacts into BroadcastHQ, you represent that you have obtained all necessary consents from those contacts to receive communications via WhatsApp and to have their data processed by third-party platforms. You retain ownership of your contact data. We process it solely on your instructions.` },
  { id: "sharing",      title: "4. Data Sharing",              body: `We do not sell your personal data. We share data with third-party vendors who assist us in operating the Service, including: Neon (database), Vercel (hosting), Stripe (payments), Twilio and Meta (WhatsApp delivery), and Anthropic (AI features). Each vendor is bound by data processing agreements.` },
  { id: "retention",    title: "5. Data Retention",            body: `We retain your account data for as long as your account is active or as needed to provide the Service. Contact and message data is retained for the duration of your subscription plus 90 days, after which it is permanently deleted upon your request or account closure.` },
  { id: "security",     title: "6. Security",                  body: `We implement industry-standard security measures including: bcrypt password hashing, JWT sessions with short expiry, TLS in transit, database encryption at rest, rate limiting on all endpoints, and role-based access control. However, no method of transmission over the internet is 100% secure.` },
  { id: "gdpr",         title: "7. Your Rights (GDPR)",        body: `If you are in the EEA or UK, you have rights including: access to your personal data; correction of inaccurate data; deletion of your data; restriction of processing; data portability; and the right to object. To exercise these rights, contact privacy@broadcasthq.com. We will respond within 30 days.` },
  { id: "cookies",      title: "8. Cookies",                   body: `We use essential cookies for session management and authentication. We do not use advertising or tracking cookies. You can disable cookies in your browser, but this may affect functionality.` },
  { id: "children",     title: "9. Children's Privacy",        body: `The Service is not directed to children under 13. We do not knowingly collect personal data from children. If you believe we have collected data from a child, contact us immediately.` },
  { id: "changes",      title: "10. Changes to This Policy",   body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a notice on our website. Your continued use of the Service after changes constitutes your acceptance of the updated policy.` },
  { id: "contact",      title: "11. Contact Us",               body: `For privacy-related questions, contact our Data Protection Officer at privacy@broadcasthq.com or write to: BroadcastHQ Ltd, 1 Tech Square, London, EC2A 4HE, United Kingdom.` },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-16 text-center">
        <Badge variant="outline" className="mb-4 gap-1.5"><Shield className="h-3 w-3" />Legal</Badge>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">Privacy Policy</h1>
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
