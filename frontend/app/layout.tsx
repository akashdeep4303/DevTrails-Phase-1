import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import DPDPBanner from "@/components/DPDPBanner";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VIGIL — Gig Insurance Legitimacy",
  description: "Parametric micro-insurance for gig workers. Instant weather payouts, behavioral trust.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${space.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <DPDPBanner />
      </body>
    </html>
  );
}
