import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function writeJson(filePath: string, data: unknown) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
