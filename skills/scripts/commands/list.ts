import type { CommandContext, CommandResult, ParsedArgMap } from "../types";
import { formatIssueLine, listLocatedIssues } from "../utils/issue";
import {
  validateLabels,
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
    const labels = args.labels;

    if (status !== undefined && (typeof status !== "string" || !validateStatus(status))) {
      return fail("Invalid --status");
    }

    if (
      priority !== undefined &&
      (typeof priority !== "string" || !validatePriority(priority))
    ) {
      return fail("Invalid --priority");
    }

    if (labels !== undefined && !validateLabels(labels)) {
      return fail("Invalid --labels");
    }

    const issues = (await listLocatedIssues(context.issueDir, { includeArchived: false })).map(
      (locatedIssue) => locatedIssue.issue,
    );

    const filteredIssues = issues
      .filter((issue) => !status || issue.status === status)
      .filter((issue) => !priority || issue.priority === priority)
      .filter((issue) => !labels || labels.some((label) => issue.labels.includes(label)))
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

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
