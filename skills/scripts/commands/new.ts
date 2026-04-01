import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import {
  ensureIssuesDir,
  fileExists,
  resolveIssueSubdir,
  writeMarkdownFile,
} from "../utils/file";
import { generateFileName, toIsoMinuteString } from "../utils/markdown";
import {
  validateLabels,
  validatePriority,
  validateStatus,
  validateTitle,
} from "../utils/validate";

export async function runNewCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ issue: Issue; path: string }>> {
  try {
    const title = args.title;
    const status = args.status;
    const priority = args.priority;
    const subdir = args.subdir;
    const labels = args.labels ?? [];

    if (typeof title !== "string" || !validateTitle(title)) {
      return fail("Missing or invalid --title");
    }

    if (typeof status !== "string" || !validateStatus(status)) {
      return fail("Missing or invalid --status");
    }

    if (
      priority !== undefined &&
      (typeof priority !== "string" || !validatePriority(priority))
    ) {
      return fail("Invalid --priority");
    }

    if (!validateLabels(labels)) {
      return fail("Invalid --labels");
    }

    if (subdir !== undefined && typeof subdir !== "string") {
      return fail("Invalid --subdir");
    }

    const issueDir = resolveIssueSubdir(context.issueDir, subdir);
    await ensureIssuesDir(issueDir);

    const createdAt = toIsoMinuteString(new Date());
    const issue: Issue = {
      id: randomUUID(),
      title: title.trim(),
      status,
      priority: typeof priority === "string" ? priority : undefined,
      labels,
      created_at: createdAt,
      updated_at: createdAt,
    };

    const filePath = join(
      issueDir,
      generateFileName(issue.status, issue.title, new Date(issue.created_at)),
    );

    if (await fileExists(filePath)) {
      return fail(`Issue file already exists: ${filePath}`);
    }

    await writeMarkdownFile(filePath, issue, "");

    return {
      success: true,
      message: "Issue created successfully",
      data: { issue, path: filePath },
    };
  } catch (error) {
    return fail("Failed to create issue", error);
  }
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
