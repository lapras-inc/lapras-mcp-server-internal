import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { BASE_URL } from "../constants.js";
import { createErrorResponse } from "../helpers/createErrorResponse.js";
import { validateApiKey } from "../helpers/validateApiKey.js";
import type { IMCPTool } from "../types.js";

/**
 * market_value_score.category_skill_evidences はスキルタグ1件につき出現元
 * （経験・アウトプット等）ごとに1エントリが積み上がる内訳データで、同一
 * skill_text の重複が大半を占める（実測で1912件中1532件が重複）。
 * ポートフォリオ概要としては skill_tags で代替できるため、レスポンスの
 * 大半（実測373KB中217KB）を占めるこのフィールドは応答から取り除く。
 */
const omitCategorySkillEvidences = (data: unknown): unknown => {
  if (typeof data !== "object" || data === null) return data;
  const record = data as Record<string, unknown>;
  const marketValueScore = record.market_value_score;
  if (typeof marketValueScore !== "object" || marketValueScore === null) {
    return data;
  }
  const { category_skill_evidences, ...marketValueScoreRest } = marketValueScore as Record<
    string,
    unknown
  >;
  // record を丸ごと spread した後に既存キーの値だけ上書きするため、
  // JSON.stringify のキー順（元レスポンスの並び）を変えない。
  return { ...record, market_value_score: marketValueScoreRest };
};

/**
 * ポートフォリオ取得ツール
 */
export class GetPortfolioTool implements IMCPTool {
  /**
   * Tool name
   */
  readonly name = "get_portfolio";

  /**
   * Tool description
   */
  readonly description =
    "Get portfolio（ポートフォリオ） on LAPRAS(https://lapras.com) - profile, e_score, market value score, skill tags, languages, and selections. market_value_score.category_skill_evidences (per-skill evidence breakdown) is omitted to keep the response compact. For work experiences or tech skills, use get_experiences / get_tech_skill instead.";

  /**
   * Parameter definition
   */
  readonly parameters = {} as const;

  /**
   * Execute function
   */
  async execute(): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    const apiKeyResult = validateApiKey();
    if (apiKeyResult.isInvalid) return apiKeyResult.errorResopnse;

    try {
      const url = new URL(`${BASE_URL}/portfolio`);
      const response = await fetch(url, {
        headers: {
          accept: "application/json, text/plain, */*",
          Authorization: `Bearer ${apiKeyResult.apiKey}`,
        },
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const data = await response.json();

      const content: TextContent[] = [
        {
          type: "text",
          text: JSON.stringify(omitCategorySkillEvidences(data), null, 2),
        },
      ];

      return { content };
    } catch (error) {
      console.error(error);
      return createErrorResponse(error, "ポートフォリオ情報の取得に失敗しました");
    }
  }
}
