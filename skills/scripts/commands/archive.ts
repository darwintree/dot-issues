import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import { fileExists, writeMarkdownFile } from "../utils/file";
import {
  findIssueById,
  getArchiveRelativeDir,
  mergeIssueFrontMatter,
} from "../utils/issue";
import { generateFileName, toIsoMinuteString } from "../utils/markdown";
import { validateUUID } from "../utils/validate";

export async function runArchiveCommand(
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

    if (foundIssue.archived) {
      return fail(`Issue is already archived: ${id}`);
    }

    const issue: Issue = {
      ...foundIssue.issue,
      status: "closed",
      updated_at: toIsoMinuteString(new Date()),
    };

    const targetDir = join(
      context.issueDir,
      getArchiveRelativeDir(foundIssue.relativePath),
    );
    const nextPath = join(
      targetDir,
      generateFileName(issue.status, issue.title, new Date(issue.created_at)),
    );

    if (await fileExists(nextPath)) {
      return fail(`Issue file already exists: ${nextPath}`);
    }

    await mkdir(targetDir, { recursive: true });
    await rename(foundIssue.filePath, nextPath);
    await writeMarkdownFile(
      nextPath,
      mergeIssueFrontMatter(foundIssue.frontMatter, issue),
      foundIssue.body,
    );

    return {
      success: true,
      message: "Issue archived successfully",
      data: { issue, path: nextPath },
    };
  } catch (error) {
    return fail("Failed to archive issue", error);
  }
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
