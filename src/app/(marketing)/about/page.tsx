"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import { Globe2, Zap, Shield, Heart, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};
const stagger = (d = 0.1): Variants => ({
  hidden:  {},
  visible: { transition: { staggerChildren: d } },
});

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let t = 0;
    const d = 1500;
    const s = (ts: number) => {
      if (!t) t = ts;
      const p = Math.min((ts - t) / d, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) requestAnimationFrame(s);
    };
    requestAnimationFrame(s);
  }, [started, to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

const values = [
  { icon: Heart,  title: "Customer First",     desc: "Every feature we build starts with a customer problem. We obsess over your success, not vanity metrics." },
  { icon: Zap,    title: "Speed & Reliability", desc: "Fast software is a feature. Our platform is built for sub-100ms delivery at any scale." },
  { icon: Globe2, title: "Global by Default",   desc: "From day one, BroadcastHQ was built for global teams — supporting 50+ countries and all major time zones." },
  { icon: Shield, title: "Privacy & Security",  desc: "GDPR-compliant, encrypted at rest and in transit. We treat your data with the respect it deserves." },
];

const team = [
  { name: "Alex Rivera",   role: "CEO & Co-founder",         g: "from-violet-500 to-indigo-600"  },
  { name: "Sarah Chen",    role: "CTO & Co-founder",         g: "from-indigo-500 to-blue-600"    },
  { name: "Marcus Okafor", role: "Head of Product",          g: "from-cyan-500 to-teal-600"      },
  { name: "Priya Sharma",  role: "Head of Customer Success", g: "from-emerald-500 to-green-600"  },
];

const timeline = [
  { year: "2023", title: "Founded",          desc: "BroadcastHQ was born from a frustration with clunky, unreliable WhatsApp tools that couldn't scale." },
  { year: "2024", title: "Public Launch",    desc: "We launched publicly with 3 plans and 50 beta customers who believed in what we were building." },
  { year: "2025", title: "Series A & Scale", desc: "After reaching $1M ARR, we closed our Series A to accelerate product and global expansion." },
];

export default function AboutPage() {
  return (
    <div className="bg-[#0b1020] min-h-screen">

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[400px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" aria-hidden />
        <div className="absolute inset-0 grid-bg grid-bg-fade opacity-25 pointer-events-none" aria-hidden />
        <motion.div initial="hidden" animate="visible" variants={stagger(0.1)} className="max-w-4xl mx-auto text-center relative z-10">
          <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Our story</motion.p>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-7 leading-[1.05]">
            Built for the future of<br /><span className="gradient-text-primary">customer engagement.</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            We started BroadcastHQ because we were tired of expensive, unreliable WhatsApp tools that treated small teams like second-class customers.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6 border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { to: 50,  suffix: "M+", label: "Messages delivered" },
            { to: 500, suffix: "+",  label: "Teams worldwide"    },
            { to: 50,  suffix: "+",  label: "Countries served"   },
            { to: 98,  suffix: "%",  label: "Delivery success"   },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}>
              <div className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">
                <Counter to={s.to} suffix={s.suffix} />
              </div>
              <p className="text-sm text-white/40">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Mission ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="border-l-4 border-primary pl-8 py-2">
            <p className="text-2xl md:text-3xl font-medium text-white leading-relaxed">
              "Our mission is to give every business — from solo founders to enterprise teams — access to the same powerful WhatsApp marketing infrastructure that was previously only available to Fortune 500 companies."
            </p>
            <p className="mt-6 text-white/45 font-medium">— Alex Rivera, CEO &amp; Co-founder</p>
          </motion.div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.08)} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">What drives us</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-white tracking-tight">Our values</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.08)} className="grid md:grid-cols-2 gap-5">
            {values.map((v, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="flex gap-5 p-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] transition-colors">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-2">{v.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{v.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.08)} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Our journey</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-white tracking-tight">How we got here</motion.h2>
          </motion.div>
          <div className="relative space-y-10 pl-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
            {timeline.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }} className="relative">
                <div className="absolute -left-8 top-1 h-4 w-4 rounded-full bg-primary border-2 border-[#0b1020] ring-1 ring-primary/30" />
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{t.year}</p>
                <h3 className="text-lg font-semibold text-white mb-2">{t.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.08)} className="text-center mb-14">
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">The team</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-white tracking-tight">People behind the product</motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.08)} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((m, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="flex flex-col items-center text-center p-7 rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] transition-colors">
                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${m.g} flex items-center justify-center text-white text-xl font-bold mb-4 shadow-lg`}>
                  {m.name.split(" ").map(n => n[0]).join("")}
                </div>
                <p className="font-semibold text-white mb-1">{m.name}</p>
                <p className="text-xs text-white/40">{m.role}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger(0.1)} className="max-w-2xl mx-auto text-center">
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-white tracking-tight mb-5">Ready to join us?</motion.h2>
          <motion.p variants={fadeUp} className="text-white/50 mb-8">Start your free workspace today, or reach out to our team directly.</motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full px-8 glow-primary-sm">
              <Link href="/signup">Get Started Free <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-white/5">
              <Link href="/contact">Contact Us</Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
