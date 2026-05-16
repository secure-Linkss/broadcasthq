"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { CheckCircle2, X, ChevronDown, Zap, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const stagger = (d = 0.08): Variants => ({
  hidden:  {},
  visible: { transition: { staggerChildren: d } },
});

const PLANS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    description: "Try the platform risk-free",
    href: "/signup",
    cta: "Get Started",
    popular: false,
    features: ["1,000 messages/month","500 contacts","5 campaigns","1 user seat","Basic analytics","WhatsApp Cloud API"],
    missing: ["API access","AI import","Validator","Priority support"],
  },
  {
    id: "starter",
    name: "Starter",
    monthly: 29,
    annual: 23,
    description: "For growing teams",
    href: "/signup?plan=starter",
    cta: "Start Free Trial",
    popular: false,
    features: ["10,000 messages/month","5,000 contacts","20 campaigns","3 user seats","Standard analytics","API access","WhatsApp Cloud API"],
    missing: ["AI import","Validator","Priority support"],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 79,
    annual: 63,
    description: "For serious marketers",
    href: "/signup?plan=pro",
    cta: "Start Free Trial",
    popular: true,
    features: ["50,000 messages/month","25,000 contacts","Unlimited campaigns","10 user seats","Advanced analytics","API access","AI contact import","WhatsApp Validator","Priority support"],
    missing: ["Custom domain","SLA guarantee"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 199,
    annual: 159,
    description: "Unlimited scale, custom SLA",
    href: "/contact?subject=Enterprise",
    cta: "Talk to Sales",
    popular: false,
    features: ["Unlimited messages","Unlimited contacts","Unlimited campaigns","Unlimited seats","Custom analytics","API access","AI contact import","WhatsApp Validator","Dedicated support","Custom domain","SLA guarantee","Custom integrations"],
    missing: [],
  },
];

const compareRows = [
  { feature: "Messages/month",     free: "1,000",    starter: "10,000",    pro: "50,000",    enterprise: "Unlimited" },
  { feature: "Contacts",           free: "500",      starter: "5,000",     pro: "25,000",    enterprise: "Unlimited" },
  { feature: "Campaigns",          free: "5",        starter: "20",        pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Team seats",         free: "1",        starter: "3",         pro: "10",        enterprise: "Unlimited" },
  { feature: "Analytics",          free: "Basic",    starter: "Standard",  pro: "Advanced",  enterprise: "Custom"    },
  { feature: "API Access",         free: false,      starter: true,        pro: true,        enterprise: true        },
  { feature: "AI Contact Import",  free: false,      starter: false,       pro: true,        enterprise: true        },
  { feature: "WhatsApp Validator", free: false,      starter: false,       pro: true,        enterprise: true        },
  { feature: "Priority Support",   free: false,      starter: false,       pro: true,        enterprise: true        },
  { feature: "Custom Domain",      free: false,      starter: false,       pro: false,       enterprise: true        },
  { feature: "SLA Guarantee",      free: false,      starter: false,       pro: false,       enterprise: true        },
];

const faqs = [
  { q: "Can I change plans at any time?",           a: "Yes. Upgrades take effect immediately and you're billed the prorated difference. Downgrades apply at the end of your current billing period." },
  { q: "What happens when I exceed my message limit?", a: "Active campaigns pause and you receive an email notification. Upgrade at any time to immediately resume sending." },
  { q: "Is there a free trial on paid plans?",      a: "Starter and Pro include a 14-day free trial — no credit card required. Cancel any time before the trial ends." },
  { q: "Do you support multiple WhatsApp numbers?", a: "Pro and Enterprise plans support connecting multiple WhatsApp Business numbers to a single workspace." },
  { q: "What payment methods do you accept?",       a: "All major credit and debit cards via Stripe. Enterprise customers can request annual invoicing with NET-30 terms." },
  { q: "Is my data secure and GDPR compliant?",     a: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are GDPR and CCPA compliant. Data stored in the EU by default." },
];

function CellVal({ val }: { val: boolean | string }) {
  if (typeof val === "boolean")
    return val
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
      : <X className="h-4 w-4 text-white/20 mx-auto" />;
  return <span className="text-sm text-white/80">{val}</span>;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="bg-[#0b1020] min-h-screen">

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" aria-hidden />
        <div className="absolute inset-0 grid-bg grid-bg-fade opacity-30 pointer-events-none" aria-hidden />

        <motion.div initial="hidden" animate="visible" variants={stagger(0.1)} className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div variants={fadeUp}>
            <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Transparent Pricing
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-5">
            Simple plans,<br /><span className="gradient-text-primary">serious results.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg text-white/50 mb-10">
            Start free. Scale as you grow. No hidden fees, no surprises.
          </motion.p>

          {/* Billing toggle */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={cn("px-5 py-1.5 rounded-full text-sm font-medium transition-all", !annual ? "bg-white text-black shadow" : "text-white/60 hover:text-white")}
            >Monthly</button>
            <button
              onClick={() => setAnnual(true)}
              className={cn("flex items-center gap-2 px-5 py-1.5 rounded-full text-sm font-medium transition-all", annual ? "bg-white text-black shadow" : "text-white/60 hover:text-white")}
            >
              Annual
              <span className="text-xs bg-emerald-500 text-white rounded-full px-2 py-0.5 font-semibold leading-none">-20%</span>
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Plan cards ── */}
      <section className="px-6 pb-20">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.08)}
          className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {PLANS.map(plan => (
            <motion.div
              key={plan.id}
              variants={fadeUp}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7 overflow-hidden",
                plan.popular
                  ? "border-primary/50 bg-gradient-to-b from-primary/10 to-primary/[0.03] ring-1 ring-primary/25"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] transition-colors"
              )}
            >
              {plan.popular && <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />}
              {plan.popular && (
                <Badge className="absolute top-5 right-5 bg-primary text-white border-0 text-xs">Most Popular</Badge>
              )}

              <div className="mb-6">
                <p className="text-sm font-semibold text-white/70 mb-0.5">{plan.name}</p>
                <p className="text-xs text-white/35 mb-4">{plan.description}</p>
                <div className="flex items-end gap-1 h-12">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={annual ? "a" : "m"}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="text-4xl font-bold text-white tracking-tight"
                    >
                      ${annual ? plan.annual : plan.monthly}
                    </motion.span>
                  </AnimatePresence>
                  {plan.monthly > 0 && <span className="text-white/35 text-sm mb-0.5">/mo</span>}
                </div>
                {plan.monthly > 0 && annual && (
                  <p className="text-xs text-emerald-400 mt-1">${(plan.monthly - plan.annual) * 12} saved/year</p>
                )}
              </div>

              <Button
                asChild
                className={cn(
                  "w-full mb-6 rounded-xl font-semibold",
                  plan.popular ? "bg-primary hover:bg-primary/90 glow-primary-sm" : "bg-white/8 hover:bg-white/14 text-white border border-white/10"
                )}
              >
                <Link href={plan.href}>{plan.cta} <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
              </Button>

              <div className="space-y-2.5 flex-1">
                {plan.features.map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-white/65">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{f}
                  </div>
                ))}
                {plan.missing.map(f => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-white/22 line-through">
                    <X className="h-4 w-4 shrink-0 mt-0.5" />{f}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Comparison table ── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.07)} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">Compare all features</motion.h2>
            <motion.p variants={fadeUp} className="text-white/45">See exactly what you get on each plan.</motion.p>
          </motion.div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left px-6 py-4 text-white/40 font-medium w-[35%]">Feature</th>
                    {PLANS.map(p => (
                      <th key={p.id} className={cn("px-4 py-4 text-center font-semibold", p.popular ? "text-primary" : "text-white/65")}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, i) => (
                    <tr key={row.feature} className={cn("border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors", i % 2 !== 0 && "bg-white/[0.01]")}>
                      <td className="px-6 py-3.5 text-white/55 font-medium">{row.feature}</td>
                      <td className="px-4 py-3.5 text-center"><CellVal val={row.free} /></td>
                      <td className="px-4 py-3.5 text-center"><CellVal val={row.starter} /></td>
                      <td className="px-4 py-3.5 text-center bg-primary/[0.04]"><CellVal val={row.pro} /></td>
                      <td className="px-4 py-3.5 text-center"><CellVal val={row.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.07)} className="text-center mb-12">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white tracking-tight">Frequently asked questions</motion.h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-white hover:text-white/80 transition-colors"
                >
                  {faq.q}
                  <ChevronDown className={cn("h-4 w-4 text-white/35 shrink-0 ml-4 transition-transform duration-200", openFaq === i && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-white/45 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="px-6 pb-24">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.08)}
          className="max-w-3xl mx-auto text-center rounded-2xl border border-primary/20 bg-primary/[0.06] p-14"
        >
          <motion.div variants={fadeUp}><Zap className="h-10 w-10 text-primary mx-auto mb-5" /></motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">Still not sure? Start free.</motion.h2>
          <motion.p variants={fadeUp} className="text-white/50 mb-8">No credit card. No commitment. Just powerful WhatsApp marketing from day one.</motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full px-8 glow-primary-sm"><Link href="/signup">Get Started Free</Link></Button>
            <Button size="lg" variant="ghost" asChild className="rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5"><Link href="/contact">Talk to Sales</Link></Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
