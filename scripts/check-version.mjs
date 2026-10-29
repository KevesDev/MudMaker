import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expected = readFileSync(resolve(root, "VERSION"), "utf8").trim();

const readers = {
  "app/package.json": (t) => JSON.parse(t).version,
  "app/src-tauri/tauri.conf.json": (t) => JSON.parse(t).version,
  "app/src-tauri/Cargo.toml": (t) => {
    const pkg = t.split(/^\[package\]\s*$/m)[1]?.split(/^\[/m)[0] ?? "";
    return /^version\s*=\s*"([^"]+)"/m.exec(pkg)?.[1];
  },
};

let failed = false;
for (const [file, read] of Object.entries(readers)) {
  let actual;
  try {
    actual = read(readFileSync(resolve(root, file), "utf8"));
  } catch (err) {
    actual = `unreadable (${err.message})`;
  }
  if (actual !== expected) {
    console.error(`${file}: version ${actual ?? "missing"} does not match VERSION ${expected}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`All versions match ${expected}`);
