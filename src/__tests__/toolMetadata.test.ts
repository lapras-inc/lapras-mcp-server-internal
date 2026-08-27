import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { type ToolKind, toolAnnotationsFor, toolMetaFor, toolRequiresApiKey } from "../toolKind.js";
import { ALL_TOOLS } from "../toolRegistry.js";

const TOOLS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "tools");

/**
 * ツール名と、そのツールを実装しているソースファイル名の対応。ALL_TOOLSの
 * kindはファイル名の命名規則に依存せず宣言されるため、宣言と実装（validateApiKey
 * の呼び出し有無）を突き合わせるにはファイルパスが要る。ここだけはファイル名との
 * 対応を明示的に手書きし、命名規則からの逆算はしない。
 */
const TOOL_SOURCE_FILES: Record<string, string> = {
  get_experiences: "getExperiences.ts",
  get_job_summary: "getJobSummary.ts",
  get_tech_skill: "getTechSkill.ts",
  get_want_to_do: "getWantToDo.ts",
  get_portfolio: "getPortfolio.ts",
  get_outputs: "getOutputs.ts",
  create_experience: "createExperience.ts",
  update_experience: "updateExperience.ts",
  delete_experience: "deleteExperience.ts",
  update_job_summary: "updateJobSummary.ts",
  update_tech_skill: "updateTechSkill.ts",
  update_want_to_do: "updateWantToDo.ts",
  search_jobs: "searchJobs.ts",
  get_job_detail: "getJobDetail.ts",
};

/**
 * ツール名と期待するkindの対応を明示的なリテラルとして持つ。ファイル名からの
 * 推論はしない — ツールが増えたときにこの一覧の更新漏れがあれば、下の
 * 網羅性テストが検出する。
 */
const EXPECTED_KIND: Record<string, ToolKind> = {
  get_experiences: "profile-read",
  get_job_summary: "profile-read",
  get_tech_skill: "profile-read",
  get_want_to_do: "profile-read",
  get_portfolio: "profile-read",
  get_outputs: "profile-read",
  create_experience: "profile-write",
  update_experience: "profile-write",
  delete_experience: "profile-write",
  update_job_summary: "profile-write",
  update_tech_skill: "profile-write",
  update_want_to_do: "profile-write",
  search_jobs: "job-search",
  get_job_detail: "job-search",
};

describe("tool kind assignment", () => {
  it("ALL_TOOLSの全ツールがEXPECTED_KINDに登場する（網羅性）", () => {
    const namesInAllTools = ALL_TOOLS.map((tool) => tool.name).sort();
    const namesInExpectedKind = Object.keys(EXPECTED_KIND).sort();
    expect(namesInAllTools).toEqual(namesInExpectedKind);
  });

  it("各ツールのkindが期待どおりに割り当てられている", () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.kind).toBe(EXPECTED_KIND[tool.name]);
    }
  });
});

describe("tool metadata derived from kind", () => {
  it("profile-readツールは、annotations.readOnlyHintとalwaysLoadの両方がtrueで導出される", () => {
    const tools = ALL_TOOLS.filter((tool) => tool.kind === "profile-read");
    expect(tools.length).toBe(6);
    for (const tool of tools) {
      expect(toolAnnotationsFor(tool.kind)).toEqual({ readOnlyHint: true });
      expect(toolMetaFor(tool.kind)).toEqual({ "anthropic/alwaysLoad": true });
    }
  });

  it("profile-writeツールは、annotationsもalwaysLoadも付かない(undefined)", () => {
    const tools = ALL_TOOLS.filter((tool) => tool.kind === "profile-write");
    expect(tools.length).toBe(6);
    for (const tool of tools) {
      expect(toolAnnotationsFor(tool.kind)).toBeUndefined();
      expect(toolMetaFor(tool.kind)).toBeUndefined();
    }
  });

  it("job-searchツールは、readOnlyHintは付くがalwaysLoadは付かない", () => {
    const tools = ALL_TOOLS.filter((tool) => tool.kind === "job-search");
    expect(tools.length).toBe(2);
    for (const tool of tools) {
      expect(toolAnnotationsFor(tool.kind)).toEqual({ readOnlyHint: true });
      expect(toolMetaFor(tool.kind)).toBeUndefined();
    }
  });
});

/**
 * requiresApiKeyは宣言しただけでは何も駆動しないため、宣言（toolKind.ts）と
 * 実装（各ツールが実際にvalidateApiKeyを呼んでいるか）が食い違っていないかを
 * ソースを読んで検査する。「呼んでいるかどうか」は文字列一致で判定しており、
 * validateApiKeyという名前を変えずに別の実装へ置き換えると検出できなくなる。
 */
describe("kind の requiresApiKey とツール実装の整合性", () => {
  it("ALL_TOOLSの全ツールがTOOL_SOURCE_FILESに登場する（網羅性）", () => {
    const namesInAllTools = ALL_TOOLS.map((tool) => tool.name).sort();
    const namesWithSourceFile = Object.keys(TOOL_SOURCE_FILES).sort();
    expect(namesInAllTools).toEqual(namesWithSourceFile);
  });

  it("requiresApiKeyがtrueの種別を持つツールは、実装がvalidateApiKeyを呼んでいる", () => {
    const tools = ALL_TOOLS.filter((tool) => toolRequiresApiKey(tool.kind));
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      const source = readFileSync(join(TOOLS_DIR, TOOL_SOURCE_FILES[tool.name]), "utf-8");
      expect(source).toContain("validateApiKey");
    }
  });

  it("requiresApiKeyがfalseの種別を持つツールは、実装がvalidateApiKeyを呼んでいない", () => {
    const tools = ALL_TOOLS.filter((tool) => !toolRequiresApiKey(tool.kind));
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      const source = readFileSync(join(TOOLS_DIR, TOOL_SOURCE_FILES[tool.name]), "utf-8");
      expect(source).not.toContain("validateApiKey");
    }
  });
});
