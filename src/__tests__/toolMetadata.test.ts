import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALL_TOOLS } from "../toolRegistry.js";

const TOOLS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "tools");

/**
 * ファイル内の`readonly name = "..."`からツール名を抽出する。抽出できない
 * ファイルをフォールバックで無視すると、この関数がそのツールを静かに見落とし
 * 始めても気づけなくなるため、抽出失敗は即座にエラーにする。
 */
function extractToolName(source: string, file: string): string {
  const nameMatch = source.match(/readonly name = "([^"]+)"/);
  if (!nameMatch) {
    throw new Error(
      `${file} からツール名を抽出できませんでした — extractToolNameの正規表現を見直してください`,
    );
  }
  return nameMatch[1];
}

/**
 * プロフィール読み取り系（LAPRAS_API_KEYを要求するget_*）ツールのnameを、
 * src/tools/*.ts を走査して求める。手書きの一覧だとツール追加時の更新漏れが
 * 起きるため、serverInstructions.test.tsと同じ方針でソースから導出する。
 *
 * ファイル名が"get"始まりというだけでは求人検索系のget_job_detailまで
 * 含んでしまうため、validateApiKeyを呼んでいるかで絞り込む。この判定は
 * 「LAPRAS_API_KEYを要求する読み取り系ツールはvalidateApiKeyを呼ぶ」という
 * 実装上の慣習に依存しており、その慣習が崩れると検出できなくなる。
 */
function getProfileReadToolNames(): string[] {
  return readdirSync(TOOLS_DIR)
    .filter((file) => file.startsWith("get") && file.endsWith(".ts"))
    .flatMap((file) => {
      const source = readFileSync(join(TOOLS_DIR, file), "utf-8");
      if (!source.includes("validateApiKey")) return [];
      return [extractToolName(source, file)];
    });
}

/**
 * 書き込み系（update_ / create_ / delete_ で始まる名前の）ツールのnameを、
 * ファイル名の接頭辞から求める。この判定はファイル名の命名規則（update・
 * create・deleteのいずれかで始まる）に依存しており、命名規則から外れる
 * ファイルが追加されると検出できなくなる。
 */
function getWriteToolNames(): string[] {
  return readdirSync(TOOLS_DIR)
    .filter(
      (file) =>
        (file.startsWith("update") || file.startsWith("create") || file.startsWith("delete")) &&
        file.endsWith(".ts"),
    )
    .map((file) => extractToolName(readFileSync(join(TOOLS_DIR, file), "utf-8"), file));
}

function findToolByName(name: string) {
  const tool = ALL_TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`ALL_TOOLS に ${name} という名前のツールが見つかりません`);
  }
  return tool;
}

describe("tool metadata", () => {
  it("プロフィール読み取り系ツールは全て遅延ロード対象外(_meta)かつreadOnlyHintを持つ", () => {
    const names = getProfileReadToolNames();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const tool = findToolByName(name);
      expect(tool._meta?.["anthropic/alwaysLoad"]).toBe(true);
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it("書き込み系ツールにはanthropic/alwaysLoadが誤って設定されていない", () => {
    const names = getWriteToolNames();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const tool = findToolByName(name);
      expect(tool._meta?.["anthropic/alwaysLoad"]).not.toBe(true);
    }
  });
});
