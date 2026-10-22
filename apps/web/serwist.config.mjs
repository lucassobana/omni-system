// @ts-check
import { spawnSync } from "node:child_process";
import { serwist } from "@serwist/next/config";

// Use the current git commit hash as revision for cache busting.
// Falls back to a random UUID if git is unavailable.
const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

export default serwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Explicitly precache the root route with a revision for cache invalidation.
  additionalPrecacheEntries: [{ url: "/", revision }],
});
