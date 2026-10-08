import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Nav from "../components/Nav";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Catapult Control",
  description: "Catapult settings predictor and trial log for the Six Sigma competition",
};

export const viewport: Viewport = { themeColor: "#07090d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <Nav />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
