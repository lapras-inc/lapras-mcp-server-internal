import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getServerInstructions } from "../serverInstructions.js";

const TOOLS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "tools");

/**
 * LAPRAS_API_KEYを要求する（validateApiKeyを呼ぶ）読み取り系（get_*）ツールの
 * nameを、src/tools/*.ts から実際に走査して求める。手書きの一覧だと
 * ツール追加時に更新を忘れて漏れるため、ソースを都度読んで導出する。
 * 書き込み系（update系・create系・delete系）は案内文中で個別名ではなく
 * "counterparts"と総称しているため対象外とする。
 *
 * validateApiKeyを呼んでいるのにnameを抽出できないファイルは、想定している
 * `readonly name = "..."` という書き方から外れている（＝この関数がそのツールを
 * 静かに見落とし始めている）ことを意味するため、フォールバックで無視せず
 * エラーとして即座に気づけるようにする。
 */
function getApiKeyRequiredReadToolNames(): string[] {
  return readdirSync(TOOLS_DIR)
    .filter((file) => file.startsWith("get") && file.endsWith(".ts"))
    .flatMap((file) => {
      const source = readFileSync(join(TOOLS_DIR, file), "utf-8");
      if (!source.includes("validateApiKey")) return [];
      const nameMatch = source.match(/readonly name = "([^"]+)"/);
      if (!nameMatch) {
        throw new Error(
          `${file} calls validateApiKey but its tool name could not be extracted — update the regex in getApiKeyRequiredReadToolNames`,
        );
      }
      return [nameMatch[1]];
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
    expect(instructions).toContain("get_outputs");
    expect(instructions).not.toContain("do not call them");
  });

  /**
   * APIキー有り版とAPIキー無し版が互いの文言を取り違えずに出し分けられているかを
   * 検証する。有り版に実在する文字列であることを正側でも確認しておかないと、
   * 有り版の文面が変わってその文字列が消えたときに、否定側のアサーションは
   * 何もマッチしないまま常に成功し続け、検証として無意味になっても気づけない。
   */
  it("APIキーがない場合、プロフィール系ツールを呼ばないよう案内する文面を返す", () => {
    const withApiKeyInstructions = getServerInstructions(true);
    const instructions = getServerInstructions(false);
    expect(withApiKeyInstructions).toContain("WHEN TO READ THE PROFILE");
    expect(instructions).toContain("do not call them");
    expect(instructions).toContain("search_jobs");
    expect(instructions).not.toContain("WHEN TO READ THE PROFILE");
  });

  it("APIキーを要求する全ての読み取り系ツールが、APIキー未設定時の案内文に列挙されている", () => {
    const instructions = getServerInstructions(false);
    const apiKeyRequiredReadToolNames = getApiKeyRequiredReadToolNames();
    expect(apiKeyRequiredReadToolNames.length).toBeGreaterThan(0);
    for (const toolName of apiKeyRequiredReadToolNames) {
      expect(instructions).toContain(toolName);
    }
  });

  /**
   * instructionsをどこまで読み込むかにはクライアント側の上限がある。Claude Codeは
   * 2048文字で打ち切り、超過分は末尾から黙って捨てられる。この上限を超えて安全上の
   * 指示が失われる回帰を防ぐ。バイト数ではなく、クライアントが数える単位に合わせて
   * 文字数（String.length）で測る。
   */
  it("APIキー有無いずれの案内文も、クライアント側の2048文字上限に収まっている", () => {
    expect(getServerInstructions(true).length).toBeLessThanOrEqual(2048);
    expect(getServerInstructions(false).length).toBeLessThanOrEqual(2048);
  });

  /**
   * 2048文字を超えた分は末尾から切り捨てられるため、推測での書き込みを禁じる
   * 安全上の指示が末尾近くにあると、上限超過時にそこだけ失われる。指示文が
   * 存在すること自体に加え、出現位置が上限内であることまで確認する。
   */
  it("推測での書き込みを禁じる安全指示が、2048文字上限より前の位置にある", () => {
    const instructions = getServerInstructions(true);
    // 文面の折り返し位置が変わっただけでテストが落ちないよう、改行をまたがない語で探す
    const safetyPhrase = "inferred information";
    const index = instructions.indexOf(safetyPhrase);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(2048);
  });
});
