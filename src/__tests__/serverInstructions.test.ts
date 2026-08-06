import { describe, expect, it } from "vitest";
import { getServerInstructions } from "../serverInstructions.js";

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
});
