"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, FileSpreadsheet, CheckCircle2, ArrowRight, ArrowLeft, Loader2, Database, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function ContactImportPage() {
  const router = useRouter();
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  const handleFileUpload = () => {
    setStage(2);
    setIsProcessing(true);
    
    // Simulate AI processing steps
    const steps = [
      { step: 1, delay: 1000 }, // Parsing file
      { step: 2, delay: 2500 }, // Detecting headers
      { step: 3, delay: 4000 }, // Mapping phone numbers
      { step: 4, delay: 5500 }, // Identifying custom fields
    ];

    steps.forEach(({ step, delay }) => {
      setTimeout(() => setProcessingStep(step), delay);
    });

    setTimeout(() => {
      setIsProcessing(false);
      setStage(3);
    }, 7000);
  };

  const handleImport = () => {
    toast.success("Successfully imported 1,245 contacts");
    router.push("/contacts");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Import Contacts</h2>
          <p className="text-muted-foreground">
            Use our AI engine to automatically map columns and clean your contact data.
          </p>
        </div>
      </div>

      {stage === 1 && (
        <div className="space-y-6">
          <div 
            className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl bg-card/50 flex flex-col items-center justify-center p-12 text-center cursor-pointer"
            onClick={handleFileUpload}
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UploadCloud className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Click or drag file to this area to upload</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Support for a single or bulk upload. Strictly prohibit from uploading company data or other banned files.
            </p>
            <div className="mt-6 flex gap-4 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1"><FileSpreadsheet className="h-4 w-4" /> CSV</span>
              <span className="flex items-center gap-1"><FileSpreadsheet className="h-4 w-4" /> XLS</span>
              <span className="flex items-center gap-1"><FileSpreadsheet className="h-4 w-4" /> XLSX</span>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Recent Imports</h4>
            <Card className="bg-card">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">q1_leads_export.csv</p>
                      <p className="text-xs text-muted-foreground">May 10, 2026 • 2.4 MB</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">Completed</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {stage === 2 && (
        <div className="flex flex-col items-center justify-center py-20 space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="h-20 w-20 rounded-full bg-card border border-primary/30 flex items-center justify-center relative z-10 shadow-lg">
              <Wand2 className="h-10 w-10 text-primary animate-bounce" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">AI Data Processing</h3>
            <p className="text-muted-foreground">Analyzing your file and mapping data structure...</p>
          </div>

          <div className="w-full max-w-md space-y-4">
            {[
              { id: 1, label: "Parsing file structure" },
              { id: 2, label: "Detecting column headers" },
              { id: 3, label: "Mapping phone numbers & standardizing formats" },
              { id: 4, label: "Identifying custom fields & tags" },
            ].map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                {processingStep > s.id ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : processingStep === s.id ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span className={processingStep >= s.id ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stage === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-success/10 border-success/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-success mb-1">1,245</div>
                <div className="text-sm font-medium text-success/80">Valid Contacts</div>
              </CardContent>
            </Card>
            <Card className="bg-warning/10 border-warning/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-warning mb-1">12</div>
                <div className="text-sm font-medium text-warning/80">Updated</div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-destructive mb-1">3</div>
                <div className="text-sm font-medium text-destructive/80">Skipped (Invalid Phone)</div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              AI Column Mapping Review
            </h3>
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium w-1/3">File Column</th>
                    <th className="px-4 py-3 font-medium w-1/3">BroadcastHQ Field</th>
                    <th className="px-4 py-3 font-medium w-1/3">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono">mobile_number</td>
                    <td className="px-4 py-3 font-medium text-primary flex items-center gap-2">
                      Phone Number <CheckCircle2 className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="bg-success/10 text-success border-success/20">99% Match</Badge></td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono">first_name</td>
                    <td className="px-4 py-3 font-medium text-primary flex items-center gap-2">
                      First Name <CheckCircle2 className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="bg-success/10 text-success border-success/20">100% Match</Badge></td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono">org_name</td>
                    <td className="px-4 py-3 font-medium text-primary flex items-center gap-2">
                      Company (Custom) <CheckCircle2 className="h-4 w-4" />
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">85% Match</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-border">
            <Button variant="outline" onClick={() => setStage(1)}>Cancel</Button>
            <Button onClick={handleImport} className="shadow-lg shadow-primary/20">
              Confirm & Import <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
