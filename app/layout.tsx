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

export const metadata: Metadata = {
  title: {
    default: "Flockify 4.2.0",
    template: "%s | Flockify 4.2.0",
  },
  description: "Flockify in the robot era.",
  icons: {
    icon: "/flockify-icon-only.png",
    apple: "/flockify-icon-only.png",
  },
  openGraph: {
    title: "Flockify 4.2.0",
    description: "Flockify in the robot era.",
    siteName: "Flockify 4.2.0",
    type: "website",
    images: [{ url: "/flockify-icon-only.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flockify 4.2.0",
    description: "Flockify in the robot era.",
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 overflow-x-hidden">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
