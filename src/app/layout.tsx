import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import QueryProvider from "@/providers/queryClientProvider";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Villeto",
  description: "Spend Management App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={figtree.variable}>
      <body suppressHydrationWarning className={`${figtree.className} antialiased bg-white min-h-svh font-sans`}>
        <QueryProvider>
          {children}
          <Toaster richColors expand />
        </QueryProvider>
      </body>
    </html>
  );
}
