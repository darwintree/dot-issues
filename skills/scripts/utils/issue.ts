import type { Issue } from "../types";
import { listIssueFiles, readMarkdownFile } from "./file";
import { toIssue } from "./validate";

export interface LocatedIssue {
  filePath: string;
  issue: Issue;
  body: string;
}

export async function findIssueById(
  issueDir: string,
  id: string,
): Promise<LocatedIssue | null> {
  const filePaths = await listIssueFiles(issueDir);

  for (const filePath of filePaths) {
    const { frontMatter, body } = await readMarkdownFile(filePath);
    const issue = toIssue(frontMatter);
    if (issue.id === id) {
      return { filePath, issue, body };
    }
  }

  return null;
}
