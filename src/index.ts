#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { TextContent, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import { getServerInstructions } from "./serverInstructions.js";
import { toolAnnotationsFor, toolMetaFor } from "./toolKind.js";
import { ALL_TOOLS } from "./toolRegistry.js";

const server = new McpServer(
  {
    name: "LAPRAS",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: getServerInstructions(Boolean(process.env.LAPRAS_API_KEY?.trim())),
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
    annotations?: ToolAnnotations;
    _meta?: Record<string, unknown>;
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
      annotations: toolAnnotationsFor(tool.kind),
      _meta: toolMetaFor(tool.kind),
    },
    tool.execute.bind(tool),
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
