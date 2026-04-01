import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import type { Issue } from "../skills/scripts/types";
import { listIssueFiles } from "../skills/scripts/utils/file";
import {
  generateFileName,
  generateMarkdownContent,
} from "../skills/scripts/utils/markdown";
import { parseFrontMatter } from "../skills/scripts/utils/markdown";

const REPO_ROOT = resolve(import.meta.dir, "..");
const CLI_ENTRY = join(REPO_ROOT, "skills/scripts/index.ts");

export async function createWorkspace(): Promise<string> {
  return mkdtemp(join(tmpdir(), "dot-issues-"));
}

export async function destroyWorkspace(workspace: string): Promise<void> {
  await rm(workspace, { recursive: true, force: true });
}

export async function runCli(
  cwd: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const process = Bun.spawn({
    cmd: ["bun", CLI_ENTRY, ...args],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  return {
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    exitCode,
  };
}

export async function readIssueDocuments(
  cwd: string,
  issueDir = ".issues",
): Promise<
  Array<{
    name: string;
    relativePath: string;
    frontMatter: Record<string, unknown>;
    body: string;
  }>
> {
  const resolvedIssueDir = resolveIssueDir(cwd, issueDir);
  const filePaths = await listIssueFiles(resolvedIssueDir);

  return Promise.all(
    filePaths.map(async (filePath) => {
      const content = await readFile(filePath, "utf8");
      const { frontMatter, body } = parseFrontMatter(content);
      return {
        name: basename(filePath),
        relativePath: relative(resolvedIssueDir, filePath),
        frontMatter,
        body,
      };
    }),
  );
}

export async function seedIssue(
  cwd: string,
  issue: Issue,
  body = "",
  issueDir = ".issues",
): Promise<string> {
  const resolvedIssueDir = resolveIssueDir(cwd, issueDir);
  const filePath = join(
    resolvedIssueDir,
    generateFileName(issue.status, issue.title, new Date(issue.created_at)),
  );

  await mkdir(resolvedIssueDir, { recursive: true });
  await writeFile(filePath, generateMarkdownContent(issue, body), "utf8");
  return filePath;
}

export function parseJsonOutput<T>(output: string): T {
  return JSON.parse(output) as T;
}

function resolveIssueDir(cwd: string, issueDir = ".issues"): string {
  return isAbsolute(issueDir) ? issueDir : join(cwd, issueDir);
}
