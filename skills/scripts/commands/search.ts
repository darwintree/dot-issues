import type { CommandContext, CommandResult, ParsedArgMap } from "../types";
import { formatIssueLine, listLocatedIssues } from "../utils/issue";
import {
  normalizeLabels,
  validateLabels,
  validatePriority,
  validateStatus,
} from "../utils/validate";

export async function runSearchCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ output: string; count: number }>> {
  try {
    const query = args.query;
    const status = args.status;
    const priority = args.priority;
    const labels = args.labels;

    if (typeof query !== "string" || query.trim().length === 0) {
      return fail("Missing or invalid --query");
    }

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

    const normalizedQuery = query.trim().toLowerCase();
    const normalizedLabels = labels === undefined ? undefined : normalizeLabels(labels);
    const matchedIssues = (await listLocatedIssues(context.issueDir, { includeArchived: false }))
      .filter((locatedIssue) => {
        const searchableText =
          `${locatedIssue.issue.title}\n${locatedIssue.body}`.toLowerCase();
        return searchableText.includes(normalizedQuery);
      })
      .filter((locatedIssue) => !status || locatedIssue.issue.status === status)
      .filter((locatedIssue) => !priority || locatedIssue.issue.priority === priority)
      .filter(
        (locatedIssue) =>
          !normalizedLabels ||
          normalizedLabels.some((label) => locatedIssue.issue.labels.includes(label)),
      )
      .sort((left, right) => {
        return (
          new Date(right.issue.created_at).getTime() -
          new Date(left.issue.created_at).getTime()
        );
      });

    const output = matchedIssues
      .map((locatedIssue) => `${formatIssueLine(locatedIssue.issue)} :: ${locatedIssue.relativePath}`)
      .join("\n");

    return {
      success: true,
      message: matchedIssues.length > 0 ? "Issues found successfully" : "No issues found",
      data: { output, count: matchedIssues.length },
    };
  } catch (error) {
    return fail("Failed to search issues", error);
  }
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
