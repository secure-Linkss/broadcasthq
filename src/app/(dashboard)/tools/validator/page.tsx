"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, type Variants } from "framer-motion";
import { PhoneCall, AlertCircle, CheckCircle2, Copy, Download, Loader2, X, Info, Users } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface ValidationResult {
  original:   string;
  normalized: string | null;
  status:     "valid" | "invalid_format" | "duplicate" | "too_short" | "too_long";
  country:    string | null;
  inContacts: boolean;
}
interface ValidatorResponse {
  results: ValidationResult[];
  stats: { valid: number; invalid: number; duplicates: number; inContacts: number };
}

const STATUS_CONFIG = {
  valid:          { label: "Valid",          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  invalid_format: { label: "Invalid Format", color: "bg-red-500/10 text-red-400 border-red-500/20"             },
  duplicate:      { label: "Duplicate",      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"    },
  too_short:      { label: "Too Short",      color: "bg-orange-500/10 text-orange-400 border-orange-500/20"    },
  too_long:       { label: "Too Long",       color: "bg-orange-500/10 text-orange-400 border-orange-500/20"    },
};

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const EXAMPLE = `+14155552671\n+447911123456\n+61412345678\n2347012345678`;

export default function ValidatorPage() {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ValidatorResponse | null>(null);

  const lineCount = input.split(/[\n,;]+/).filter(s => s.trim()).length;

  const validate = async () => {
    const numbers = input.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (numbers.length === 0) { toast.error("Paste at least one phone number."); return; }
    if (numbers.length > 5000) { toast.error("Maximum 5,000 numbers per batch."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/tools/validator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers, workspaceId: (session?.user as any)?.workspaceId }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Validation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!data) return;
    const rows = ["Original,Normalized,Status,Country,In Contacts"];
    data.results.forEach(r => rows.push(`"${r.original}","${r.normalized ?? ""}","${r.status}","${r.country ?? ""}","${r.inContacts}"`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `validated-${Date.now()}.csv` });
    a.click();
    toast.success("CSV exported.");
  };

  const copyValid = () => {
    if (!data) return;
    const valid = data.results.filter(r => r.status === "valid").map(r => r.normalized ?? r.original).join("\n");
    navigator.clipboard.writeText(valid);
    toast.success(`${data.stats.valid} valid numbers copied.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PhoneCall className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Number Validator</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">
            Validate and normalize phone numbers before campaigns. Detects invalid formats, duplicates, and checks if numbers already exist in your contacts.
          </p>
        </div>
        {data && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={copyValid}><Copy className="h-4 w-4 mr-2" />Copy Valid</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Input */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Paste Numbers</CardTitle>
              <CardDescription>One number per line. Supports E.164, local, and formatted numbers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder={EXAMPLE} rows={12} value={input} onChange={e => setInput(e.target.value)} className="font-mono text-sm resize-none" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{lineCount} numbers</span><span>Max 5,000</span>
              </div>
              <Button onClick={validate} disabled={loading || !input.trim()} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PhoneCall className="h-4 w-4 mr-2" />}
                {loading ? "Validating…" : "Validate Numbers"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Supported formats</p>
                  <p>+14155552671 <span className="text-primary">← E.164 (best)</span></p>
                  <p>+44 7911 123456 <span className="text-primary">← With spaces</span></p>
                  <p>+1 (555) 867-5309 <span className="text-primary">← Formatted</span></p>
                  <p>2347012345678 <span className="text-yellow-500">← No + prefix</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {!data && !loading && (
            <Card className="flex items-center justify-center min-h-[340px]">
              <CardContent className="text-center py-16">
                <PhoneCall className="h-12 w-12 text-muted-foreground/25 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground mb-1">No results yet</p>
                <p className="text-sm text-muted-foreground/60">Paste numbers and click Validate.</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="flex items-center justify-center min-h-[340px]">
              <CardContent className="text-center py-16">
                <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Validating numbers…</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <div className="space-y-4">
              {/* Stats */}
              <motion.div initial="hidden" animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Valid",       value: data.stats.valid,      icon: CheckCircle2, color: "text-emerald-500" },
                  { label: "Invalid",     value: data.stats.invalid,    icon: X,            color: "text-red-500"     },
                  { label: "Duplicates",  value: data.stats.duplicates, icon: AlertCircle,  color: "text-yellow-500"  },
                  { label: "In Contacts", value: data.stats.inContacts, icon: Users,        color: "text-blue-500"    },
                ].map((s, i) => (
                  <motion.div key={i} variants={fadeUp}>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
                        <div>
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              <Card>
                <CardContent className="p-0">
                  <div className="max-h-[520px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead>Original</TableHead>
                          <TableHead>Normalized (E.164)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead className="text-center">In DB</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.results.map((r, i) => (
                          <TableRow key={i} className="border-border/50">
                            <TableCell className="font-mono text-xs text-muted-foreground max-w-[140px] truncate">{r.original}</TableCell>
                            <TableCell className="font-mono text-xs">{r.normalized ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${STATUS_CONFIG[r.status].color}`}>
                                {STATUS_CONFIG[r.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{r.country ?? "—"}</TableCell>
                            <TableCell className="text-center">
                              {r.inContacts ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground/30 text-xs">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
