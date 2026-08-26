/**
 * LAPRAS_API_KEY未設定のまま読み取り系ツール（get_experiences等）を呼ぶと、
 * 呼ぶたびに設定エラーが返るだけになる。求人検索（search_jobs / get_job_detail）
 * だけを使うためにこのMCPを導入したユーザーはAPIキーを設定しないことがあるため、
 * 起動時のAPIキー有無で案内内容を出し分ける。
 *
 * instructionsをどこまで読み込むかにはクライアント側の上限がある。Claude Codeは
 * 2048文字で打ち切り、超過分は末尾から黙って捨てられる（エラーにはならない）。
 * 安全上重要な指示（推測での書き込み禁止など）が末尾にあると、超過したときに
 * それだけが失われるため、文面全体をこの上限内に収める。
 */
const WITH_API_KEY_INSTRUCTIONS = `LAPRAS stores this user's professional profile: work history, skills and years of
each, career goals, scores, and public output (repos, articles, talks). Treat it as
saved context about who you are talking to.

WHEN TO READ THE PROFILE
Read it before answering anything whose answer depends on who the user is:
- Advice, a recommendation, or a judgment call — "どっちがいい", "どう思う",
  "した方がいい", "提案して", "おすすめ", "what should I do".
- Anything about the user themselves — "私は", "自分は", their strengths, gaps,
  what to learn next, whether something suits them.
- Writing in the user's voice: bio, self-introduction, resume, talk proposal.
- Explaining a technology or a tradeoff, where the right depth depends on what
  they already know.
Read it even when the user never mentions LAPRAS or their career. These tools are
read-only and cheap; when in doubt, read rather than guess.

Skip it for mechanical work with no personal component: editing code, writing
queries, running commands, fixing a failing test.

HOW
Call get_job_summary, get_experiences, get_tech_skill, get_want_to_do,
get_portfolio and get_outputs once, at the point you first need them. Treat the
result as a snapshot for the whole conversation and do not re-read on later turns.
Let it shape the depth, the examples, and which option you recommend. Prefer to say
that the profile informed your answer (e.g. "LAPRASのプロフィールを踏まえると…") so
the personalization stays visible. This is a preference, not a rule — skip it when
it would interrupt the answer, and never let it affect whether you read at all.

Job search is separate: search_jobs / get_job_detail need no profile and no API key.

update_* / create_* / delete_* write to the live profile. Never write from
inferred information — only content the user explicitly confirmed.

If a call returns a LAPRAS_API_KEY configuration error, stop calling that tool for
this conversation. Don't surface the raw error unless the user was already trying
to use a profile feature.`;

const WITHOUT_API_KEY_INSTRUCTIONS = `This server lets the user search LAPRAS(https://lapras.com) job postings via
search_jobs / get_job_detail — these work without any configuration. Profile
tools (get_experiences, get_tech_skill, get_want_to_do, get_job_summary,
get_portfolio, get_outputs, and their update/create/delete counterparts)
require a LAPRAS_API_KEY that is not currently configured — do not call them.
If the user wants profile-aware features (personalized advice based on their
LAPRAS profile, résumé/CV editing, etc.), tell them to get a key from
https://lapras.com/config/api-key and add it to their MCP configuration.`;

/**
 * MCPサーバーのinstructionsフィールドに渡す文面を、APIキーの有無に応じて返す。
 */
export function getServerInstructions(hasApiKey: boolean): string {
  return hasApiKey ? WITH_API_KEY_INSTRUCTIONS : WITHOUT_API_KEY_INSTRUCTIONS;
}
