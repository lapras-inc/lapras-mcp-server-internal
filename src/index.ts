#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import { CreateExperienceTool } from "./tools/createExperience.js";
import { DeleteExperienceTool } from "./tools/deleteExperience.js";
import { GetExpriencesTool } from "./tools/getExperiences.js";
import { GetJobDetailTool } from "./tools/getJobDetail.js";
import { GetJobSummaryTool } from "./tools/getJobSummary.js";
import { GetOutputsTool } from "./tools/getOutputs.js";
import { GetPortfolioTool } from "./tools/getPortfolio.js";
import { GetTechSkillTool } from "./tools/getTechSkill.js";
import { GetWantToDoTool } from "./tools/getWantToDo.js";
import { SearchJobsTool } from "./tools/searchJobs.js";
import { UpdateExperienceTool } from "./tools/updateExperience.js";
import { UpdateJobSummaryTool } from "./tools/updateJobSummary.js";
import { UpdateTechSkillTool } from "./tools/updateTechSkill.js";
import { UpdateWantToDoTool } from "./tools/updateWantToDo.js";
import type { IMCPTool } from "./types.js";

export const ALL_TOOLS: IMCPTool<
  Record<string, z.ZodType>,
  Record<string, z.ZodType> | undefined
>[] = [
  new SearchJobsTool(), // 求人検索ツール
  new GetJobDetailTool(), // 求人詳細取得ツール
  new GetExpriencesTool(), // 職歴取得ツール
  new CreateExperienceTool(), // 職歴新規追加ツール
  new UpdateExperienceTool(), // 職歴更新ツール
  new DeleteExperienceTool(), // 職歴削除ツール
  new GetJobSummaryTool(), // 職務要約取得ツール
  new UpdateJobSummaryTool(), // 職務要約更新ツール
  new GetWantToDoTool(), // 今後のキャリアでやりたいこと取得ツール
  new UpdateWantToDoTool(), // 今後のキャリアでやりたいこと更新ツール
  new GetTechSkillTool(), // テックスキル取得ツール
  new UpdateTechSkillTool(), // テックスキル更新ツール
  new GetPortfolioTool(), // ポートフォリオ取得ツール
  new GetOutputsTool(), // アウトプット一覧取得ツール
];

const server = new McpServer(
  {
    name: "LAPRAS",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

/**
 * ALL_TOOLS はツールごとに異なる入出力スキーマを持つ IMCPTool の配列であるため、
 * server.registerTool の型引数（入力・出力それぞれのスキーマから導出される）を
 * 動的ループの中で解決しようとすると型のインスタンス化が発散する。
 * ここでは registerTool を緩い型で受け直し、ループ内の型解決を型消去で止める。
 * 実行時の型安全性は IMCPTool.execute 内の zod スキーマ検証で担保する。
 */
type LooseRegisterTool = (
  name: string,
  config: {
    description?: string;
    inputSchema?: Record<string, z.ZodType>;
    outputSchema?: Record<string, z.ZodType>;
  },
  cb: (
    args: Record<string, unknown>,
    extra: unknown,
  ) => Promise<{
    content: TextContent[];
    structuredContent?: unknown;
    isError?: boolean;
  }>,
) => unknown;

const registerTool = server.registerTool.bind(server) as LooseRegisterTool;

for (const tool of ALL_TOOLS) {
  registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.parameters,
      outputSchema: tool.outputSchema,
    },
    tool.execute.bind(tool),
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
