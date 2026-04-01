import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import { listIssueFiles, readMarkdownFile } from "../utils/file";
import {
  toIssue,
  validatePriority,
  validateStatus,
} from "../utils/validate";

export async function runListCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ output: string; count: number }>> {
  try {
    const status = args.status;
    const priority = args.priority;

    if (status !== undefined && (typeof status !== "string" || !validateStatus(status))) {
      return fail("Invalid --status");
    }

    if (
      priority !== undefined &&
      (typeof priority !== "string" || !validatePriority(priority))
    ) {
      return fail("Invalid --priority");
    }

    if (args.labels !== undefined) {
      return fail("Filtering by --labels is not implemented yet");
    }

    const filePaths = await listIssueFiles(context.issueDir);
    const issues = await Promise.all(
      filePaths.map(async (filePath) => {
        const { frontMatter } = await readMarkdownFile(filePath);
        return toIssue(frontMatter);
      }),
    );

    const filteredIssues = issues
      .filter((issue) => !status || issue.status === status)
      .filter((issue) => !priority || issue.priority === priority)
      .sort((left, right) => {
        return (
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
        );
      });

    const output = filteredIssues.map(formatIssueLine).join("\n");
    return {
      success: true,
      message: filteredIssues.length > 0 ? "Issues listed successfully" : "No issues found",
      data: { output, count: filteredIssues.length },
    };
  } catch (error) {
    return fail("Failed to list issues", error);
  }
}

function formatIssueLine(issue: Issue): string {
  const priority = issue.priority ? ` (${issue.priority})` : "";
  const labels = issue.labels.length > 0 ? ` ${issue.labels.map((label) => `#${label}`).join(" ")}` : "";
  return `[${issue.status}] ${issue.title}${priority}${labels} (${issue.created_at.slice(0, 10)})`;
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
