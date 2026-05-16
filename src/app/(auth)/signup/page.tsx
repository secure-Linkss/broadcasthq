"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");

  const strength = (() => {
    let s = 0;
    if (password.length > 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsLoading(false);
      toast.error(data.error ?? "Registration failed. Please try again.");
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });

    setIsLoading(false);

    if (result?.error) {
      toast.error("Account created but sign-in failed. Please log in.");
      router.push("/login");
      return;
    }

    toast.success("Account created! Welcome to BroadcastHQ.");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Create an account</h2>
        <p className="text-sm text-muted-foreground">
          Enter your details below to start your 14-day free trial.
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="John Doe"
                type="text"
                disabled={isLoading}
                className="pl-9 bg-card"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Work Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                placeholder="name@company.com"
                type="email"
                disabled={isLoading}
                className="pl-9 bg-card"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-9 bg-card"
                minLength={8}
                required
              />
            </div>
            {password.length > 0 && (
              <div className="mt-1 space-y-2">
                <div className="flex h-1.5 gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={cn(
                        "h-full flex-1 rounded-full bg-muted transition-colors",
                        strength >= i && i <= 2 ? "bg-yellow-500" : "",
                        strength >= i && i > 2  ? "bg-green-500"  : ""
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {strength < 2 ? "Weak — add numbers & symbols" :
                   strength === 2 ? "Fair — add more characters" :
                   "Strong password"}
                </p>
              </div>
            )}
          </div>

          <Button disabled={isLoading} className="mt-4 w-full shadow-lg shadow-primary/20">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </form>

      <p className="px-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
