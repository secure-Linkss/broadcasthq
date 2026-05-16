"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, type Variants } from "framer-motion";
import { Mail, MessageSquare, MapPin, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger = (d = 0.1): Variants => ({
  hidden:  {},
  visible: { transition: { staggerChildren: d } },
});

const contactCards = [
  { icon: Mail,         title: "Email Us",      info: "hello@broadcasthq.app",     sub: "We reply within 24 hours",             color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { icon: MessageSquare,title: "Live Chat",     info: "In-app chat support",        sub: "Available Mon–Fri, 9am–6pm GMT",       color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20"    },
  { icon: MapPin,       title: "Headquarters", info: "London, United Kingdom",      sub: "GMT / BST timezone",                   color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20"},
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject) { toast.error("Please select a subject."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send message. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b1020] min-h-screen">
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[120px] pointer-events-none" aria-hidden />

      <section className="relative pt-24 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={stagger(0.1)} className="mb-16">
            <motion.p variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Get in touch</motion.p>
            <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-bold tracking-tighter text-white mb-5">
              Let&apos;s <span className="gradient-text-primary">talk.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-lg text-white/50 max-w-md">
              Have a question, feedback, or want to explore an enterprise plan? We&apos;d love to hear from you.
            </motion.p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-10 xl:gap-16">
            {/* ── Left ── */}
            <motion.div initial="hidden" animate="visible" variants={stagger(0.1)} className="lg:col-span-2 space-y-4">
              {contactCards.map((c, i) => (
                <motion.div key={i} variants={fadeUp} whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  className={`flex items-start gap-4 p-5 rounded-xl border ${c.bg} transition-colors`}>
                  <div className={`h-10 w-10 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm mb-0.5">{c.title}</p>
                    <p className="text-sm text-white/70">{c.info}</p>
                    <p className="text-xs text-white/40 mt-0.5">{c.sub}</p>
                  </div>
                </motion.div>
              ))}
              <motion.div variants={fadeUp} className="mt-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Response guarantee</span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  We reply to every message within 24 business hours. Enterprise enquiries get a response within 4 hours.
                </p>
              </motion.div>
            </motion.div>

            {/* ── Right: form ── */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="lg:col-span-3">
              {sent ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
                  className="flex flex-col items-center justify-center h-full min-h-[420px] text-center p-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04]">
                  <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Message sent!</h2>
                  <p className="text-white/50 mb-6 max-w-sm">
                    Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. We&apos;ll reply to <strong className="text-white/75">{form.email}</strong> within 24 hours.
                  </p>
                  <Button variant="ghost" className="text-white/55 hover:text-white border border-white/10 hover:bg-white/5 rounded-xl"
                    onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                    Send another message
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5 p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/65 text-sm">Full name</Label>
                      <Input id="name" placeholder="Alex Rivera" value={form.name} onChange={set("name")}
                        className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-primary/50" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/65 text-sm">Email address</Label>
                      <Input id="email" type="email" placeholder="alex@company.com" value={form.email} onChange={set("email")}
                        className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-primary/50" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/65 text-sm">Subject</Label>
                    <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                      <SelectTrigger className="bg-white/[0.04] border-white/10 text-white">
                        <SelectValue placeholder="Select a topic…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General enquiry</SelectItem>
                        <SelectItem value="Technical">Technical support</SelectItem>
                        <SelectItem value="Billing">Billing question</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="Enterprise">Enterprise plan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="message" className="text-white/65 text-sm">Message</Label>
                      <span className="text-xs text-white/25">{form.message.length}/1000</span>
                    </div>
                    <Textarea id="message" placeholder="Tell us how we can help…" rows={6} maxLength={1000} value={form.message} onChange={set("message")}
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-primary/50 resize-none" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl glow-primary-sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    {loading ? "Sending…" : "Send Message"}
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
