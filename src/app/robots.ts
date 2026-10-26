import type { MetadataRoute } from "next";

const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imperiodasrosas.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/checkout", "/pedido"] },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}
