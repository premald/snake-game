import fs from "fs/promises";
import path from "path";
import { ToolSpec, ToolResult } from "../types";
import { getRepoRoot, resolveRepoPath } from "./path_utils";

export const readTools: ToolSpec[] = [
  {
    name: "search_docs",
    description: "Search internal documentation or knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    riskTier: "read",
  },
  {
    name: "read_file",
    description: "Read a file from the repository.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative path" },
      },
      required: ["path"],
      additionalProperties: false,
    },
    riskTier: "read",
  },
];

type SearchMatch = {
  path: string;
  line: number;
  preview: string;
};

async function walkDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath)));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

async function searchDocs(query: string): Promise<SearchMatch[]> {
  const repoRoot = getRepoRoot();
  const docsDir = path.join(repoRoot, "docs");
  const matches: SearchMatch[] = [];

  try {
    const files = await walkDir(docsDir);
    for (const file of files) {
      if (!file.endsWith(".md") && !file.endsWith(".txt") && !file.endsWith(".mdx")) {
        continue;
      }
      const content = await fs.readFile(file, "utf-8");
      const lower = content.toLowerCase();
      const index = lower.indexOf(query.toLowerCase());
      if (index === -1) {
        continue;
      }
      const before = content.slice(0, index);
      const line = before.split("\n").length;
      const preview = content
        .slice(Math.max(0, index - 80), index + 80)
        .replace(/\s+/g, " ")
        .trim();
      matches.push({
        path: path.relative(repoRoot, file),
        line,
        preview,
      });
      if (matches.length >= 10) {
        break;
      }
    }
  } catch {
    return [];
  }

  return matches;
}

export async function executeReadTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  if (toolName === "search_docs") {
    const query = String(input.query ?? "");
    if (!query) {
      return { ok: false, error: "search_docs requires a query string." };
    }
    const results = await searchDocs(query);
    return { ok: true, data: { query, results } };
  }

  if (toolName === "read_file") {
    const relativePath = String(input.path ?? "");
    if (!relativePath) {
      return { ok: false, error: "read_file requires a path." };
    }
    const filePath = resolveRepoPath(relativePath);
    const content = await fs.readFile(filePath, "utf-8");
    return { ok: true, data: { path: relativePath, content } };
  }

  return { ok: false, error: `Unknown read tool: ${toolName}` };
}
