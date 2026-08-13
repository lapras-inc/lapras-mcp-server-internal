import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { BASE_URL } from "../constants.js";
import { createErrorResponse } from "../helpers/createErrorResponse.js";
import { validateApiKey } from "../helpers/validateApiKey.js";
import type { IMCPTool } from "../types.js";

/**
 * 今後のキャリアでやりたいこと取得ツール
 */
export class GetWantToDoTool implements IMCPTool {
  /**
   * Tool name
   */
  readonly name = "get_want_to_do";

  /**
   * Tool description
   */
  readonly description =
    "Get the career aspirations（今後のキャリアでやりたいこと） the user registered on LAPRAS(https://lapras.com). Call this early to know what the user actually wants to do next — grounds career-direction and job-search advice, and can also inform the angle you take on unrelated advice (e.g. someone aiming for management vs. staying hands-on technical).";

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
      const url = new URL(`${BASE_URL}/want_to_do`);
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
      return createErrorResponse(error, "今後のキャリアでやりたいことの取得に失敗しました");
    }
  }
}
