"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Template } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Search, MessageSquare, CheckCircle2, Clock, XCircle, Globe2,
  Star, StarOff, Copy, Eye, BarChart3, Zap, Folder, FolderOpen,
  Variable, Sparkles, Download, RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BUILT_IN_VARIABLES, renderPersonalization, extractVariables } from "@/lib/personalization";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnhancedTemplate extends Template {
  folder?:          string;
  isFavorite?:      boolean;
  usageCount?:      number;
  description?:     string;
  avgDeliveryRate?: number;
  avgReadRate?:     number;
}


const FOLDERS = ["All", "Promotions", "Reminders", "Newsletters", "Retention", "Transactional"];

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
  pending:  "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

function WhatsAppPreview({ content, vars }: { content: string; vars: Record<string, string> }) {
  const ctx = {
    firstName: vars.first_name || "Sarah",
    lastName:  vars.last_name  || "Jenkins",
    ...vars,
  };
  const rendered = renderPersonalization(content, ctx as any);
  return (
    <div className="w-full max-w-[300px] mx-auto">
      <div className="bg-[#0b1120] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold shrink-0">B</div>
          <div>
            <p className="text-white text-sm font-semibold">BroadcastHQ</p>
            <p className="text-[10px] text-white/60">Business · 1 min ago</p>
          </div>
        </div>
        <div className="p-4 bg-[#ece5dd] min-h-[120px]">
          <div className="bg-white rounded-xl rounded-tl-none px-3 py-2.5 shadow-sm max-w-[90%] text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {rendered}
            <p className="text-[10px] text-right text-gray-400 mt-2">Now ✓✓</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Personalization Editor ────────────────────────────────────────────────────

function PersonalizationEditor({
  content, onChange,
}: { content: string; onChange: (v: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVarMenu, setShowVarMenu] = useState(false);

  const insertVar = (varStr: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = content.slice(0, start) + varStr + content.slice(end);
    onChange(next);
    setShowVarMenu(false);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + varStr.length, start + varStr.length);
    }, 0);
  };

  const usedVars = extractVariables(content);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Message Content</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"
          onClick={() => setShowVarMenu(v => !v)}>
          <Variable className="h-3.5 w-3.5" /> Insert Variable
        </Button>
      </div>

      {showVarMenu && (
        <div className="border border-border rounded-lg bg-popover overflow-hidden shadow-lg z-10">
          <div className="p-2 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground">Available Variables</p>
          </div>
          <ScrollArea className="h-40">
            <div className="p-1">
              {BUILT_IN_VARIABLES.map(v => (
                <button
                  key={v.variable}
                  type="button"
                  onClick={() => insertVar(v.variable)}
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-md flex items-center justify-between group"
                >
                  <div>
                    <code className="text-xs text-primary">{v.variable}</code>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{v.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{v.example}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
          {/* Randomization hint */}
          <div className="p-2 border-t border-border bg-muted/30">
            <p className="text-[10px] text-muted-foreground">
              <span className="font-mono text-primary">[Hi|Hello|Hey]</span> — add randomized phrases to reduce repetition
            </p>
          </div>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={e => onChange(e.target.value)}
        className="h-28 bg-background font-mono text-sm resize-none"
        placeholder="Hi {{first_name}}, your order {{invoice_number}} is ready!"
      />

      {usedVars.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {usedVars.map(v => (
            <Badge key={v} variant="secondary" className="text-[10px] font-mono gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> {`{{${v}}}`}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates]       = useState<EnhancedTemplate[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [activeFolder, setActiveFolder] = useState("All");
  const [filter, setFilter]             = useState<"all" | "favorites">("all");
  const [previewTemplate, setPreviewTemplate] = useState<EnhancedTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newContent, setNewContent]     = useState("");
  const [previewVars, setPreviewVars]   = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.templates.list();
      setTemplates(res as EnhancedTemplate[]);
    } catch {
      toast.error("Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
    toast.success("Template updated");
  };

  const duplicate = (tmpl: EnhancedTemplate) => {
    const copy: EnhancedTemplate = { ...tmpl, id: `${tmpl.id}_copy`, name: `${tmpl.name} (copy)`, isFavorite: false };
    setTemplates(prev => [...prev, copy]);
    toast.success("Template duplicated");
  };

  const filtered = templates.filter(t => {
    const matchSearch = search === "" || t.name.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
    const matchFolder = activeFolder === "All" || t.folder === activeFolder;
    const matchFav    = filter === "all" || t.isFavorite;
    return matchSearch && matchFolder && matchFav;
  });

  // Auto-extract vars for preview
  useEffect(() => {
    if (!previewTemplate) return;
    const vars = extractVariables(previewTemplate.content);
    const initial: Record<string, string> = {};
    vars.forEach(v => {
      initial[v] = { first_name: "Sarah", last_name: "Jenkins", discount: "30%", agent_name: "Alex",
        appointment_date: "May 20, 2026 10:00am", invoice_number: "INV-00123", link: "https://shop.co", product: "ProMax 2.0" }[v] ?? "";
    });
    setPreviewVars(initial);
  }, [previewTemplate]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newTmpl: EnhancedTemplate = {
      id: `t${Date.now()}`, name: formData.get("name") as string,
      category: formData.get("category") as string,
      language: formData.get("language") as string,
      status: "pending", folder: formData.get("folder") as string || "General",
      content: newContent, variables: extractVariables(newContent),
      isFavorite: false, usageCount: 0,
    };
    setTemplates(prev => [newTmpl, ...prev]);
    setIsCreateOpen(false);
    setNewContent("");
    toast.success("Template submitted for Meta review");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Message Templates</h2>
          <p className="text-muted-foreground text-sm">
            {templates.length} templates · {templates.filter(t => t.status === "approved").length} approved · {templates.filter(t => t.isFavorite).length} favorites
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Sync Meta
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Create Template</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[640px] bg-card border-border">
              <form onSubmit={handleCreateSubmit}>
                <DialogHeader>
                  <DialogTitle>Create WhatsApp Template</DialogTitle>
                  <DialogDescription>Templates require Meta approval (24–48h). Use approved variable format.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Template Name</Label>
                      <Input id="name" name="name" placeholder="summer_sale_v2" className="bg-background font-mono text-sm" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="folder">Folder</Label>
                      <select name="folder" id="folder" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        {FOLDERS.filter(f => f !== "All").map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Category</Label>
                      <select id="category" name="category" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="MARKETING">Marketing</option>
                        <option value="UTILITY">Utility</option>
                        <option value="AUTHENTICATION">Authentication</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="language">Language</Label>
                      <select id="language" name="language" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="en_US">English (US)</option>
                        <option value="en_GB">English (UK)</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="pt_BR">Portuguese (BR)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input id="description" name="description" placeholder="Briefly describe this template's purpose" className="bg-background" />
                  </div>
                  <PersonalizationEditor content={newContent} onChange={setNewContent} />
                  {newContent && (
                    <>
                      <Separator />
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-primary" /> Live Preview</Label>
                        <WhatsAppPreview content={newContent} vars={{}} />
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="gap-1.5"><Sparkles className="h-4 w-4" /> Submit for Review</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Folder tabs + filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {FOLDERS.map(folder => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                activeFolder === folder
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {activeFolder === folder ? <FolderOpen className="h-3 w-3" /> : <Folder className="h-3 w-3" />}
              {folder}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setFilter(f => f === "favorites" ? "all" : "favorites")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === "favorites" ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-500" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Star className="h-3 w-3" /> Favorites
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-8 h-8 w-52 bg-card text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Template grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">No templates found</p>
          <p className="text-xs mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tmpl => (
            <Card key={tmpl.id} className="group hover:border-primary/40 transition-all flex flex-col">
              <CardContent className="p-4 flex flex-col h-full gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{tmpl.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{tmpl.category}</Badge>
                        {tmpl.folder && <span className="text-[9px] text-muted-foreground">{tmpl.folder}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(tmpl.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {tmpl.isFavorite
                      ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      : <StarOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>

                {/* Content preview */}
                <div className="bg-muted/30 rounded-lg p-2.5 text-xs text-foreground border border-border/50 leading-relaxed line-clamp-3 flex-1">
                  {tmpl.content}
                </div>

                {/* Stats */}
                {(tmpl.avgReadRate ?? 0) > 0 && (
                  <div className="flex gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Delivery </span>
                      <span className="font-semibold text-green-500">{tmpl.avgDeliveryRate?.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Read </span>
                      <span className="font-semibold text-primary">{tmpl.avgReadRate?.toFixed(1)}%</span>
                    </div>
                    {(tmpl.usageCount ?? 0) > 0 && (
                      <div className="ml-auto text-muted-foreground">Used {tmpl.usageCount}x</div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[tmpl.status] ?? ""}`}>
                    {tmpl.status === "approved" && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
                    {tmpl.status === "pending"  && <Clock className="h-2.5 w-2.5 mr-1" />}
                    {tmpl.status === "rejected" && <XCircle className="h-2.5 w-2.5 mr-1" />}
                    {tmpl.status}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicate(tmpl)} title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewTemplate(tmpl)} title="Preview">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Sheet */}
      <Sheet open={!!previewTemplate} onOpenChange={open => !open && setPreviewTemplate(null)}>
        <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
          {previewTemplate && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-base">{previewTemplate.name}</SheetTitle>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[previewTemplate.status]}`}>
                    {previewTemplate.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{previewTemplate.description ?? previewTemplate.folder}</p>
              </SheetHeader>

              <Tabs defaultValue="preview">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="preview"     className="flex-1 text-xs"><Eye className="h-3.5 w-3.5 mr-1.5" /> Preview</TabsTrigger>
                  <TabsTrigger value="vars"         className="flex-1 text-xs"><Variable className="h-3.5 w-3.5 mr-1.5" /> Variables</TabsTrigger>
                  <TabsTrigger value="performance" className="flex-1 text-xs"><BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="space-y-4">
                  <WhatsAppPreview content={previewTemplate.content} vars={previewVars} />
                  <div className="bg-muted/30 rounded-lg p-3 text-xs font-mono leading-relaxed text-foreground border border-border/50 whitespace-pre-wrap">
                    {previewTemplate.content}
                  </div>
                </TabsContent>

                <TabsContent value="vars" className="space-y-4">
                  <p className="text-xs text-muted-foreground">Fill in sample values to see a real preview</p>
                  {extractVariables(previewTemplate.content).map(v => (
                    <div key={v} className="grid gap-1.5">
                      <Label className="text-xs font-mono text-primary">{`{{${v}}}`}</Label>
                      <Input
                        placeholder={`Enter ${v}...`}
                        className="h-8 text-xs bg-background"
                        value={previewVars[v] ?? ""}
                        onChange={e => setPreviewVars(p => ({ ...p, [v]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {extractVariables(previewTemplate.content).length === 0 && (
                    <p className="text-xs text-muted-foreground">No variables in this template.</p>
                  )}
                  <Separator />
                  <div className="text-xs font-medium mb-2">Preview with your values:</div>
                  <WhatsAppPreview content={previewTemplate.content} vars={previewVars} />
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  {(previewTemplate.avgReadRate ?? 0) > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Avg Delivery Rate", value: `${previewTemplate.avgDeliveryRate?.toFixed(1)}%`, color: "text-green-500" },
                          { label: "Avg Read Rate",     value: `${previewTemplate.avgReadRate?.toFixed(1)}%`,    color: "text-primary"   },
                          { label: "Times Used",        value: String(previewTemplate.usageCount ?? 0),           color: "text-foreground" },
                          { label: "Category",          value: previewTemplate.category,                          color: "text-muted-foreground" },
                        ].map(s => (
                          <div key={s.label} className="p-3 rounded-lg bg-muted/50 border border-border">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span>Read Rate Performance</span>
                          <span className="font-mono text-primary">{previewTemplate.avgReadRate?.toFixed(1)}%</span>
                        </div>
                        <Progress value={previewTemplate.avgReadRate} className="h-2" />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {(previewTemplate.avgReadRate ?? 0) > 70
                            ? "Above workspace average (72.4%) — excellent template"
                            : "Below workspace average (72.4%) — consider A/B testing"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No performance data yet</p>
                      <p className="text-xs mt-1">Use this template in a campaign to see stats</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => duplicate(previewTemplate)}>
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button size="sm" className="flex-1 gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Use in Campaign
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
