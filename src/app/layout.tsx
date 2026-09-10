import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SPACE ARCHER — Стрелковая аркада",
  description: "Неоновая космическая стрелковая аркада. Управляй луком, уничтожай врагов!",
  authors: [{ name: "poehali.dev" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "SPACE ARCHER",
    description: "Неоновая космическая стрелковая аркада. Управляй луком, уничтожай врагов!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${rajdhani.variable} antialiased`}
        style={{ background: "#070a0f", overflow: "hidden" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
