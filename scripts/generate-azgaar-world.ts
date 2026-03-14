import {generateAzgaarWorld, toSerializableAzgaarWorld} from "../src/engine/azgaar/index.js";
import {writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";

const seed = process.argv[2] || "575079333";
const output = process.argv[3] || "generated/azgaar-world.json";

const world = toSerializableAzgaarWorld(await generateAzgaarWorld({seed}));
const outputPath = path.resolve(process.cwd(), output);
mkdirSync(path.dirname(outputPath), {recursive: true});
writeFileSync(outputPath, `${JSON.stringify(world, null, 2)}\n`, "utf8");
console.log(`World written to ${outputPath}`);
