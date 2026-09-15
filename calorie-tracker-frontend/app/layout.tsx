import type { Metadata } from "next";
import { AppAuthProvider } from "@/components/AuthProvider";
import { TopNav } from "@/components/layout/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriMetric",
  description: "Enterprise nutrition tracking with AI-assisted logging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <AppAuthProvider>
          <div className="flex min-h-screen flex-col">
            <TopNav />
            <main className="flex-1">{children}</main>
          </div>
        </AppAuthProvider>
      </body>
    </html>
  );
}
