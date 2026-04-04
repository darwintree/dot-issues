import { dirname, relative } from "node:path";
import type { Issue } from "../types";
import { ARCHIVE_DIRNAME, listIssueFiles, readMarkdownFile } from "./file";
import { toIssue } from "./validate";

export interface LocatedIssue {
  filePath: string;
  relativePath: string;
  archived: boolean;
  issue: Issue;
  body: string;
}

export interface ListLocatedIssuesOptions {
  includeArchived?: boolean;
}

export async function listLocatedIssues(
  issueDir: string,
  options?: ListLocatedIssuesOptions,
): Promise<LocatedIssue[]> {
  const filePaths = await listIssueFiles(issueDir, {
    includeArchived: options?.includeArchived ?? true,
  });

  return Promise.all(
    filePaths.map(async (filePath) => {
      const { frontMatter, body } = await readMarkdownFile(filePath);
      const issue = toIssue(frontMatter);
      const relativePath = relative(issueDir, filePath);
      return {
        filePath,
        relativePath,
        archived: isArchivedRelativePath(relativePath),
        issue,
        body,
      };
    }),
  );
}

export async function findIssueById(
  issueDir: string,
  id: string,
): Promise<LocatedIssue | null> {
  const issues = await listLocatedIssues(issueDir, { includeArchived: true });

  for (const locatedIssue of issues) {
    if (locatedIssue.issue.id === id) {
      return locatedIssue;
    }
  }

  return null;
}

export function formatIssueLine(issue: Issue): string {
  const priority = issue.priority ? ` (${issue.priority})` : "";
  const labels =
    issue.labels.length > 0
      ? ` ${issue.labels.map((label) => `#${label}`).join(" ")}`
      : "";
  return `[${issue.status}] ${issue.title}${priority}${labels} (${issue.created_at.slice(0, 10)})`;
}

export function isArchivedRelativePath(relativePath: string): boolean {
  return (
    relativePath === ARCHIVE_DIRNAME ||
    relativePath.startsWith(`${ARCHIVE_DIRNAME}/`)
  );
}

export function getArchiveRelativeDir(relativePath: string): string {
  const parentDir = dirname(relativePath);
  if (parentDir === ".") {
    return ARCHIVE_DIRNAME;
  }

  return `${ARCHIVE_DIRNAME}/${parentDir}`;
}
