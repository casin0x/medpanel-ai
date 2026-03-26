import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedPanel AI — Multi-Specialist Health Exploration",
  description:
    "Get multiple specialist perspectives on any health question. Grounded in PubMed evidence. Not medical advice.",
  metadataBase: new URL("https://medpanel.ai"),
  openGraph: {
    title: "MedPanel AI",
    description:
      "Multi-specialist AI health exploration. Get perspectives from cardiologists, nephrologists, and more.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
