const fs = require("fs");
const path = require("path");

const dirs = ["domain", "feature", "data", "types", "ui", "util"];

for (const dir of dirs) {
  const src = path.join(__dirname, dir, "files");
  const dest = path.join(__dirname, "dist", dir, "files");

  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}
