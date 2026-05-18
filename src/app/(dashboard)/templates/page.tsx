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
  Plus, Search, MessageSquare, CheckCircle2, Clock, XCircle,
  Star, StarOff, Copy, Eye, BarChart3, Zap, Folder, FolderOpen,
  Variable, Sparkles, RefreshCw, Image as ImageIcon, Video, FileText,
  X, Upload, Link as LinkIcon, ChevronDown, ChevronUp, Layers,
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
  headerType?:      "none" | "image" | "video" | "document";
  headerUrl?:       string;
  carouselImages?:  string[];
}

type HeaderType = "none" | "text" | "image" | "video" | "document";

const FOLDERS = ["All", "Promotions", "Reminders", "Newsletters", "Retention", "Transactional"];

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
  pending:  "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const ACCEPTED_VIDEO_TYPES = "video/mp4,video/3gpp";
const ACCEPTED_DOC_TYPES   = "application/pdf,.doc,.docx";

// ── Grouped variables ──────────────────────────────────────────────────────────

const VARIABLE_GROUPS = Array.from(new Set(BUILT_IN_VARIABLES.map(v => v.group)));

// ── WhatsApp Preview ───────────────────────────────────────────────────────────

function WhatsAppPreview({
  content, vars, headerType, headerUrl, carouselImages,
}: {
  content: string;
  vars: Record<string, string>;
  headerType?: HeaderType;
  headerUrl?: string;
  carouselImages?: string[];
}) {
  const ctx = { firstName: vars.first_name || "Sarah", lastName: vars.last_name || "Jenkins", ...vars };
  const rendered = renderPersonalization(content, ctx as any);
  const hasCarousel = carouselImages && carouselImages.filter(Boolean).length > 1;

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
        <div className="p-3 bg-[#ece5dd] min-h-[120px] space-y-2">
          {/* Carousel mode */}
          {hasCarousel && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {carouselImages!.filter(Boolean).map((url, i) => (
                <div key={i} className="shrink-0 w-[120px] h-[80px] rounded-lg overflow-hidden border border-white/20 bg-black/20">
                  <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl rounded-tl-none shadow-sm max-w-[90%] overflow-hidden">
            {/* Single image/video/doc header */}
            {!hasCarousel && headerType === "image" && headerUrl && (
              <div className="w-full h-[140px] bg-gray-100 overflow-hidden">
                <img src={headerUrl} alt="Header" className="w-full h-full object-cover" />
              </div>
            )}
            {!hasCarousel && headerType === "video" && headerUrl && (
              <div className="w-full h-[140px] bg-black flex items-center justify-center">
                <Video className="h-10 w-10 text-white/70" />
              </div>
            )}
            {!hasCarousel && headerType === "document" && (
              <div className="w-full px-3 py-2 bg-blue-50 flex items-center gap-2 border-b border-blue-100">
                <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                <span className="text-xs text-blue-700 truncate">Document.pdf</span>
              </div>
            )}
            <div className="px-3 py-2.5 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {rendered}
              <p className="text-[10px] text-right text-gray-400 mt-2">Now ✓✓</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Media Header Picker ────────────────────────────────────────────────────────

function MediaHeaderPicker({
  headerType, setHeaderType, headerUrl, setHeaderUrl,
  carouselImages, setCarouselImages,
}: {
  headerType: HeaderType;
  setHeaderType: (t: HeaderType) => void;
  headerUrl: string;
  setHeaderUrl: (u: string) => void;
  carouselImages: string[];
  setCarouselImages: (imgs: string[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode]   = useState(true);
  const [carousel, setCarousel] = useState(false);

  const HEADER_TYPES: { type: HeaderType; icon: React.ElementType; label: string }[] = [
    { type: "none",     icon: MessageSquare, label: "None"     },
    { type: "text",     icon: MessageSquare, label: "Text"     },
    { type: "image",    icon: ImageIcon,     label: "Image"    },
    { type: "video",    icon: Video,         label: "Video"    },
    { type: "document", icon: FileText,      label: "Document" },
  ];

  const acceptedTypes =
    headerType === "image"    ? ACCEPTED_IMAGE_TYPES :
    headerType === "video"    ? ACCEPTED_VIDEO_TYPES :
    headerType === "document" ? ACCEPTED_DOC_TYPES : "";

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      if (carousel) {
        setCarouselImages([...carouselImages, result]);
      } else {
        setHeaderUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <Label>Header Type</Label>
      <div className="flex gap-2 flex-wrap">
        {HEADER_TYPES.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => { setHeaderType(type); setHeaderUrl(""); setCarouselImages([]); setCarousel(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              headerType === type
                ? "bg-primary/10 border-primary text-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {headerType === "text" && (
        <Input
          placeholder="Header text (e.g. 'Special Offer 🎉')"
          value={headerUrl}
          onChange={e => setHeaderUrl(e.target.value)}
          className="bg-background text-sm"
        />
      )}

      {(headerType === "image" || headerType === "video" || headerType === "document") && (
        <div className="space-y-3">
          {/* Carousel toggle — images only */}
          {headerType === "image" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setCarousel(c => !c); setHeaderUrl(""); setCarouselImages([]); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  carousel ? "bg-purple-500/10 border-purple-500/30 text-purple-500" : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Carousel (multi-image)
              </button>
            </div>
          )}

          {/* URL / Upload toggle */}
          <div className="flex gap-1 border border-border rounded-lg p-0.5 w-fit">
            <button type="button" onClick={() => setUrlMode(true)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${urlMode ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
              <LinkIcon className="h-3 w-3" /> URL
            </button>
            <button type="button" onClick={() => setUrlMode(false)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${!urlMode ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
              <Upload className="h-3 w-3" /> Upload
            </button>
          </div>

          {urlMode ? (
            <div className="space-y-2">
              <Input
                placeholder={
                  carousel
                    ? "Enter image URL then press Enter to add"
                    : headerType === "image" ? "https://example.com/image.jpg"
                    : headerType === "video" ? "https://example.com/video.mp4"
                    : "https://example.com/document.pdf"
                }
                value={carousel ? "" : headerUrl}
                onChange={e => { if (!carousel) setHeaderUrl(e.target.value); }}
                onKeyDown={e => {
                  if (carousel && e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) { setCarouselImages([...carouselImages, val]); (e.target as HTMLInputElement).value = ""; }
                  }
                }}
                className="bg-background text-sm"
              />
              {carousel && (
                <p className="text-[10px] text-muted-foreground">Press Enter to add each image URL. Max 10 images.</p>
              )}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Drop file here or click to browse</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {headerType === "image"    && "JPG, PNG, WEBP, GIF · Max 5 MB"}
                {headerType === "video"    && "MP4, 3GPP · Max 16 MB"}
                {headerType === "document" && "PDF, DOC, DOCX · Max 100 MB"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                multiple={carousel}
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  if (carousel) {
                    files.forEach(f => handleFile(f));
                  } else if (files[0]) {
                    handleFile(files[0]);
                  }
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {/* Carousel image list */}
          {carousel && carouselImages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium">{carouselImages.length} image{carouselImages.length !== 1 ? "s" : ""} in carousel</p>
              <div className="flex gap-2 flex-wrap">
                {carouselImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={img} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCarouselImages(carouselImages.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single image preview */}
          {!carousel && headerUrl && headerType === "image" && (
            <div className="relative group w-full h-32 rounded-lg overflow-hidden border border-border">
              <img src={headerUrl} alt="Header preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setHeaderUrl("")}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Personalization Editor ────────────────────────────────────────────────────

function PersonalizationEditor({
  content, onChange,
}: { content: string; onChange: (v: string) => void }) {
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const [showVarMenu, setShowVarMenu]   = useState(false);
  const [activeGroup, setActiveGroup]   = useState(VARIABLE_GROUPS[0]);
  const [varSearch, setVarSearch]       = useState("");

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

  const filteredVars = BUILT_IN_VARIABLES.filter(v =>
    (varSearch === "" || v.variable.includes(varSearch) || v.description.toLowerCase().includes(varSearch.toLowerCase())) &&
    (varSearch !== "" || v.group === activeGroup)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Message Content</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"
          onClick={() => setShowVarMenu(v => !v)}>
          <Variable className="h-3.5 w-3.5" />
          Insert Variable
          {showVarMenu ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {showVarMenu && (
        <div className="border border-border rounded-xl bg-popover overflow-hidden shadow-xl">
          {/* Search */}
          <div className="p-2 border-b border-border flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search variables..."
                className="pl-8 h-7 text-xs bg-background"
                value={varSearch}
                onChange={e => setVarSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          {/* Group tabs */}
          {varSearch === "" && (
            <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
              {VARIABLE_GROUPS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGroup(g)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors ${
                    activeGroup === g ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          {/* Variable list */}
          <ScrollArea className="h-44">
            <div className="p-1.5 grid grid-cols-1 gap-0.5">
              {filteredVars.map(v => (
                <button
                  key={v.variable}
                  type="button"
                  onClick={() => insertVar(v.variable)}
                  className="w-full text-left px-3 py-2 hover:bg-muted rounded-lg flex items-center justify-between gap-4 group transition-colors"
                >
                  <div className="min-w-0">
                    <code className="text-xs text-primary font-mono">{v.variable}</code>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{v.description}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 font-mono">{v.example}</span>
                </button>
              ))}
              {filteredVars.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No variables match your search.</p>
              )}
            </div>
          </ScrollArea>
          {/* Hint */}
          <div className="p-2.5 border-t border-border bg-muted/30 flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px] text-primary">[Hi|Hello|Hey]</Badge>
            <span className="text-[10px] text-muted-foreground">Randomized phrases reduce repetition</span>
          </div>
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={e => onChange(e.target.value)}
        className="h-28 bg-background font-mono text-sm resize-none"
        placeholder="Hi {{first_name}}, your case {{case_no}} has been updated. Ref: {{ref_number}}"
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

  // Media header state for create dialog
  const [headerType, setHeaderType]         = useState<HeaderType>("none");
  const [headerUrl, setHeaderUrl]           = useState("");
  const [carouselImages, setCarouselImages] = useState<string[]>([]);

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

  useEffect(() => {
    if (!previewTemplate) return;
    const vars = extractVariables(previewTemplate.content);
    const defaults: Record<string, string> = {
      first_name: "Sarah", last_name: "Jenkins", discount: "30%", agent_name: "Alex",
      appointment_date: "20 May 2026 10:00am", invoice_number: "INV-00123",
      ref_number: "REF-20260518", case_no: "CASE-00456", order_id: "ORD-789",
      tracking_number: "TRK-GB1234567890", due_date: "31 May 2026",
      amount: "£149.99", promo_code: "SAVE30", ticket_id: "TKT-3310",
    };
    const initial: Record<string, string> = {};
    vars.forEach(v => { initial[v] = defaults[v] ?? ""; });
    setPreviewVars(initial);
  }, [previewTemplate]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newTmpl: EnhancedTemplate = {
      id: `t${Date.now()}`,
      name:     formData.get("name") as string,
      category: formData.get("category") as string,
      language: formData.get("language") as string,
      status:   "pending",
      folder:   formData.get("folder") as string || "General",
      content:  newContent,
      variables: extractVariables(newContent),
      isFavorite: false, usageCount: 0,
      headerType: headerType === "none" || headerType === "text" ? undefined : headerType,
      headerUrl:  headerType === "image" || headerType === "video" || headerType === "document" ? headerUrl : undefined,
      carouselImages: carouselImages.length > 0 ? carouselImages : undefined,
    };
    setTemplates(prev => [newTmpl, ...prev]);
    setIsCreateOpen(false);
    setNewContent("");
    setHeaderType("none");
    setHeaderUrl("");
    setCarouselImages([]);
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
          <Dialog open={isCreateOpen} onOpenChange={open => {
            setIsCreateOpen(open);
            if (!open) { setNewContent(""); setHeaderType("none"); setHeaderUrl(""); setCarouselImages([]); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Create Template</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[680px] bg-card border-border max-h-[90dvh] flex flex-col">
              <form onSubmit={handleCreateSubmit} className="flex flex-col min-h-0 flex-1">
                <DialogHeader className="shrink-0">
                  <DialogTitle>Create WhatsApp Template</DialogTitle>
                  <DialogDescription>Templates require Meta approval (24–48h). Supports images, video, documents, and carousels.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-4">
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
                        <option value="ar">Arabic</option>
                        <option value="de">German</option>
                        <option value="it">Italian</option>
                      </select>
                    </div>
                  </div>

                  {/* Media Header */}
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Media Header</span>
                      <Badge variant="secondary" className="text-[9px]">optional</Badge>
                    </div>
                    <MediaHeaderPicker
                      headerType={headerType} setHeaderType={setHeaderType}
                      headerUrl={headerUrl} setHeaderUrl={setHeaderUrl}
                      carouselImages={carouselImages} setCarouselImages={setCarouselImages}
                    />
                  </div>

                  {/* Message content */}
                  <PersonalizationEditor content={newContent} onChange={setNewContent} />

                  {/* Live preview */}
                  {(newContent || headerUrl || carouselImages.length > 0) && (
                    <>
                      <Separator />
                      <div className="grid gap-2">
                        <Label className="flex items-center gap-2"><Eye className="h-3.5 w-3.5 text-primary" /> Live Preview</Label>
                        <WhatsAppPreview
                          content={newContent} vars={{}}
                          headerType={headerType}
                          headerUrl={headerUrl}
                          carouselImages={carouselImages}
                        />
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter className="shrink-0 pt-2 border-t border-border mt-2">
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
                {/* Image header thumbnail */}
                {tmpl.headerType === "image" && tmpl.headerUrl && (
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-border -mt-0.5">
                    <img src={tmpl.headerUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {tmpl.carouselImages && tmpl.carouselImages.length > 0 && (
                  <div className="flex gap-1.5 -mt-0.5">
                    {tmpl.carouselImages.slice(0, 3).map((img, i) => (
                      <div key={i} className="flex-1 h-16 rounded-lg overflow-hidden border border-border relative">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {i === 2 && tmpl.carouselImages!.length > 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">
                            +{tmpl.carouselImages!.length - 3}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      {tmpl.headerType === "image" ? <ImageIcon className="h-4 w-4 text-primary" /> :
                       tmpl.headerType === "video" ? <Video className="h-4 w-4 text-primary" /> :
                       tmpl.headerType === "document" ? <FileText className="h-4 w-4 text-primary" /> :
                       <MessageSquare className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{tmpl.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{tmpl.category}</Badge>
                        {tmpl.folder && <span className="text-[9px] text-muted-foreground">{tmpl.folder}</span>}
                        {tmpl.carouselImages && tmpl.carouselImages.length > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-purple-500 border-purple-500/30">
                            <Layers className="h-2.5 w-2.5 mr-0.5" />{tmpl.carouselImages.length} slides
                          </Badge>
                        )}
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
                  <WhatsAppPreview
                    content={previewTemplate.content} vars={previewVars}
                    headerType={previewTemplate.headerType}
                    headerUrl={previewTemplate.headerUrl}
                    carouselImages={previewTemplate.carouselImages}
                  />
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
                  <WhatsAppPreview
                    content={previewTemplate.content} vars={previewVars}
                    headerType={previewTemplate.headerType}
                    headerUrl={previewTemplate.headerUrl}
                    carouselImages={previewTemplate.carouselImages}
                  />
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
