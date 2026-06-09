import type { Metadata, Viewport } from "next";
import { APP_NAME, APP_SHORT_NAME, APP_URL } from "@/lib/branding";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LogRocketProvider } from "@/components/providers/logrocket-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { VersionUpdateNotification } from "@/components/version/VersionUpdateNotification";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: APP_NAME,
  description: "Envelope budgeting made simple — take back control of your money.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-light-16x16.png",
        sizes: "16x16",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/favicon-light-32x32.png",
        sizes: "32x32",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      {
        url: "/apple-icon-light.png",
        sizes: "180x180",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_SHORT_NAME,
  },
  applicationName: APP_NAME,
};

export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <LogRocketProvider>
          <ThemeProvider>
            <ServiceWorkerProvider>
              {children}
              <Toaster />
              <InstallPrompt />
              <VersionUpdateNotification />
            </ServiceWorkerProvider>
          </ThemeProvider>
        </LogRocketProvider>
      </body>
    </html>
  );
}

