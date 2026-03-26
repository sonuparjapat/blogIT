import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/toast";

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
    default: "BlogHub - Modern Blogging Platform",
    template: "%s | BlogHub",
  },
  description: "A modern, SEO-optimized blogging platform for developers and creators. Share your stories with the world.",
  keywords: ["blog", "blogging", "developers", "creators", "writing", "articles", "tutorials"],
  authors: [{ name: "BlogHub Team" }],
  creator: "BlogHub",
  publisher: "BlogHub",
  metadataBase: new URL("https://bloghub.dev"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://bloghub.dev",
    siteName: "BlogHub",
    title: "BlogHub - Modern Blogging Platform",
    description: "A modern, SEO-optimized blogging platform for developers and creators.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BlogHub",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BlogHub - Modern Blogging Platform",
    description: "A modern, SEO-optimized blogging platform for developers and creators.",
    images: ["/og-image.png"],
    creator: "@bloghub",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-mesh`}
      >
            <ToastProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider></ToastProvider>
      </body>
    </html>
  );
}
