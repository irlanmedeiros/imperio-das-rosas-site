import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const titulo = Playfair_Display({ subsets: ["latin"], variable: "--font-title", display: "swap" });
const corpo = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imperio-das-rosas.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: { default: "Império das Rosas · Floricultura em João Pessoa", template: "%s · Império das Rosas" },
  description:
    "Buquês, ramalhetes, box e presentes com entrega no mesmo dia em João Pessoa. Escolha no site e finalize seu pedido pelo WhatsApp.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Império das Rosas",
    images: [{ url: "/img/hero.jpg", width: 1672, height: 941 }],
  },
};

export const viewport: Viewport = { themeColor: "#2c3826" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${corpo.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
