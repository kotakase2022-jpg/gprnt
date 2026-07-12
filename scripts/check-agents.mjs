import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

const [agents, claude] = await Promise.all([
  readFile(new URL("../AGENTS.md", import.meta.url)),
  readFile(new URL("../CLAUDE.md", import.meta.url)),
]);

if (!agents.equals(claude)) {
  const digest = (value) =>
    createHash("sha256").update(value).digest("hex").slice(0, 12);

  console.error(
    `AGENTS.md and CLAUDE.md differ (AGENTS ${digest(agents)}, CLAUDE ${digest(claude)}).`,
  );
  process.exitCode = 1;
} else {
  console.log("AGENTS.md and CLAUDE.md are byte-identical.");
}
