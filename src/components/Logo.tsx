import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  href?: string;
  className?: string;
  light?: boolean;
}

export function LogoIcon({ size = "md", className }: { size?: LogoProps["size"]; className?: string }) {
  const dim = size === "sm" ? 28 : size === "lg" ? 44 : 36;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <rect width="40" height="40" rx="9" fill="url(#bhq-bg)" />
      <defs>
        <linearGradient id="bhq-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      {/* Tower body */}
      <rect x="17.5" y="22" width="5" height="11" rx="2.5" fill="white" />
      {/* Arms */}
      <path d="M7 29 L17.5 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22.5 24 L33 29" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* Center node */}
      <circle cx="20" cy="20" r="2.5" fill="white" />
      {/* Signal arcs */}
      <path d="M13 20 A7 7 0 0 1 27 20" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M9 20 A11 11 0 0 1 31 20" stroke="white" strokeWidth="1.75" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M5 20 A15 15 0 0 1 35 20" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function Logo({ size = "md", iconOnly = false, href = "/", className, light = false }: LogoProps) {
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  const inner = (
    <span className={cn("flex items-center gap-2.5 select-none group", className)}>
      <LogoIcon size={size} />
      {!iconOnly && (
        <span className={cn("font-bold tracking-tight leading-none", textSize, light ? "text-white" : "text-foreground")}>
          Broadcast<span className={light ? "text-purple-300" : "text-primary"}>HQ</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        {inner}
      </Link>
    );
  }

  return inner;
}
