import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { BASE_URL } from "../constants.js";
import { createErrorResponse } from "../helpers/createErrorResponse.js";
import { validateApiKey } from "../helpers/validateApiKey.js";
import type { IMCPTool } from "../types.js";

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
    "Get the user's broader professional profile（ポートフォリオ） on LAPRAS(https://lapras.com) - scores, skill tags, languages, and selected work (Selections). Call this early for a quick summary of their scores and highlighted work, useful as general background even outside career topics; for detailed work history or skill years use get_experiences / get_tech_skill instead.";

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
          text: JSON.stringify(data, null, 2),
        },
      ];

      return { content };
    } catch (error) {
      console.error(error);
      return createErrorResponse(error, "ポートフォリオ情報の取得に失敗しました");
    }
  }
}
