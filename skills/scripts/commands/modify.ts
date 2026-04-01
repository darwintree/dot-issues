import { rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import {
  fileExists,
  listIssueFiles,
  readMarkdownFile,
  writeMarkdownFile,
} from "../utils/file";
import { generateFileName, toIsoMinuteString } from "../utils/markdown";
import {
  toIssue,
  validateLabels,
  validatePriority,
  validateStatus,
  validateTitle,
  validateUUID,
} from "../utils/validate";

export async function runModifyCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ issue: Issue; path: string }>> {
  try {
    const id = args.id;
    const title = args.title;
    const status = args.status;
    const priority = args.priority;
    const labels = args.labels;

    if (typeof id !== "string" || !validateUUID(id)) {
      return fail("Missing or invalid --id");
    }

    if (title !== undefined && (typeof title !== "string" || !validateTitle(title))) {
      return fail("Invalid --title");
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

    if (
      title === undefined &&
      status === undefined &&
      priority === undefined &&
      labels === undefined
    ) {
      return fail("No metadata changes provided");
    }

    const foundIssue = await findIssueById(context.issueDir, id);
    if (!foundIssue) {
      return fail(`Issue not found: ${id}`);
    }

    const issue: Issue = {
      ...foundIssue.issue,
      title: typeof title === "string" ? title.trim() : foundIssue.issue.title,
      status: typeof status === "string" ? status : foundIssue.issue.status,
      priority: typeof priority === "string" ? priority : foundIssue.issue.priority,
      labels: labels ?? foundIssue.issue.labels,
      updated_at: toIsoMinuteString(new Date()),
    };

    const nextPath = join(
      dirname(foundIssue.filePath),
      generateFileName(issue.status, issue.title, new Date(issue.created_at)),
    );

    if (nextPath !== foundIssue.filePath && (await fileExists(nextPath))) {
      return fail(`Issue file already exists: ${nextPath}`);
    }

    if (nextPath !== foundIssue.filePath) {
      await rename(foundIssue.filePath, nextPath);
    }

    await writeMarkdownFile(nextPath, issue, foundIssue.body);

    return {
      success: true,
      message: "Issue modified successfully",
      data: { issue, path: nextPath },
    };
  } catch (error) {
    return fail("Failed to modify issue", error);
  }
}

async function findIssueById(
  issueDir: string,
  id: string,
): Promise<{ filePath: string; issue: Issue; body: string } | null> {
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

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
