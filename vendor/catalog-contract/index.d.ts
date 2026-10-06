import type { z } from "zod";

export type CatalogImage = { src: string; alt: string };
export type Variant = {
  id: string; sku: string; label: string; netQuantity: number; unit: "g" | "kg" | "ml" | "l";
  price: number; mrp?: number; available: boolean; minQuantity: number; step: number; maxQuantity: number;
};
export type Product = {
  id: string; slug: string; name: string; description: string; longDescription: string; categoryIds: string[];
  images: CatalogImage[]; tags: string[]; visible: boolean;
  food: { ingredients?: string[]; allergens?: string[]; dietaryLabels?: string[]; shelfLife?: string; storage?: string; nutrition?: { basis: string; values: Record<string, string> } };
  variants: Variant[];
};
export type Category = { id: string; slug: string; name: string; description: string; image: CatalogImage; order: number; visible: boolean };
export type Promotion = {
  id: string; title: string; target: { type: "store" | "product" | "category"; ids: string[] };
  discount: { type: "percentage" | "fixed"; value: number; cap?: number };
  active: boolean; startsAt?: string; endsAt?: string;
};
export type Coupon = Promotion & { code: string; description: string; minimumSubtotal: number };
export type Catalog = {
  schemaVersion: 1; revision: string; updatedAt: string; demo: boolean;
  business: {
    name: string; logo: CatalogImage; secondaryLogo?: CatalogImage; description: string; whatsapp: string;
    email: string; phone: string; delivery: string; currency: "INR"; locale: "en-IN"; timezone: "Asia/Kolkata";
    socialLinks: { label: string; url: string }[]; license?: string;
  };
  appearance: { primary: string; background: string; accent: string; font: "serif" | "sans-serif"; radius: number; splash: boolean };
  home: {
    hero: { eyebrow: string; title: string; description: string; image: CatalogImage };
    trendingIds: string[]; featuredCategoryIds: string[];
    sections: { announcements: boolean; trending: boolean; categories: boolean };
  };
  categories: Category[]; products: Product[];
  announcements: { id: string; title: string; description: string; image: CatalogImage; destination?: string; active: boolean; startsAt?: string; endsAt?: string }[];
  offers: Promotion[]; coupons: Coupon[];
};

export declare const catalogSchema: z.ZodType<Catalog>;
export declare function active(item: { active: boolean; startsAt?: string; endsAt?: string }, now?: number): boolean;
export declare function toPaise(rupees: number | string): number;
export declare function fromPaise(paise: number): string;
export declare function slugify(value: string): string;
