import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from "zod";
import { BASE_URL } from "../constants.js";
import { createErrorResponse } from "../helpers/createErrorResponse.js";
import { validateApiKey } from "../helpers/validateApiKey.js";
import type { IMCPTool, InferZodParams } from "../types.js";

const EXPERIENCE_YEARS_LABEL_MAP: Record<number, string> = {
  0: "1年未満",
  1: "1年以上2年未満",
  2: "2年以上3年未満",
  3: "3年以上5年未満",
  5: "5年以上10年未満",
  10: "10年以上",
};

const formatSkillYears = (yearsId: number): string => {
  return EXPERIENCE_YEARS_LABEL_MAP[yearsId] ?? "不明";
};

const TechSkillItemOutputSchema = z.object({
  tech_skill_id: z
    .number()
    .describe(
      "LAPRAS内部のスキルマスタのID。update_tech_skillはこのIDではなくtech_skill_name（スキル名）で指定する",
    ),
  tech_skill_name: z
    .string()
    .nullable()
    .describe("人間可読なスキル名（例: Python, TypeScript）。マスタに存在しないIDの場合はnull"),
  years_id: z
    .number()
    .describe(
      "経験年数バケットの下限年数を表す内部値（0,1,2,3,5,10）。update_tech_skillはこの値ではなく実年数（years）で指定する",
    ),
  years_label: z.string().describe("years_idを日本語ラベル化したもの（例: 3年以上5年未満）"),
});

const GetTechSkillOutputSchema = {
  error: z.boolean().describe("常にfalseを返す。エラー時はMCPプロトコルのisErrorで判別する"),
  updated_at: z.string().describe("ユーザーが最後にテックスキルを更新した日時（ISO8601）"),
  tech_skill_list: z
    .array(TechSkillItemOutputSchema)
    .describe("ユーザーが登録している技術スキル一覧"),
} as const;

/**
 * テックスキル取得ツール
 */
export class GetTechSkillTool
  implements IMCPTool<Record<string, never>, typeof GetTechSkillOutputSchema>
{
  /**
   * Tool name
   */
  readonly name = "get_tech_skill";

  /**
   * Tool description
   */
  readonly description =
    "Get current tech skills（経験技術・スキル・資格） on LAPRAS(https://lapras.com)";

  /**
   * Parameter definition
   */
  readonly parameters = {} as const;

  /**
   * 返り値の構造をフィールド単位で意味づけするスキーマ
   */
  readonly outputSchema = GetTechSkillOutputSchema;

  /**
   * Execute function
   */
  async execute(): Promise<{
    content: TextContent[];
    structuredContent?: InferZodParams<typeof GetTechSkillOutputSchema>;
    isError?: boolean;
  }> {
    const apiKeyResult = validateApiKey();
    if (apiKeyResult.isInvalid) return apiKeyResult.errorResopnse;

    try {
      const masterResponse = await fetch(new URL(`${BASE_URL}/tech_skill/master`), {
        method: "GET",
        headers: {
          accept: "application/json, text/plain, */*",
          Authorization: `Bearer ${apiKeyResult.apiKey}`,
        },
      });

      if (!masterResponse.ok) {
        throw new Error(`Failed to fetch tech skill master: ${masterResponse.status}`);
      }

      const masterData = (await masterResponse.json()) as {
        tech_skill_list: Array<{ id: number; name: string }>;
      };

      const masterMap = new Map(masterData.tech_skill_list.map((skill) => [skill.id, skill.name]));

      const url = new URL(`${BASE_URL}/tech_skill`);
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

      const data = (await response.json()) as {
        error: boolean;
        tech_skill_list: Array<{ tech_skill_id: number; years: number }>;
        updated_at: string;
      };

      const formatted = data.tech_skill_list.map((skill) => {
        const name = masterMap.get(skill.tech_skill_id);
        return {
          tech_skill_id: skill.tech_skill_id,
          tech_skill_name: name ?? null,
          years_id: skill.years,
          years_label: formatSkillYears(skill.years),
        };
      });

      const structuredContent = {
        error: data.error,
        updated_at: data.updated_at,
        tech_skill_list: formatted,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(structuredContent, null, 2),
          },
        ],
        structuredContent,
      };
    } catch (error) {
      console.error(error);
      return createErrorResponse(error, "テックスキルの取得に失敗しました");
    }
  }
}
