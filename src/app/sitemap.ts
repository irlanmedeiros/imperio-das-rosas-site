import type { MetadataRoute } from "next";
import { getCatalogo } from "@/lib/data";

const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imperio-das-rosas.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { produtos } = await getCatalogo();
  return [
    { url: URL_SITE, changeFrequency: "weekly", priority: 1 },
    { url: `${URL_SITE}/catalogo`, changeFrequency: "daily", priority: 0.9 },
    ...produtos.map((p) => ({ url: `${URL_SITE}/produto/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
