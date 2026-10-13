import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [new URL("https://*.public.blob.vercel-storage.com/**")],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85], // 85 só na foto principal do topo
    // 480: cards do carrossel no celular (evita baixar a versão de 640px)
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 480],
    minimumCacheTTL: 2678400, // 31 dias: fotos de produto mudam de URL quando trocadas
  },
  experimental: {
    // Upload de fotos no admin: o navegador já reduz a imagem antes de enviar (limite da Vercel é 4,5 MB)
    serverActions: { bodySizeLimit: "4mb" },
    // carrega só os ícones/funções usados dessas bibliotecas
    optimizePackageImports: ["lucide-react", "motion"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/img/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
