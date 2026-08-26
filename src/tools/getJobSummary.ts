import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { BASE_URL } from "../constants.js";
import { createErrorResponse } from "../helpers/createErrorResponse.js";
import { validateApiKey } from "../helpers/validateApiKey.js";
import type { IMCPTool } from "../types.js";

/**
 * 職務要約取得ツール
 */
export class GetJobSummaryTool implements IMCPTool {
  /**
   * Tool name
   */
  readonly name = "get_job_summary";

  /**
   * Tool description
   */
  readonly description =
    "Get the professional summary（職務要約） the user wrote about themselves on LAPRAS(https://lapras.com). Call this early for a quick, one-paragraph picture of who the user is professionally, in their own words — this context can inform how you communicate with them even outside career topics.";

  /**
   * Parameter definition
   */
  readonly parameters = {} as const;

  readonly _meta = { "anthropic/alwaysLoad": true };

  readonly annotations = { readOnlyHint: true };

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
      const url = new URL(`${BASE_URL}/job_summary`);
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
      return createErrorResponse(error, "職務要約の取得に失敗しました");
    }
  }
}
