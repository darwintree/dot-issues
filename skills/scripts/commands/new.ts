import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import {
  ensureIssuesDir,
  fileExists,
  resolveIssueSubdir,
  writeMarkdownFile,
} from "../utils/file";
import { issueToFrontMatter } from "../utils/issue";
import {
  assertLabelsRegistered,
  buildUpdatedRegistryLabels,
  readLabelRegistry,
  writeLabelRegistry,
} from "../utils/labels";
import { generateFileName, toIsoMinuteString } from "../utils/markdown";
import {
  normalizeLabels,
  validateLabels,
  validatePriority,
  validateStatus,
  validateTitle,
} from "../utils/validate";

export const DEFAULT_ISSUE_BODY = `<!--
This body is user-owned. Adjust the sections freely to fit the issue.
Use the CLI to update front matter fields such as title, status, priority, and labels.
-->

## Problem

<!-- Describe the concrete problem, symptom, or requested change. -->

## Issue Assessment

<!-- Record whether this is a meaningful issue worth acting on. -->
- Impact:
- Evidence:
- Scope:
- Decision: valid / invalid / defer

## Verification Checklist

<!-- Keep this checklist practical. Add or remove items as needed for the issue. -->
- [ ] Problem reproduced
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Tests added or updated
- [ ] Fix verified
- [ ] No regression found

## Progress Log

<!-- Append dated updates here as work progresses. Keep older entries instead of rewriting them. -->
- YYYY-MM-DD:
`;

export async function runNewCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ issue: Issue; path: string }>> {
  try {
    const blankBody = args["blank-body"];
    const title = args.title;
    const status = args.status;
    const priority = args.priority;
    const subdir = args.subdir;
    const labels = args.labels ?? [];
    const allowNewLabel = args["allow-new-label"];

    if (blankBody !== undefined && blankBody !== true) {
      return fail("Invalid --blank-body");
    }

    if (allowNewLabel !== undefined && allowNewLabel !== true) {
      return fail("Invalid --allow-new-label");
    }

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
    const normalizedLabels = normalizeLabels(labels);
    const nextRegistryLabels = allowNewLabel
      ? buildUpdatedRegistryLabels(
          await readLabelRegistry(context.issueDir),
          normalizedLabels,
        )
      : undefined;

    if (!allowNewLabel) {
      await assertLabelsRegistered(context.issueDir, normalizedLabels);
    }

    const createdAt = toIsoMinuteString(new Date());
    const issue: Issue = {
      id: randomUUID(),
      title: title.trim(),
      status,
      priority: typeof priority === "string" ? priority : undefined,
      labels: normalizedLabels,
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

    await writeMarkdownFile(
      filePath,
      issueToFrontMatter(issue),
      blankBody ? "" : DEFAULT_ISSUE_BODY,
    );

    try {
      if (nextRegistryLabels) {
        await writeLabelRegistry(context.issueDir, nextRegistryLabels);
      }
    } catch (error) {
      await unlink(filePath);
      throw error;
    }

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
