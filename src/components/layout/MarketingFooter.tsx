import Link from "next/link";
import { Logo } from "@/components/Logo";

const footerLinks = {
  Product: [
    { label: "Features",  href: "/features" },
    { label: "Pricing",   href: "/pricing" },
    { label: "Changelog", href: "#" },
    { label: "Roadmap",   href: "#" },
  ],
  Company: [
    { label: "About",   href: "/about" },
    { label: "Blog",    href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "/contact" },
  ],
  Developers: [
    { label: "API Docs",      href: "/docs" },
    { label: "API Reference", href: "/docs#api" },
    { label: "Status",        href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Logo size="sm" href="/" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              WhatsApp broadcast campaigns at scale. Reach your audience where they are, every time.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">{section}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BroadcastHQ. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built on Next.js, Neon Postgres &amp; Stripe.
          </p>
        </div>
      </div>
    </footer>
  );
}
