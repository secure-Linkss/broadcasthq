"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, MessageSquare, Users, Calendar, Save, Eye, ArrowLeft, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Template } from "@/types";

const steps = [
  { id: 1, title: "Setup", icon: Save },
  { id: 2, title: "Message", icon: MessageSquare },
  { id: 3, title: "Audience", icon: Users },
  { id: 4, title: "Review & Schedule", icon: Calendar },
];

export default function NewCampaignWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Form State
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [messageVariables, setMessageVariables] = useState<Record<string, string>>({});
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");

  // Load templates from real API
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await api.templates.list();
      setTemplates((res as Template[]).filter(t => t.status === "approved"));
    } catch {
      toast.error("Failed to load templates.");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const selectedTmpl = templates.find(t => t.id === selectedTemplate);

  const handleNext = () => {
    if (currentStep === 1 && !campaignName.trim()) {
      toast.error("Please enter a campaign name.");
      return;
    }
    if (currentStep === 2 && !selectedTemplate) {
      toast.error("Please select a template.");
      return;
    }
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSaveDraft = async () => {
    if (!campaignName.trim()) { toast.error("Campaign name is required."); return; }
    if (!selectedTmpl) { toast.error("Please select a template."); return; }
    setIsSaving(true);
    try {
      await api.campaigns.create({
        name: campaignName,
        templateName: selectedTmpl.name,
        templateVariables: messageVariables,
        scheduledDate: scheduleType === "later" && scheduledAt ? scheduledAt : undefined,
      });
      toast.success("Draft saved successfully.");
    } catch {
      toast.error("Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunch = async () => {
    if (!campaignName.trim()) { toast.error("Campaign name is required."); return; }
    if (!selectedTmpl) { toast.error("Please select a template."); return; }
    setIsSaving(true);
    try {
      const campaign = await api.campaigns.create({
        name: campaignName,
        templateName: selectedTmpl.name,
        templateVariables: messageVariables,
        scheduledDate: scheduleType === "later" && scheduledAt ? scheduledAt : undefined,
      });
      if (campaign?.id && scheduleType === "now") {
        await fetch(`/api/campaigns/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: campaign.id }),
        });
      }
      toast.success(scheduleType === "now" ? "Campaign launched!" : "Campaign scheduled!");
      router.push("/campaigns");
    } catch {
      toast.error("Failed to launch campaign.");
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium text-foreground">Campaign Details</h3>
              <p className="text-sm text-muted-foreground">Give your campaign a clear, descriptive name.</p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Summer Flash Sale 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="bg-card"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">Select Template</h3>
                <p className="text-sm text-muted-foreground">Choose an approved WhatsApp template.</p>
              </div>
              {templatesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : templates.length === 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground p-4 bg-muted/30 rounded-lg border border-border">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm">No approved templates found. Create and get a template approved first.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {templates.map((t) => (
                    <Card
                      key={t.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:border-primary/50",
                        selectedTemplate === t.id ? "border-primary bg-primary/5" : "bg-card"
                      )}
                      onClick={() => setSelectedTemplate(t.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-sm">{t.name}</div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                              {t.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {selectedTmpl && (selectedTmpl.variables?.length ?? 0) > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <h4 className="font-medium text-sm">Personalisation Variables</h4>
                  {(selectedTmpl.variables ?? []).map((v: string) => (
                    <div key={v} className="grid gap-1.5">
                      <Label className="text-xs font-mono text-primary">{`{{${v}}}`}</Label>
                      <Input
                        placeholder={`Value for ${v}...`}
                        value={messageVariables[v] ?? ""}
                        onChange={(e) => setMessageVariables(prev => ({ ...prev, [v]: e.target.value }))}
                        className="bg-card h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-muted/30 rounded-xl border border-border p-6 flex flex-col items-center justify-center min-h-[300px]">
              {selectedTmpl ? (
                <div className="w-full max-w-[280px]">
                  <div className="bg-[#075e54] rounded-t-xl px-4 py-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">B</div>
                    <div>
                      <p className="text-white text-sm font-semibold">BroadcastHQ</p>
                      <p className="text-[10px] text-white/60">Business · Just now</p>
                    </div>
                  </div>
                  <div className="bg-[#ece5dd] rounded-b-xl p-4">
                    <div className="bg-white rounded-xl rounded-tl-none px-3 py-2.5 shadow-sm text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {selectedTmpl.content}
                      <p className="text-[10px] text-right text-gray-400 mt-2">Now ✓✓</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Eye className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Select a template to preview</p>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-medium text-foreground">Target Audience</h3>
              <p className="text-sm text-muted-foreground">
                Your campaign will be sent to all active contacts in your workspace. Use contact filters or tags to narrow the audience in a future release.
              </p>
            </div>
            <div className="p-6 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-sm text-muted-foreground mb-1">Target</div>
              <div className="text-2xl font-bold text-primary">All Active Contacts</div>
              <p className="text-xs text-muted-foreground mt-1">Contacts with opted-out or blocked status are automatically excluded.</p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8 max-w-3xl">
            <div>
              <h3 className="text-lg font-medium text-foreground">Review & Schedule</h3>
              <p className="text-sm text-muted-foreground">Confirm your campaign details before launching.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Campaign Name</p>
                  <p className="font-medium">{campaignName || "Untitled Campaign"}</p>
                </CardContent>
              </Card>
              <Card className="bg-card">
                <CardContent className="p-4 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Template</p>
                  <p className="font-medium">{selectedTmpl?.name ?? "None selected"}</p>
                </CardContent>
              </Card>
              {selectedTmpl && (
                <Card className="col-span-2 bg-card">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Message Preview</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md border border-border/50 whitespace-pre-wrap">{selectedTmpl.content}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <h4 className="font-medium">Scheduling Options</h4>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={cn("border rounded-lg p-4 cursor-pointer relative overflow-hidden transition-colors", scheduleType === "now" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50")}
                  onClick={() => setScheduleType("now")}
                >
                  {scheduleType === "now" && (
                    <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <h5 className="font-medium mb-1">Send Now</h5>
                  <p className="text-xs text-muted-foreground">Campaign will begin processing immediately.</p>
                </div>
                <div
                  className={cn("border rounded-lg p-4 cursor-pointer relative overflow-hidden transition-colors", scheduleType === "later" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50")}
                  onClick={() => setScheduleType("later")}
                >
                  {scheduleType === "later" && (
                    <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  <h5 className="font-medium mb-1">Schedule for Later</h5>
                  <p className="text-xs text-muted-foreground">Set a specific date and time.</p>
                </div>
              </div>
              {scheduleType === "later" && (
                <div className="grid gap-2">
                  <Label htmlFor="scheduledAt">Schedule Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="bg-card w-64"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/campaigns")} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Create Campaign</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {isSaving ? <span className="text-primary animate-pulse">Saving...</span> : <span>Step {currentStep} of {steps.length}</span>}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" /> Save Draft
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Stepper Sidebar */}
        <div className="w-64 border-r border-border bg-card/30 p-6 hidden md:block">
          <div className="space-y-6">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isActive = currentStep === step.id;
              return (
                <div key={step.id} className="relative">
                  {index !== steps.length - 1 && (
                    <div className={cn("absolute top-8 left-4 w-px h-10 -ml-px", isCompleted ? "bg-primary" : "bg-border")} />
                  )}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                      isCompleted ? "bg-primary border-primary text-primary-foreground" :
                      isActive ? "border-primary text-primary" : "border-muted-foreground text-muted-foreground"
                    )}>
                      {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                    </div>
                    <span className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                      {step.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 p-6 md:p-10">
            {renderStepContent()}
          </div>

          {/* Footer Controls */}
          <div className="p-6 border-t border-border bg-card/50 flex justify-between items-center">
            <Button variant="outline" onClick={handlePrev} disabled={currentStep === 1}>
              Back
            </Button>
            {currentStep < 4 ? (
              <Button onClick={handleNext}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleLaunch} disabled={isSaving} className="shadow-lg shadow-primary/20">
                {scheduleType === "now" ? "Launch Campaign" : "Schedule Campaign"} <Send className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
