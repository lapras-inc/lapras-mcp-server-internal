import fetch from "node-fetch";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GetPortfolioTool } from "../getPortfolio.js";

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(),
  };
});

describe("GetPortfolioTool", () => {
  let tool: GetPortfolioTool;
  let mockFetch: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  beforeEach(() => {
    tool = new GetPortfolioTool();
    mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    process.env = { ...originalEnv, LAPRAS_API_KEY: "test-api-key" };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env = originalEnv;
  });

  it("ポートフォリオ情報を正常に取得できる", async () => {
    const mockData = {
      profile: {
        bio: "これは自己紹介のサンプルテキストです。",
        location: { name: "東京" },
        occupation: { name: "ソフトウェアエンジニア" },
        oss_contribution_level: 1,
        sns_links: [{ type: "github", url: "https://github.com/example", followers: 10 }],
      },
      e_score: {
        total: 3.5,
        percentile: 85.0,
        github: { score: 3.0, percentile: 90.0 },
      },
      market_value_score: {
        total: 3.5,
        percentile: 85.0,
        tagline: "サンプルタグライン",
      },
      skill_tags: [{ id: 1, name: "Python", level: 10 }],
      languages_byte: [{ language: "Python", byte: 800000 }],
      selections: [],
      pending_reasons: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await tool.execute();

    expect(result.isError).toBeUndefined();
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(JSON.stringify(mockData, null, 2));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "GET",
        headers: {
          accept: "application/json, text/plain, */*",
          Authorization: "Bearer test-api-key",
        },
      }),
    );

    const callUrl = mockFetch.mock.calls[0][0].toString();
    expect(callUrl).toBe("https://lapras.com/api/mcp/portfolio");
  });

  it("LAPRAS_API_KEYが設定されていない場合はエラーを返す", async () => {
    process.env.LAPRAS_API_KEY = undefined;

    const result = await tool.execute();

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("LAPRAS_API_KEYの設定が必要です");
  });

  it("APIリクエストが失敗した場合はエラーを返す", async () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({}),
    });

    const result = await tool.execute();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("ポートフォリオ情報の取得に失敗しました");

    console.error = originalConsoleError;
  });

  it("ネットワークエラーが発生した場合は適切にエラーハンドリングする", async () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();

    const networkError = new Error("Network error");
    mockFetch.mockRejectedValueOnce(networkError);

    const result = await tool.execute();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("ポートフォリオ情報の取得に失敗しました");

    console.error = originalConsoleError;
  });
});
