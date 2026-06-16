import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { CometChatProvider } from "@/components/providers/CometChatProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matrix — Hackathon Command Platform",
  description: "Production-grade hackathon infrastructure. Real-time mentor routing, RBAC, and team management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <CometChatProvider>
          <Navbar />
          <main className="flex-grow">{children}</main>
        </CometChatProvider>
      </body>
    </html>
  );
}
