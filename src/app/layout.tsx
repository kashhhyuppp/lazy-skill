import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Silkscreen } from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@/components/theme/theme-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const pixel = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Lazy Skill — See it. Search it. Install it.",
    template: "%s · Lazy Skill",
  },
  description:
    "Found an AI skill while scrolling? Stop hunting for it. Search it on Lazy Skill and install it straight to your AI workspace.",
  applicationName: "Lazy Skill",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    // iOS ignores the manifest's display mode and uses these instead.
    capable: true,
    title: "Lazy Skill",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    // Stops iOS turning version numbers and ids in skill descriptions into
    // tappable phone links.
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Lazy Skill",
    title: "Lazy Skill — See it. Search it. Install it.",
    description:
      "Found an AI skill while scrolling? Stop hunting for it. Search it and install it.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Lazy Skill — See it. Search it. Install it.",
    description: "Found an AI skill while scrolling? Stop hunting for it.",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
  // Lets the app paint under the notch and home indicator in standalone mode;
  // the layout already pads for the safe area.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${inter.variable} ${mono.variable} ${pixel.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
