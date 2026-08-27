/**
 * ツール定義の一覧をサーバー起動処理から独立させておく。index.tsは import される
 * だけでStdioServerTransportに接続し、プロセスのstdin/stdoutをサーバー通信路として
 * 掴んでしまう。ツール一覧をテストがindex.tsから直接importすると、テスト実行のたびに
 * 意図せずサーバーが起動し、テスト出力の汚染・並列実行時の競合・環境によってはハングの
 * 原因になる。ツール定義だけをここに置くことで、テストは接続処理に触れずに済む。
 */

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
