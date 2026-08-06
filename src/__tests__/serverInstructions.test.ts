import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getServerInstructions } from "../serverInstructions.js";

const TOOLS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "tools");

/**
 * LAPRAS_API_KEYを要求する（validateApiKeyを呼ぶ）読み取り系（get_*）ツールの
 * nameを、src/tools/*.ts から実際に走査して求める。手書きの一覧だと
 * ツール追加時に更新を忘れて漏れる（get_outputsで実際に発生した）ため、
 * ソースを都度読んで導出する。書き込み系（update系・create系・delete系）は
 * 案内文中で個別名ではなく"counterparts"と総称しているため対象外とする。
 */
function getApiKeyRequiredReadToolNames(): string[] {
  return readdirSync(TOOLS_DIR)
    .filter((file) => file.startsWith("get") && file.endsWith(".ts"))
    .flatMap((file) => {
      const source = readFileSync(join(TOOLS_DIR, file), "utf-8");
      if (!source.includes("validateApiKey")) return [];
      const nameMatch = source.match(/readonly name = "([^"]+)"/);
      return nameMatch ? [nameMatch[1]] : [];
    });
}

describe("getServerInstructions", () => {
  it("APIキーがある場合、プロフィール系ツールを能動的に使うよう案内する文面を返す", () => {
    const instructions = getServerInstructions(true);
    expect(instructions).toContain("get_job_summary");
    expect(instructions).toContain("get_experiences");
    expect(instructions).toContain("get_tech_skill");
    expect(instructions).toContain("get_want_to_do");
    expect(instructions).toContain("get_portfolio");
    expect(instructions).not.toContain("do not call them");
  });

  it("APIキーがない場合、プロフィール系ツールを呼ばないよう案内する文面を返す", () => {
    const instructions = getServerInstructions(false);
    expect(instructions).toContain("do not call them");
    expect(instructions).toContain("search_jobs");
    expect(instructions).not.toContain("treat it like saved");
  });

  it("APIキーを要求する全ての読み取り系ツールが、APIキー未設定時の案内文に列挙されている", () => {
    const instructions = getServerInstructions(false);
    const apiKeyRequiredReadToolNames = getApiKeyRequiredReadToolNames();
    expect(apiKeyRequiredReadToolNames.length).toBeGreaterThan(0);
    for (const toolName of apiKeyRequiredReadToolNames) {
      expect(instructions).toContain(toolName);
    }
  });
});
