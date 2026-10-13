import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://*.public.blob.vercel-storage.com/**")],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Upload de fotos no admin: o navegador já reduz a imagem antes de enviar (limite da Vercel é 4,5 MB)
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
