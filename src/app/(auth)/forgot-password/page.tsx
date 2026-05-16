"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailRef.current?.value ?? "";
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setIsSubmitted(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Reset password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we will send you a link to reset your password.
        </p>
      </div>

      {!isSubmitted ? (
        <div className="grid gap-6">
          <form onSubmit={onSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    ref={emailRef}
                    placeholder="name@example.com"
                    type="email"
                    disabled={isLoading}
                    className="pl-9 bg-card"
                    required
                  />
                </div>
              </div>
              <Button disabled={isLoading} className="mt-2 w-full shadow-lg shadow-primary/20">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-green-500" />
          <h3 className="mb-2 font-medium text-foreground">Check your email</h3>
          <p className="text-sm text-muted-foreground">
            If an account exists for that address, we&apos;ve sent a password reset link. Check your inbox and spam folder.
          </p>
        </div>
      )}

      <div className="text-center mt-4">
        <Link href="/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
