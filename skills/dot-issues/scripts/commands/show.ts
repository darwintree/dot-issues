import type { CommandContext, CommandResult, ParsedArgMap } from "../types";
import type { LocatedIssue } from "../utils/issue";
import { findIssueById } from "../utils/issue";
import { validateUUID } from "../utils/validate";

interface ShowIssuePayload {
  id: string;
  title: string;
  status: string;
  priority?: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  body: string;
  path: string;
  relativePath: string;
  archived: boolean;
}

export async function runShowCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ issue: ShowIssuePayload }>> {
  try {
    const id = args.id;

    if (typeof id !== "string" || !validateUUID(id)) {
      return fail("Missing or invalid --id");
    }

    const foundIssue = await findIssueById(context.issueDir, id);
    if (!foundIssue) {
      return fail(`Issue not found: ${id}`);
    }

    return {
      success: true,
      message: "Issue retrieved successfully",
      data: {
        issue: buildIssuePayload(foundIssue),
      },
    };
  } catch (error) {
    return fail("Failed to show issue", error);
  }
}

function buildIssuePayload(foundIssue: LocatedIssue): ShowIssuePayload {
  return {
    ...foundIssue.issue,
    body: foundIssue.body,
    path: foundIssue.filePath,
    relativePath: foundIssue.relativePath,
    archived: foundIssue.archived,
  };
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
