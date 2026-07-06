import fetch from "node-fetch";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GetOutputsTool } from "../getOutputs.js";

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(),
  };
});

describe("GetOutputsTool", () => {
  let tool: GetOutputsTool;
  let mockFetch: ReturnType<typeof vi.fn>;
  const originalEnv = process.env;

  const mockData = {
    outputs: [
      {
        type: "github",
        title: "example-repo",
        url: "https://github.com/example/example-repo",
        stargazers_count: 42,
        contributors_count: 3,
        language: "TypeScript",
        last_updated_at: "2026-05-01T00:00:00",
      },
      {
        type: "article",
        source: "zenn",
        title: "サンプル記事",
        url: "https://zenn.dev/example/articles/sample",
        tags: ["TypeScript"],
        posted_at: "2026-04-10T00:00:00",
      },
    ],
    page: 1,
    per_page: 20,
    total_count: 2,
  };

  beforeEach(() => {
    tool = new GetOutputsTool();
    mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
    process.env = { ...originalEnv, LAPRAS_API_KEY: "test-api-key" };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env = originalEnv;
  });

  it("パラメータ無しでアウトプット一覧を正常に取得できる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await tool.execute({});

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
    expect(callUrl).toBe("https://lapras.com/api/mcp/outputs");
  });

  it("typeを指定するとクエリパラメータに含まれる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await tool.execute({ type: "github" });

    expect(result.isError).toBeUndefined();
    const callUrl = mockFetch.mock.calls[0][0].toString();
    expect(callUrl).toBe("https://lapras.com/api/mcp/outputs?type=github");
  });

  it("pageとper_pageを指定するとクエリパラメータに含まれる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await tool.execute({ page: 2, per_page: 50 });

    expect(result.isError).toBeUndefined();
    const callUrl = mockFetch.mock.calls[0][0].toString();
    expect(callUrl).toContain("page=2");
    expect(callUrl).toContain("per_page=50");
  });

  it("すべてのパラメータを指定してアウトプット一覧を取得できる", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await tool.execute({ type: "article", page: 3, per_page: 10 });

    expect(result.isError).toBeUndefined();
    const callUrl = mockFetch.mock.calls[0][0].toString();
    expect(callUrl).toBe("https://lapras.com/api/mcp/outputs?type=article&page=3&per_page=10");
  });

  it("LAPRAS_API_KEYが設定されていない場合はエラーを返す", async () => {
    process.env.LAPRAS_API_KEY = undefined;

    const result = await tool.execute({});

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

    const result = await tool.execute({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("アウトプット一覧の取得に失敗しました");

    console.error = originalConsoleError;
  });

  it("ネットワークエラーが発生した場合は適切にエラーハンドリングする", async () => {
    const originalConsoleError = console.error;
    console.error = vi.fn();

    const networkError = new Error("Network error");
    mockFetch.mockRejectedValueOnce(networkError);

    const result = await tool.execute({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("アウトプット一覧の取得に失敗しました");

    console.error = originalConsoleError;
  });
});
