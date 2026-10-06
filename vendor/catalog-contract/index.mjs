import { z } from "zod";

const id = z.string().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens");
const money = z.number().int().nonnegative().max(100000000);
const url = z.string().refine(
  (value) => /^https:\/\/[^\s]+$/.test(value) || /^\/[^/\s][^\s]*$/.test(value),
  "Use HTTPS or a local /image path",
);
const image = z.object({ src: url, alt: z.string().min(1) });
const schedule = {
  active: z.boolean(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
};
const target = z.object({ type: z.enum(["store", "product", "category"]), ids: z.array(id) });
const discount = z.object({
  type: z.enum(["percentage", "fixed"]),
  value: z.number().int().positive().max(100000000),
  cap: money.optional(),
}).superRefine((value, context) => {
  if (value.type === "percentage" && value.value > 100) {
    context.addIssue({ code: "custom", message: "Percentage exceeds 100" });
  }
});
const promotion = z.object({ id, title: z.string().min(1), target, discount, ...schedule });

export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  revision: z.string().min(1),
  updatedAt: z.iso.datetime({ offset: true }),
  demo: z.boolean(),
  business: z.object({
    name: z.string().min(1),
    logo: image,
    secondaryLogo: image.optional(),
    description: z.string(),
    whatsapp: z.string().regex(/^$|^[1-9]\d{7,14}$/),
    email: z.union([z.literal(""), z.email()]),
    phone: z.string(),
    delivery: z.string(),
    currency: z.literal("INR"),
    locale: z.literal("en-IN"),
    timezone: z.literal("Asia/Kolkata"),
    socialLinks: z.array(z.object({ label: z.string(), url: z.url({ protocol: /^https$/ }) })),
    license: z.string().optional(),
  }),
  appearance: z.object({
    primary: z.string().regex(/^#[\da-fA-F]{6}$/),
    background: z.string().regex(/^#[\da-fA-F]{6}$/),
    accent: z.string().regex(/^#[\da-fA-F]{6}$/),
    font: z.enum(["serif", "sans-serif"]),
    radius: z.number().min(0).max(32),
    splash: z.boolean(),
  }),
  home: z.object({
    hero: z.object({ eyebrow: z.string(), title: z.string(), description: z.string(), image }),
    trendingIds: z.array(id),
    featuredCategoryIds: z.array(id),
    sections: z.object({ announcements: z.boolean(), trending: z.boolean(), categories: z.boolean() }),
  }),
  categories: z.array(z.object({
    id, slug: id, name: z.string().min(1), description: z.string(), image,
    order: z.number().int(), visible: z.boolean(),
  })),
  products: z.array(z.object({
    id, slug: id, name: z.string().min(1), description: z.string(), longDescription: z.string(),
    categoryIds: z.array(id), images: z.array(image).min(1), tags: z.array(z.string()), visible: z.boolean(),
    food: z.object({
      ingredients: z.array(z.string()).optional(), allergens: z.array(z.string()).optional(),
      dietaryLabels: z.array(z.string()).optional(), shelfLife: z.string().optional(), storage: z.string().optional(),
      nutrition: z.object({ basis: z.string(), values: z.record(z.string(), z.string()) }).optional(),
    }),
    variants: z.array(z.object({
      id, sku: z.string().min(1), label: z.string(), netQuantity: z.number().positive(),
      unit: z.enum(["g", "kg", "ml", "l"]), price: money, mrp: money.optional(), available: z.boolean(),
      minQuantity: z.number().int().positive().max(10000), step: z.number().int().positive().max(10000),
      maxQuantity: z.number().int().positive().max(10000),
    })).min(1),
  })),
  announcements: z.array(z.object({
    id, title: z.string(), description: z.string(), image,
    destination: z.string().regex(/^\/(?:products|category\/[a-z0-9-]+|product\/[a-z0-9-]+)?$/).optional(),
    ...schedule,
  })),
  offers: z.array(promotion),
  coupons: z.array(promotion.extend({
    code: z.string().regex(/^[A-Z0-9-]+$/), description: z.string(), minimumSubtotal: money,
  })),
}).superRefine((data, context) => {
  const issue = (message) => context.addIssue({ code: "custom", message });
  const unique = (values, label) => {
    if (new Set(values).size !== values.length) issue(`Duplicate ${label}`);
  };
  unique(data.categories.map((item) => item.id), "category ID");
  unique(data.categories.map((item) => item.slug), "category slug");
  unique(data.products.map((item) => item.id), "product ID");
  unique(data.products.map((item) => item.slug), "product slug");
  unique(data.products.flatMap((item) => item.variants.map((variant) => variant.id)), "variant ID");
  unique(data.products.flatMap((item) => item.variants.map((variant) => variant.sku)), "SKU");
  unique(data.coupons.map((item) => item.code), "coupon code");
  unique([...data.offers, ...data.coupons, ...data.announcements].map((item) => item.id), "promotion ID");

  const categoryIds = new Set(data.categories.map((item) => item.id));
  const productIds = new Set(data.products.map((item) => item.id));
  for (const product of data.products) {
    for (const categoryId of product.categoryIds) {
      if (!categoryIds.has(categoryId)) issue(`Unknown category ${categoryId}`);
    }
    for (const variant of product.variants) {
      if (variant.mrp !== undefined && variant.mrp < variant.price) issue(`MRP below price: ${variant.id}`);
      if (variant.maxQuantity < variant.minQuantity || (variant.maxQuantity - variant.minQuantity) % variant.step !== 0) {
        issue(`Invalid quantity limits: ${variant.id}`);
      }
    }
  }
  for (const item of [...data.offers, ...data.coupons, ...data.announcements]) {
    if (item.startsAt && item.endsAt && Date.parse(item.startsAt) >= Date.parse(item.endsAt)) issue(`Invalid schedule ${item.id}`);
  }
  for (const item of [...data.offers, ...data.coupons]) {
    if (item.target.type !== "store" && !item.target.ids.length) issue(`Empty target ${item.id}`);
    for (const reference of item.target.ids) {
      const collection = item.target.type === "product" ? productIds : categoryIds;
      if (!collection.has(reference)) issue(`Unknown target ${reference}`);
    }
  }
  for (const announcement of data.announcements) {
    if (announcement.destination?.startsWith("/product/") && !data.products.some((product) => `/product/${product.slug}` === announcement.destination)) {
      issue(`Unknown announcement product ${announcement.destination}`);
    }
    if (announcement.destination?.startsWith("/category/") && !data.categories.some((category) => `/category/${category.slug}` === announcement.destination)) {
      issue(`Unknown announcement category ${announcement.destination}`);
    }
  }
  for (const reference of data.home.trendingIds) if (!productIds.has(reference)) issue(`Unknown trending product ${reference}`);
  for (const reference of data.home.featuredCategoryIds) if (!categoryIds.has(reference)) issue(`Unknown featured category ${reference}`);
});

export function active(item, now = Date.now()) {
  return item.active && (!item.startsAt || Date.parse(item.startsAt) <= now) && (!item.endsAt || now < Date.parse(item.endsAt));
}

export function toPaise(rupees) {
  const value = Number(rupees);
  if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid rupee amount");
  return Math.round(value * 100);
}

export function fromPaise(paise) {
  return (paise / 100).toFixed(2);
}

export function slugify(value) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "item";
}
