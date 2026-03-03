import path from "path";

export function getRepoRoot() {
  return process.env.AGENT_TEAM_REPO_ROOT ?? process.cwd();
}

export function resolveRepoPath(relativePath: string) {
  const repoRoot = getRepoRoot();
  const resolved = path.resolve(repoRoot, relativePath);

  if (!resolved.startsWith(repoRoot)) {
    throw new Error("Invalid path: path traversal is not allowed.");
  }

  return resolved;
}
