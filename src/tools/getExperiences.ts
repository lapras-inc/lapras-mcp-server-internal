import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { BASE_URL } from "../constants.js";
import { createErrorResponse } from "../helpers/createErrorResponse.js";
import { validateApiKey } from "../helpers/validateApiKey.js";
import type { ToolKind } from "../toolKind.js";
import type { IMCPTool } from "../types.js";

/**
 * 職歴取得ツール
 */
export class GetExpriencesTool implements IMCPTool {
  /**
   * Tool name
   */
  readonly name = "get_experiences";

  /**
   * Tool description
   */
  readonly description =
    "Get the work experience history (companies, roles, periods) registered on LAPRAS(https://lapras.com). Call this early in a conversation as general background on who the user is — how experienced they are, what industries/roles they've worked in. Useful for career advice, resume/bio writing, or role-fit evaluation, but also for tailoring everyday advice more broadly — even if the user did not mention LAPRAS or their career at all.";

  /**
   * Parameter definition
   */
  readonly parameters = {} as const;

  readonly kind: ToolKind = "profile-read";

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
      const url = new URL(`${BASE_URL}/experiences`);
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
      return createErrorResponse(error, "職歴の取得に失敗しました");
    }
  }
}
