import { describe, expect, it } from "vitest";
import {
  buildDoneNextRow,
  formatRecentCommits,
  parseBacklog,
} from "./agent-sync.mjs";

describe("agent-sync", () => {
  it("parses backlog shipped and next", () => {
    const text = `## Shipped
- [x] Alpha (\`1111111\`)
- [x] Beta

## Next (priority)

1. **Export/import** — detail
2. **Steps** — more
`;
    const { shipped, next } = parseBacklog(text);
    expect(shipped).toEqual(["Alpha", "Beta"]);
    expect(next).toEqual(["Export/import", "Steps"]);
  });

  it("formats commits and skips meta sync lines", () => {
    const lines = formatRecentCommits([
      "abc1234|feat: QC screens",
      "def5678|docs: sync AGENTS commit log",
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("abc1234");
  });

  it("builds done vs next table row", () => {
    const row = buildDoneNextRow({
      shipped: ["a", "b", "c", "d", "e"],
      next: ["Export", "Steps"],
    });
    expect(row).toContain("b, c, d, e");
    expect(row).toContain("Export, Steps");
  });
});
