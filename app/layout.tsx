import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "flockify: discographies",
    template: "%s | flockify: discographies",
  },
  description: "Like flockify, but with discographies.",
  icons: {
    icon: "/flockify-icon-only.png",
    apple: "/flockify-icon-only.png",
  },
  openGraph: {
    title: "flockify: discographies",
    description: "Like flockify, but with discographies.",
    siteName: "flockify: discographies",
    type: "website",
    images: [{ url: "/flockify-icon-only.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "flockify: discographies",
    description: "Like flockify, but with discographies.",
    images: ["/flockify-icon-only.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 overflow-x-hidden">{children}</body>
    </html>
  );
}
