import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { ToolKind } from "./toolKind.js";

/**
 * Zodスキーマから型を抽出するユーティリティ型
 */
export type InferZodParams<T extends Record<string, z.ZodType>> = {
  [K in keyof T]: z.infer<T[K]>;
};

export interface IMCPTool<
  TParams extends Record<string, z.ZodType> = Record<string, z.ZodType>,
  TOutput extends Record<string, z.ZodType> | undefined = undefined,
> {
  /**
   * ツール名
   */
  readonly name: string;

  /**
   * ツールの説明
   */
  readonly description: string;

  /**
   * パラメータの定義
   */
  readonly parameters: TParams;

  /**
   * 返り値の構造をフィールド単位で意味づけするスキーマ。
   * 定義したツールは structuredContent での応答が必須になる（MCP SDKが実行時に検証する）。
   */
  readonly outputSchema?: TOutput;

  /**
   * ツールの種別。MCPクライアントへ渡す annotations（readOnlyHint等）と
   * _meta（"anthropic/alwaysLoad"等）は、この値から toolKind.ts の宣言表を
   * 通じて一意に導出される。ツール側で annotations / _meta を個別に指定する
   * 手段は無いため、正しい種別を選ぶことだけがクライアントへの申告内容を決める。
   * 種別ごとの詳細は toolKind.ts を参照。
   */
  readonly kind: ToolKind;

  /**
   * ツールを実行する
   * @param args パラメータ
   * @returns 実行結果
   */
  execute(args: InferZodParams<TParams>): Promise<{
    content: TextContent[];
    structuredContent?: TOutput extends Record<string, z.ZodType> ? InferZodParams<TOutput> : never;
    isError?: boolean;
  }>;
}
