import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geostarFill, robotoCondensed } from "@/app/fonts";
import { AppProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: "Loggy",
  description: "Log analysis for SOC workflows"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`min-h-screen ${robotoCondensed.variable} ${geostarFill.variable}`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
