import type { TextContent, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

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
   * MCPクライアントへの実行時ヒント。読み取り専用ツールに readOnlyHint: true を
   * 立てると、確認ダイアログの摩擦が下がり、読み取り系ツール同士が並列実行されやすくなる。
   */
  readonly annotations?: ToolAnnotations;

  /**
   * MCP仕様のToolオブジェクトが許容する、クライアント拡張用の任意メタデータ領域。
   *
   * `"anthropic/alwaysLoad": true` はAnthropic製クライアント固有の拡張キー。
   * ツール数が多いセッションでは、各ツールのdescription本文はクライアントが検索を
   * 実行するまで読み込まれない（遅延ロードされる）ため、AIが「このツールを使うべきか」を
   * 判断する時点ではdescriptionがまだ存在しない。このキーを立てたツールは遅延ロードの
   * 対象から外れ、判断前にdescriptionが読める状態になる。`_meta`はMCP仕様が拡張用に
   * 開けている領域で、知らないキーはクライアントが無視するだけなので、この拡張に
   * 対応していないクライアントには影響しない。
   */
  readonly _meta?: Record<string, unknown>;

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
