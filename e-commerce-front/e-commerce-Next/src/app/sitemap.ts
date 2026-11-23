import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3007/v1";

  const now = new Date();

  // 1. Static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/subcategories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // 2. Dynamic active product routes
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiUrl}/products?limit=200`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const products = json?.data?.products || json?.data || [];
      if (Array.isArray(products)) {
        productRoutes = products
          .filter((p: any) => p && p._id)
          .map((p: any) => ({
            url: `${siteUrl}/products/${p._id}`,
            lastModified: p.updatedAt
              ? new Date(p.updatedAt)
              : p.createdAt
              ? new Date(p.createdAt)
              : now,
            changeFrequency: "daily" as const,
            priority: 0.8,
          }));
      }
    }
  } catch {
    // Graceful fallback to static routes if API is not running during build
  }

  // 3. Dynamic category routes
  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiUrl}/category`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const json = await res.json();
      const categories = json?.data || [];
      if (Array.isArray(categories)) {
        categoryRoutes = categories
          .filter((c: any) => c && c._id)
          .map((c: any) => ({
            url: `${siteUrl}/categories/${c._id}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          }));
      }
    }
  } catch {
    // Graceful fallback to static routes if API is not running during build
  }

  // 4. Dynamic subcategory routes
  let subcategoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${apiUrl}/subcategory`, {
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const json = await res.json();
      const subcategories = json?.data || [];
      if (Array.isArray(subcategories)) {
        subcategoryRoutes = subcategories
          .filter((s: any) => s && (s._id || s.id))
          .map((s: any) => ({
            url: `${siteUrl}/subcategories/${s._id || s.id}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          }));
      }
    }
  } catch {
    // Graceful fallback to static routes if API is not running during build
  }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...subcategoryRoutes];
}

