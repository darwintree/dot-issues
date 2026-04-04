import type { CommandContext, CommandResult, Issue, ParsedArgMap } from "../types";
import { writeMarkdownFile } from "../utils/file";
import {
  readLabelRegistry,
  renameRegistryLabel,
  writeLabelRegistry,
} from "../utils/labels";
import { listLocatedIssues, mergeIssueFrontMatter } from "../utils/issue";
import { normalizeLabel, normalizeLabels, validateLabels } from "../utils/validate";

export async function runLabelsCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ output: string; count: number }>> {
  try {
    const subcommand = args.subcommand;

    if (subcommand === undefined) {
      return runListLabelsCommand(context);
    }

    if (subcommand === "sync") {
      return runSyncLabelsCommand(context);
    }

    if (subcommand === "remove") {
      return runRemoveLabelCommand(args, context);
    }

    if (subcommand === "rename") {
      return runRenameLabelCommand(args, context);
    }

    return fail(`Unknown labels subcommand: ${String(subcommand)}`);
  } catch (error) {
    return fail("Failed to manage labels", error);
  }
}

async function runListLabelsCommand(
  context: CommandContext,
): Promise<CommandResult<{ output: string; count: number }>> {
  const labels = [...(await readLabelRegistry(context.issueDir))].sort((left, right) =>
    left.localeCompare(right),
  );

  return {
    success: true,
    message: labels.length > 0 ? "Labels listed successfully" : "No labels found",
    data: {
      output: labels.join("\n"),
      count: labels.length,
    },
  };
}

async function runSyncLabelsCommand(
  context: CommandContext,
): Promise<CommandResult<{ output: string; count: number }>> {
  const issues = await listLocatedIssues(context.issueDir, { includeArchived: true });
  const currentRegistry = await readLabelRegistry(context.issueDir);
  const registryLabels: string[] = [];

  for (const locatedIssue of issues) {
    const rawLabels = validateLabels(locatedIssue.frontMatter.labels)
      ? locatedIssue.frontMatter.labels
      : locatedIssue.issue.labels;
    const normalizedIssueLabels = normalizeLabels(rawLabels);
    registryLabels.push(...normalizedIssueLabels);

    if (!areLabelsEqual(rawLabels, normalizedIssueLabels)) {
      const nextIssue: Issue = {
        ...locatedIssue.issue,
        labels: normalizedIssueLabels,
      };
      await writeMarkdownFile(
        locatedIssue.filePath,
        mergeIssueFrontMatter(locatedIssue.frontMatter, nextIssue),
        locatedIssue.body,
      );
    }
  }

  const labels = await writeLabelRegistry(context.issueDir, [
    ...currentRegistry,
    ...registryLabels,
  ]);

  return {
    success: true,
    message: "Labels synced successfully",
    data: {
      output: labels.join("\n"),
      count: labels.length,
    },
  };
}

async function runRemoveLabelCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ output: string; count: number }>> {
  const label = args.label;
  const force = args.force;

  if (typeof label !== "string" || normalizeLabel(label).length === 0) {
    return fail("Missing or invalid --label");
  }

  if (force !== undefined && force !== true) {
    return fail("Invalid --force");
  }

  const targetLabel = normalizeLabel(label);
  const registry = await readLabelRegistry(context.issueDir);
  if (!registry.includes(targetLabel)) {
    return fail(`Label not found: ${targetLabel}`);
  }

  const issues = await listLocatedIssues(context.issueDir, { includeArchived: true });
  const referencedIssues = issues.filter((locatedIssue) =>
    locatedIssue.issue.labels.includes(targetLabel),
  );

  if (referencedIssues.length > 0 && !force) {
    return fail(`Label is still referenced by issues: ${targetLabel}`);
  }

  if (force) {
    for (const locatedIssue of referencedIssues) {
      const nextIssue: Issue = {
        ...locatedIssue.issue,
        labels: locatedIssue.issue.labels.filter((issueLabel) => issueLabel !== targetLabel),
      };
      await writeMarkdownFile(
        locatedIssue.filePath,
        mergeIssueFrontMatter(locatedIssue.frontMatter, nextIssue),
        locatedIssue.body,
      );
    }
  }

  const nextRegistry = registry.filter((registryLabel) => registryLabel !== targetLabel);
  await writeLabelRegistry(context.issueDir, nextRegistry);

  return {
    success: true,
    message: "Label removed successfully",
    data: {
      output: nextRegistry.join("\n"),
      count: nextRegistry.length,
    },
  };
}

async function runRenameLabelCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<{ output: string; count: number }>> {
  const from = args.from;
  const to = args.to;
  const force = args.force;

  if (typeof from !== "string" || normalizeLabel(from).length === 0) {
    return fail("Missing or invalid --from");
  }

  if (typeof to !== "string" || normalizeLabel(to).length === 0) {
    return fail("Missing or invalid --to");
  }

  if (force !== undefined && force !== true) {
    return fail("Invalid --force");
  }

  const fromLabel = normalizeLabel(from);
  const toLabel = normalizeLabel(to);
  const registry = await readLabelRegistry(context.issueDir);

  if (!registry.includes(fromLabel)) {
    return fail(`Label not found: ${fromLabel}`);
  }

  if (registry.includes(toLabel) && !force) {
    return fail(`Label already exists: ${toLabel}`);
  }

  const issues = await listLocatedIssues(context.issueDir, { includeArchived: true });
  for (const locatedIssue of issues) {
    if (!locatedIssue.issue.labels.includes(fromLabel)) {
      continue;
    }

    const nextIssue: Issue = {
      ...locatedIssue.issue,
      labels: normalizeLabels(
        locatedIssue.issue.labels.map((label) => (label === fromLabel ? toLabel : label)),
      ),
    };
    await writeMarkdownFile(
      locatedIssue.filePath,
      mergeIssueFrontMatter(locatedIssue.frontMatter, nextIssue),
      locatedIssue.body,
    );
  }

  const nextRegistry = renameRegistryLabel(registry, fromLabel, toLabel);
  await writeLabelRegistry(context.issueDir, nextRegistry);

  return {
    success: true,
    message: "Label renamed successfully",
    data: {
      output: nextRegistry.join("\n"),
      count: nextRegistry.length,
    },
  };
}

function areLabelsEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((label, index) => label === right[index])
  );
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
