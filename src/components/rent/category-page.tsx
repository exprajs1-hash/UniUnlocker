import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categoryHref } from "@/components/rent/categories";
import { RentCatalog } from "@/components/rent/rent-catalog";
import { getServiceCategories } from "@/lib/data";

export async function categoryMetadata(slug: string): Promise<Metadata> {
  const category = (await getServiceCategories()).find((item) => item.slug === slug);
  if (!category) return { title: "Services" };
  return {
    title: category.name,
    description: category.description || `${category.name}: paid from your UniUnlocker balance, delivered fast.`,
    alternates: { canonical: categoryHref(slug) },
  };
}

/** The catalog page of one category (built-in or admin-made). An unknown or hidden category is a 404. */
export async function CategoryPage({ slug }: { slug: string }) {
  const categories = await getServiceCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      {/* The catalog renders the page header (h1). */}
      <RentCatalog category={category} categories={categories} />
    </div>
  );
}
