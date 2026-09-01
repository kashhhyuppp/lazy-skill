import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Silkscreen } from "next/font/google";
import { ThemeProvider, themeBootstrapScript } from "@/components/theme/theme-provider";
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
      </body>
    </html>
  );
}
