import type { Metadata } from "next";
import "./globals.css";

const siteName = "Kritarch Lite";
const siteTitle = "Kritarch Lite - AI Jury";
const siteDescription =
  "Watch AI models debate, critique, and reach consensus to reduce hallucinations.";
const baseUrl = process.env.SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "multi-agent",
    "AI debate",
    "LLM jury",
    "hallucination reduction",
    "OpenAI Agents SDK",
    "kritarch",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: baseUrl,
    title: siteTitle,
    description: siteDescription,
    siteName,
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
