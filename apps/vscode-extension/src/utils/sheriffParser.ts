import * as fs from "fs";
import * as path from "path";

export interface SheriffRules {
  [tag: string]: string[];
}

export function parseSheriffConfig(filePath: string): { rules: SheriffRules; fullContent: string } {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Sheriff config not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const depRulesStartIndex = content.indexOf("depRules: {");
  if (depRulesStartIndex === -1) {
    throw new Error("Could not find 'depRules' configuration in sheriff.config.ts");
  }

  // Extract the depRules block by counting braces
  let openBraces = 0;
  let blockEndIndex = -1;
  for (let i = depRulesStartIndex; i < content.length; i++) {
    if (content[i] === "{") {
      openBraces++;
    } else if (content[i] === "}") {
      openBraces--;
      if (openBraces === 0) {
        blockEndIndex = i;
        break;
      }
    }
  }

  if (blockEndIndex === -1) {
    throw new Error("Mismatched braces in sheriff.config.ts 'depRules'");
  }

  const depRulesBlock = content.substring(depRulesStartIndex, blockEndIndex + 1);
  const rules: SheriffRules = {};

  // Regex to extract key and array content
  // Example matches:
  // "domain:*": [sameTag, "domain:shared"],
  // root: ["*"],
  const entryRegex = /\s*['"]?([^'":\s]+)['"]?\s*:\s*\[([^\]]*)\]/g;
  let match;
  while ((match = entryRegex.exec(depRulesBlock)) !== null) {
    const key = match[1];
    const rawDeps = match[2];
    const deps = rawDeps
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d.length > 0)
      .map((d) => {
        if ((d.startsWith('"') && d.endsWith('"')) || (d.startsWith("'") && d.endsWith("'"))) {
          return d.slice(1, -1);
        }
        return d; // sameTag or unquoted variables
      });
    rules[key] = deps;
  }

  return { rules, fullContent: content };
}

export function writeSheriffConfig(
  filePath: string,
  rules: SheriffRules,
  originalContent: string
): void {
  const depRulesStartIndex = originalContent.indexOf("depRules: {");
  if (depRulesStartIndex === -1) {
    throw new Error("Could not find 'depRules' configuration in original sheriff.config.ts");
  }

  let openBraces = 0;
  let blockEndIndex = -1;
  for (let i = depRulesStartIndex; i < originalContent.length; i++) {
    if (originalContent[i] === "{") {
      openBraces++;
    } else if (originalContent[i] === "}") {
      openBraces--;
      if (openBraces === 0) {
        blockEndIndex = i;
        break;
      }
    }
  }

  if (blockEndIndex === -1) {
    throw new Error("Mismatched braces in sheriff.config.ts 'depRules'");
  }

  // Construct new depRules block
  const lines = Object.entries(rules).map(([tag, deps]) => {
    const formattedDeps = deps
      .map((dep) => (dep === "sameTag" ? "sameTag" : `"${dep}"`))
      .join(", ");
    const formattedKey = tag.includes("*") || tag.includes(":") ? `"${tag}"` : tag;
    return `    ${formattedKey}: [${formattedDeps}]`;
  });

  const newBlock = `depRules: {\n${lines.join(",\n")}\n  }`;

  const updatedContent =
    originalContent.substring(0, depRulesStartIndex) +
    newBlock +
    originalContent.substring(blockEndIndex + 1);

  fs.writeFileSync(filePath, updatedContent, "utf-8");
}
