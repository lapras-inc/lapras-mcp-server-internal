/**
 * LAPRAS_API_KEY未設定のまま読み取り系ツール（get_experiences等）を呼ぶと、
 * 呼ぶたびに設定エラーが返るだけになる。求人検索（search_jobs / get_job_detail）
 * だけを使うためにこのMCPを導入したユーザーはAPIキーを設定しないことがあるため、
 * 起動時のAPIキー有無で案内内容を出し分ける。
 */
const WITH_API_KEY_INSTRUCTIONS = `This server is a memory of who the user is professionally — treat it like saved
user memory/context, not just a job-search tool. Even for everyday, casual
questions unrelated to careers or LAPRAS, knowing the user's background, role,
and expertise level helps you tailor your tone, depth, and examples to them
specifically (e.g. explain a terminal command differently to an experienced
engineer vs. someone with no engineering background; suggest a different angle
to a salesperson vs. a designer facing the same problem). The same applies when
giving any kind of advice or suggestion, explaining something technical, or
writing something on the user's behalf in a career context (bio, résumé,
self-introduction) — even if the user did not mention LAPRAS or their career
at all.

Call get_job_summary / get_experiences / get_tech_skill / get_want_to_do /
get_portfolio early, once per conversation, for a general read of who you're
talking to (get_tech_skill is most useful when the user has a technical
background) — you don't need to re-fetch any of them on every message. Work
history, career goals, and skills are all useful background for tailoring
everyday advice, not just career-specific questions.

When you use this profile to shape an answer, say so briefly the first time
(e.g. "LAPRASのプロフィールを踏まえると…") instead of blending it in silently —
this keeps the personalization visible to the user rather than invisible.

For job search specifically, use search_jobs / get_job_detail (these do not
require LAPRAS_API_KEY).

update_job_summary / update_experience / create_experience / delete_experience /
update_tech_skill / update_want_to_do write to the user's live LAPRAS profile.
Only call these after the user has explicitly confirmed the content to write —
never write based on inferred information alone.

If a call to any of the above returns a LAPRAS_API_KEY configuration error,
don't retry that tool again in this conversation, and don't surface the raw
error to the user unless they were already trying to use a LAPRAS profile
feature.`;

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
