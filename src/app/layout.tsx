import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from "next/headers";
import QueryProvider from "@/providers/queryClientProvider";

const geistSans = Figtree({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Villeto",
  description: "Spend Management App",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("auth-storage")?.value;
  let initialUser = null;

  if (cookie) {
    try {
      const parsed = JSON.parse(cookie);
      initialUser = parsed?.state?.user ?? null;
    } catch {}
  }
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${geistSans.variable} antialiased bg-white min-h-svh`}>
        <QueryProvider>
          {children}
          <Toaster richColors expand />
        </QueryProvider>
      </body>
    </html>
  );
}
