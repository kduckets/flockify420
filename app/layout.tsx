import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Flockify 4.2.0",
    template: "%s | Flockify 4.2.0",
  },
  description: "Flockify in the robot era.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Flockify 4.2.0",
    description: "Flockify in the robot era.",
    siteName: "Flockify 4.2.0",
    type: "website",
    images: [{ url: "/favicon.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flockify 4.2.0",
    description: "Flockify in the robot era.",
    images: ["/favicon.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-clip`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 overflow-x-clip">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
