import type { Metadata } from "next";
import "./globals.css";
import "./platform.css";
import { AssistantChat } from "@/components/assistant-chat";
export const metadata: Metadata = {
  title: "qaamuusAi | Somali language commons",
  description: "A community workspace for Somali vocabulary, translations and grammar.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <AssistantChat />
      </body>
    </html>
  );
}
