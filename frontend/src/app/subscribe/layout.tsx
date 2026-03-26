import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Premium Subscription – Unlock Exclusive Content",
  description:
    "Get unlimited access to premium articles, ad-free reading, and exclusive content.",
  openGraph: {
    title: "Upgrade to Premium 🚀",
    description: "Join premium members and unlock all exclusive content.",
    url: "https://yourdomain.com/subscribe",
    type: "website",
  },
};

export default function SubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}