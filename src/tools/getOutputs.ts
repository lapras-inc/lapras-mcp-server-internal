import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from "zod";
import { BASE_URL } from "../constants.js";
import { createErrorResponse } from "../helpers/createErrorResponse.js";
import { validateApiKey } from "../helpers/validateApiKey.js";
import type { IMCPTool } from "../types.js";

const parameters = {
  type: z
    .enum(["github", "article", "event", "speakerdeck", "teratail"])
    .optional()
    .describe("Output type to filter by. If omitted, outputs of all types are returned"),
  page: z.number().optional().describe("Page number for pagination (1-based, default: 1)"),
  per_page: z.number().optional().describe("Number of items per page (default: 20, max: 100)"),
} as const;

/**
 * MCP SDKが`z.object(parameters)`のparse結果をexecuteに渡すため、
 * 未指定のoptionalパラメータはキー自体が存在しないオブジェクトになる。その形をそのまま型にする。
 *
 * `types.ts`の`InferZodParams`は`.optional()`スキーマでもキーを必須として推論するため、
 * `execute({})`のような呼び出しがキャスト無しでは書けない（既存テストの`as any`はこれが理由）。
 * ここではzodのオブジェクト推論から導出することで、テストがSDKの渡す実際の形をそのまま使えるようにしている。
 */
type GetOutputsArgs = z.infer<z.ZodObject<typeof parameters>>;

/**
 * アウトプット一覧取得ツール
 */
export class GetOutputsTool implements IMCPTool {
  /**
   * Tool name
   */
  readonly name = "get_outputs";

  /**
   * Tool description
   */
  readonly description =
    "Get outputs（アウトプット一覧） on LAPRAS(https://lapras.com) - GitHub repositories, tech articles, event attendances, SpeakerDeck slides, and teratail replies, sorted by date in descending order with pagination";

  /**
   * Parameter definition
   */
  readonly parameters = parameters;

  /**
   * Execute function
   */
  async execute(args: GetOutputsArgs): Promise<{
    content: TextContent[];
    isError?: boolean;
  }> {
    const apiKeyResult = validateApiKey();
    if (apiKeyResult.isInvalid) return apiKeyResult.errorResopnse;

    const { type, page, per_page } = args;

    const url = new URL(`${BASE_URL}/outputs`);

    if (type) {
      url.searchParams.append("type", type);
    }

    if (page) {
      url.searchParams.append("page", page.toString());
    }

    if (per_page) {
      url.searchParams.append("per_page", per_page.toString());
    }

    try {
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
      return createErrorResponse(error, "アウトプット一覧の取得に失敗しました");
    }
  }
}
