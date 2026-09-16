import type { Metadata, Viewport } from "next";
import { GAME_NAME, GAME_TAGLINE } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = { title: GAME_NAME, description: GAME_TAGLINE };
export const viewport: Viewport = { themeColor: "#0B1B34" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&family=Figtree:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
