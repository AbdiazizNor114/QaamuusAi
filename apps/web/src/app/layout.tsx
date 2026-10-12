import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "qaamuusAi | Somali language commons",
  description: "A community workspace for Somali vocabulary, translations and grammar.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
