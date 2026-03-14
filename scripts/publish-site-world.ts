import fs from "node:fs";
import path from "node:path";

const source = path.resolve(process.cwd(), "generated/world-context.json");
const target = path.resolve(process.cwd(), "ProjectZeus.github.io/worlds/world-context.json");

if (!fs.existsSync(source)) {
  throw new Error(`Missing source artifact: ${source}`);
}

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.copyFileSync(source, target);
console.log(`Published sample world to ${target}`);
