import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIMBAKES - Beasiswa Tematik Bidang Kesehatan",
  description: "Sistem Informasi Beasiswa Tematik Bidang Kesehatan - Platform pengelolaan beasiswa kesehatan terintegrasi",
  keywords: ["SIMBAKES", "Beasiswa", "Kesehatan", "Pendidikan", "Indonesia"],
  authors: [{ name: "SIMBAKES Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "SIMBAKES - Beasiswa Tematik Bidang Kesehatan",
    description: "Platform pengelolaan beasiswa bidang kesehatan terintegrasi",
    siteName: "SIMBAKES",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
