import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { catalogSchema } from "../vendor/catalog-contract/index.mjs";

const root = new URL("../", import.meta.url);
const catalogPath = new URL("catalog.json", root);
const assetsPath = new URL("assets/", root);

const input = JSON.parse(await readFile(catalogPath, "utf8"));
const result = catalogSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n"));
  process.exit(1);
}

const imageSources = [
  result.data.business.logo,
  result.data.business.secondaryLogo,
  result.data.home.hero.image,
  ...result.data.categories.map((category) => category.image),
  ...result.data.products.flatMap((product) => product.images),
  ...result.data.announcements.map((announcement) => announcement.image),
].filter(Boolean);

const assetNames = new Set(await readdir(assetsPath));
for (const image of imageSources) {
  let parsed;
  try {
    parsed = new URL(image.src);
  } catch {
    console.error(`Invalid image URL: ${image.src}`);
    process.exit(1);
  }
  if (parsed.protocol !== "https:" || !parsed.pathname.includes("/assets/")) {
    console.error(`Published catalog images must be HTTPS Pages assets: ${image.src}`);
    process.exit(1);
  }
  const name = basename(parsed.pathname);
  if (!name || name !== parsed.pathname.split("/assets/").at(-1) || !(await exists(join(new URL(assetsPath).pathname, name)))) {
    console.error(`Missing committed asset for ${image.src}`);
    process.exit(1);
  }
  if (!assetNames.has(name)) {
    console.error(`Missing asset ${name}`);
    process.exit(1);
  }
}

const files = await readdir(assetsPath);
for (const file of files) {
  const info = await stat(new URL(file, assetsPath));
  if (!info.isFile()) console.error(`Ignoring non-file asset ${file}`);
}
console.log(`Valid catalog ${result.data.revision}: ${result.data.products.length} products, ${result.data.categories.length} categories, ${imageSources.length} images.`);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
