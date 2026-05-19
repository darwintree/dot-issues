import { rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import { fileExists, writeMarkdownFile } from "../utils/file";
import {
  assertLabelsRegistered,
  buildUpdatedRegistryLabels,
  readLabelRegistry,
  writeLabelRegistry,
} from "../utils/labels";
import { findIssueById, mergeIssueFrontMatter } from "../utils/issue";
import { generateFileName, toIsoMinuteString } from "../utils/markdown";
import {
  applyReferenceRenamePlan,
  buildReferenceRenamePlan,
  getPlannedBodyForPath,
  restoreAppliedReferenceUpdates,
  summarizeReferenceRenameCounts,
  toIssueRelativePath,
  type AppliedReferenceUpdate,
  type ReferenceRenameCounts,
} from "../utils/references";
import {
  normalizeLabels,
  validateLabels,
  validatePriority,
  validateStatus,
  validateTitle,
  validateUUID,
} from "../utils/validate";

export async function runModifyCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<
  CommandResult<{
    issue: Issue;
    path: string;
    references: ReferenceRenameCounts;
  }>
> {
  try {
    const id = args.id;
    const title = args.title;
    const status = args.status;
    const priority = args.priority;
    const labels = args.labels;
    const allowNewLabel = args["allow-new-label"];

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

    if (allowNewLabel !== undefined && allowNewLabel !== true) {
      return fail("Invalid --allow-new-label");
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

    const normalizedLabels = labels === undefined ? undefined : normalizeLabels(labels);
    const nextRegistryLabels =
      normalizedLabels && allowNewLabel
        ? buildUpdatedRegistryLabels(
            await readLabelRegistry(context.issueDir),
            normalizedLabels,
          )
        : undefined;

    if (normalizedLabels) {
      if (!allowNewLabel) {
        await assertLabelsRegistered(context.issueDir, normalizedLabels);
      }
    }

    const issue: Issue = {
      ...foundIssue.issue,
      title: typeof title === "string" ? title.trim() : foundIssue.issue.title,
      status: typeof status === "string" ? status : foundIssue.issue.status,
      priority: typeof priority === "string" ? priority : foundIssue.issue.priority,
      labels: normalizedLabels ?? foundIssue.issue.labels,
      updated_at: toIsoMinuteString(new Date()),
    };

    const nextPath = join(
      dirname(foundIssue.filePath),
      generateFileName(issue.status, issue.title, new Date(issue.created_at)),
    );

    if (nextPath !== foundIssue.filePath && (await fileExists(nextPath))) {
      return fail(`Issue file already exists: ${nextPath}`);
    }

    const referencePlan =
      nextPath === foundIssue.filePath
        ? undefined
        : await buildReferenceRenamePlan(
            context.issueDir,
            foundIssue.relativePath,
            toIssueRelativePath(context.issueDir, nextPath),
            foundIssue.filePath,
            nextPath,
          );
    const references = summarizeReferenceRenameCounts(referencePlan);
    const nextBody = referencePlan
      ? getPlannedBodyForPath(referencePlan, nextPath, foundIssue.body)
      : foundIssue.body;
    let appliedReferenceUpdates: AppliedReferenceUpdate[] = [];

    try {
      if (nextPath !== foundIssue.filePath) {
        await rename(foundIssue.filePath, nextPath);
      }

      await writeMarkdownFile(
        nextPath,
        mergeIssueFrontMatter(foundIssue.frontMatter, issue),
        nextBody,
      );

      if (referencePlan) {
        appliedReferenceUpdates = await applyReferenceRenamePlan(referencePlan, {
          skipPaths: new Set([nextPath]),
        });
      }

      if (nextRegistryLabels) {
        await writeLabelRegistry(context.issueDir, nextRegistryLabels);
      }
    } catch (error) {
      await restoreAppliedReferenceUpdates(appliedReferenceUpdates);

      if (nextPath !== foundIssue.filePath && (await fileExists(nextPath))) {
        await rename(nextPath, foundIssue.filePath);
      }

      await writeMarkdownFile(foundIssue.filePath, foundIssue.frontMatter, foundIssue.body);
      throw error;
    }

    return {
      success: true,
      message: "Issue modified successfully",
      data: { issue, path: nextPath, references },
    };
  } catch (error) {
    return fail("Failed to modify issue", error);
  }
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
