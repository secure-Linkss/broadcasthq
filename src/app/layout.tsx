import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BroadcastHQ — WhatsApp Marketing at Scale",
    template: "%s | BroadcastHQ",
  },
  description: "Send high-converting WhatsApp broadcast campaigns to thousands of contacts. AI-powered import, deep analytics, official Meta API. Built for teams that scale.",
  keywords: ["WhatsApp marketing", "WhatsApp CRM", "broadcast campaigns", "WhatsApp API", "message automation"],
  authors: [{ name: "BroadcastHQ" }],
  creator: "BroadcastHQ",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://broadcasthq.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "BroadcastHQ",
    title: "BroadcastHQ — WhatsApp Marketing at Scale",
    description: "Send high-converting WhatsApp broadcast campaigns to thousands of contacts.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BroadcastHQ — WhatsApp Marketing at Scale",
    description: "Send high-converting WhatsApp broadcast campaigns to thousands of contacts.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
