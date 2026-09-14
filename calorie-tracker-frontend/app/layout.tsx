import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppAuthProvider } from "@/components/AuthProvider";
import { TopNav } from "@/components/layout/TopNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calorie Tracker",
  description: "Enterprise nutrition tracking with AI-assisted logging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-canvas font-sans text-ink antialiased`}>
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
