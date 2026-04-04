import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import { writeMarkdownFile } from "../utils/file";
import { findIssueById, mergeIssueFrontMatter } from "../utils/issue";
import { toIsoMinuteString } from "../utils/markdown";
import { validateUUID } from "../utils/validate";

export async function runTouchCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ issue: Issue; path: string }>> {
  try {
    const id = args.id;

    if (typeof id !== "string" || !validateUUID(id)) {
      return fail("Missing or invalid --id");
    }

    const foundIssue = await findIssueById(context.issueDir, id);
    if (!foundIssue) {
      return fail(`Issue not found: ${id}`);
    }

    const issue: Issue = {
      ...foundIssue.issue,
      updated_at: toIsoMinuteString(new Date()),
    };

    await writeMarkdownFile(
      foundIssue.filePath,
      mergeIssueFrontMatter(foundIssue.frontMatter, issue),
      foundIssue.body,
    );

    return {
      success: true,
      message: "Issue timestamp updated successfully",
      data: { issue, path: foundIssue.filePath },
    };
  } catch (error) {
    return fail("Failed to update issue timestamp", error);
  }
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
