import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Branding & Value Prop */}
      <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-card p-12 lg:flex relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative z-10">
          <div className="mb-12">
            <Logo size="md" href="/" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground mt-24 leading-tight">
            The premium WhatsApp <br/>
            broadcasting platform <br/>
            for modern teams.
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-md">
            Connect with your audience where they already are. Send high-converting campaigns with institutional-grade reliability.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span>98.5% average delivery rate</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span>AI-powered contact mapping</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span>Institutional-grade analytics</span>
          </div>

          <div className="mt-12 rounded-xl border border-border/50 bg-background/50 p-6 backdrop-blur-sm">
            <p className="text-sm italic text-muted-foreground">
              "BroadcastHQ completely transformed our retention strategy. We saw a 3x increase in re-engagement within the first week."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div>
                <p className="text-sm font-medium text-foreground">Sarah Jenkins</p>
                <p className="text-xs text-muted-foreground">CMO at Velocity</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
