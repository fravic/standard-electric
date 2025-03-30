/**
 * This script copies game assets from an external private repository into the public assets folder.
 * We use this approach instead of git submodules to keep game assets private and separate from the codebase.
 * The public/assets directory is git-ignored to prevent game assets from being committed.
 */
import fs from "fs-extra";
import path from "path";

const src = path.resolve("..", "standard-electric-assets", "public");
const dest = path.resolve("public", "assets");

// Ensure destination directory exists
fs.ensureDirSync(path.dirname(dest));

// Copy assets from source to destination
fs.copy(src, dest, { overwrite: true })
  .then(() => console.log("✅ Assets synced successfully from", src, "to", dest))
  .catch((err) => {
    console.error("❌ Failed to sync assets:", err);
    console.error("Are you sure the ../standard-electric-assets repo is present?");
  });
