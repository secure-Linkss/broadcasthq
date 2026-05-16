"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { WhatsAppConnectionStatus } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone, ShieldCheck, AlertTriangle } from "lucide-react";

export function WhatsAppStatusCard() {
  const [status, setStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.settings.getWhatsAppStatus().then((res) => {
      setStatus(res);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <Card className="col-span-2 bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2 bg-card flex flex-col justify-between">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>WhatsApp API</span>
          {status?.isConnected ? (
            <Badge variant="outline" className="bg-success/20 text-success border-success/20">
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/20">
              Disconnected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Official Cloud API Connection</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status?.isConnected ? (
          <>
            <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground">{status.phoneNumber}</p>
                <p className="truncate text-xs text-muted-foreground">WABA ID: {status.wabaId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Quality Rating</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span className="text-sm font-medium capitalize">{status.qualityRating}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Messaging Limit</p>
                <span className="text-sm font-medium">{status.messagingLimit}</span>
              </div>
            </div>

            {status.verificationStatus === "verified" && (
              <div className="flex items-center gap-2 text-xs font-medium text-success">
                <ShieldCheck className="h-4 w-4" />
                Verified Business
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertTriangle className="mb-2 h-8 w-8 text-warning" />
            <p className="text-sm font-medium text-foreground">Action Required</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Connect your WhatsApp Business Account to start sending messages.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant={status?.isConnected ? "outline" : "default"} className="w-full">
          {status?.isConnected ? "Manage Connection" : "Connect WhatsApp"}
        </Button>
      </CardFooter>
    </Card>
  );
}
