import fs from "node:fs";
const required = [
  "shopify.app.toml.example", "shopify.web.toml.liquid", "vite.config.ts", "tsconfig.json", "prisma/schema.prisma",
  "app/routes.ts", "app/db.server.ts", "app/shopify.server.ts",
  "extensions/buyerorigin-discount-guard/src/cart_lines_discounts_generate_run.graphql",
  "extensions/buyerorigin-discount-guard/src/cart_lines_discounts_generate_run.js"
];
for (const file of required) if (!fs.existsSync(new URL(`../${file}`, import.meta.url))) throw new Error(`Missing Shopify app file: ${file}`);
const toml = fs.readFileSync(new URL("../shopify.app.toml.example", import.meta.url), "utf8");
for (const marker of ["read_orders", "write_discounts", "orders/create", "customers/redact", "shop/redact"]) if (!toml.includes(marker)) throw new Error(`Missing Shopify configuration marker: ${marker}`);
console.log("BuyerOrigin Shopify app structure verified");
