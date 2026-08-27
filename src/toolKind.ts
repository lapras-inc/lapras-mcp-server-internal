import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

/**
 * このMCPサーバーが持つツールは、実際には3種類（プロフィール読み取り・
 * プロフィール書き込み・求人検索）に分かれ、種別が決まればクライアントへ
 * 宣言するメタデータ（annotations / _meta）は一意に決まる。各ツールが
 * annotations や _meta を個別に指定できる設計だと、同じ種別なのに値が
 * ずれる・付け忘れるといった不整合が型では防げなくなる。ツールは種別を
 * 1つ宣言するだけにし、クライアントへ渡すメタデータはこのファイルの
 * 宣言表から導出する。
 */
export type ToolKind = "profile-read" | "profile-write" | "job-search";

interface ToolKindTraits {
  /**
   * LAPRAS_API_KEYが無いと実行できないか。
   */
  readonly requiresApiKey: boolean;

  /**
   * クライアントへ annotations.readOnlyHint として宣言するか。
   */
  readonly readOnly: boolean;

  /**
   * `"anthropic/alwaysLoad": true`（_meta経由でクライアントへ渡す）を立てるか。
   *
   * このキーはAnthropic製クライアント固有の拡張キー。ツール数が多いセッションでは、
   * 各ツールのdescription本文はクライアントが検索を実行するまで読み込まれない
   * （遅延ロードされる）ため、AIが「このツールを使うべきか」を判断する時点では
   * descriptionがまだ存在しない。このキーを立てたツールは遅延ロードの対象から外れ、
   * 判断前にdescriptionが読める状態になる。`_meta`はMCP仕様が拡張用に開けている
   * 領域で、知らないキーはクライアントが無視するだけなので、この拡張に対応して
   * いないクライアントには影響しない。
   */
  readonly alwaysLoad: boolean;
}

/**
 * `satisfies Record<ToolKind, ToolKindTraits>` により、ToolKindに種別を
 * 追加したときは必ずここへ宣言を書き足さないと型エラーになる。
 */
const TOOL_KIND_TRAITS = {
  "profile-read": { requiresApiKey: true, readOnly: true, alwaysLoad: true },
  "profile-write": { requiresApiKey: true, readOnly: false, alwaysLoad: false },
  "job-search": { requiresApiKey: false, readOnly: true, alwaysLoad: false },
} as const satisfies Record<ToolKind, ToolKindTraits>;

/**
 * 種別がLAPRAS_API_KEYを要求するかどうかを返す。テストが「宣言と実装の
 * 突き合わせ」（validateApiKeyの呼び出し有無との一致）を検証する際に使う。
 */
export function toolRequiresApiKey(kind: ToolKind): boolean {
  return TOOL_KIND_TRAITS[kind].requiresApiKey;
}

/**
 * server.registerToolへ渡すannotationsを種別から組み立てる。
 * readOnlyがfalseの種別では、readOnlyHint: falseを明示的に送るのではなく
 * annotations自体をundefinedにする（クライアントへの申告を「不明」のまま
 * にする、既存の書き込みツールの挙動と揃えるため）。
 */
export function toolAnnotationsFor(kind: ToolKind): ToolAnnotations | undefined {
  return TOOL_KIND_TRAITS[kind].readOnly ? { readOnlyHint: true } : undefined;
}

/**
 * server.registerToolへ渡す_metaを種別から組み立てる。alwaysLoadがfalseの
 * 種別では_meta自体をundefinedにする（キー自体を送らない）。
 */
export function toolMetaFor(kind: ToolKind): Record<string, unknown> | undefined {
  return TOOL_KIND_TRAITS[kind].alwaysLoad ? { "anthropic/alwaysLoad": true } : undefined;
}
