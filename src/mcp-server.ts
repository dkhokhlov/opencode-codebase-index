import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as path from "path";
import { existsSync } from "fs";

import { Indexer } from "./indexer/index.js";
import type { ParsedCodebaseIndexConfig } from "./config/schema.js";
import { resolveWorktreeMainRepoRoot } from "./git/index.js";
import { registerMcpPrompts } from "./mcp-server/register-prompts.js";
import { registerMcpTools } from "./mcp-server/register-tools.js";

export function createMcpServer(projectRoot: string, config: ParsedCodebaseIndexConfig): McpServer {
  const server = new McpServer({
    name: "opencode-codebase-index",
    version: "0.5.1",
  });

  const runtimeConfig = config;
  let indexer = new Indexer(projectRoot, runtimeConfig);
  let initialized = false;

  function refreshIndexerFromConfig(): void {
    indexer = new Indexer(projectRoot, runtimeConfig);
    initialized = false;
  }

  function shouldForceLocalizeProjectIndex(): boolean {
    if (runtimeConfig.scope !== "project") {
      return false;
    }

    const localIndexPath = path.join(projectRoot, ".opencode", "index");
    const mainRepoRoot = resolveWorktreeMainRepoRoot(projectRoot);
    if (!mainRepoRoot) {
      return false;
    }

    const inheritedIndexPath = path.join(mainRepoRoot, ".opencode", "index");
    return !existsSync(localIndexPath) && existsSync(inheritedIndexPath);
  }

  async function ensureInitialized(): Promise<void> {
    if (!initialized) {
      await indexer.initialize();
      initialized = true;
    }
  }

  registerMcpTools(server, {
    projectRoot,
    ensureInitialized,
    getIndexer: () => indexer,
    refreshIndexerFromConfig,
    shouldForceLocalizeProjectIndex,
  });

  registerMcpPrompts(server);

  return server;
}
