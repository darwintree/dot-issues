import type { CommandContext, CommandResult, ParsedArgMap } from "../types";
import {
  applyReferenceRenamePlan,
  buildReferenceRenamePlan,
  normalizeIssueRelativePath,
  summarizeReferenceRenamePlan,
  type ReferenceRenameSummary,
} from "../utils/references";

export async function runRenameReferencesCommand(
  args: ParsedArgMap,
  context: CommandContext,
): Promise<CommandResult<ReferenceRenameSummary>> {
  try {
    const from = args.from;
    const to = args.to;
    const dryRun = args["dry-run"];

    if (typeof from !== "string") {
      return fail("Missing or invalid --from");
    }

    if (typeof to !== "string") {
      return fail("Missing or invalid --to");
    }

    if (dryRun !== undefined && dryRun !== true) {
      return fail("Invalid --dry-run");
    }

    const normalizedFrom = normalizeIssueRelativePath(from);
    const normalizedTo = normalizeIssueRelativePath(to);
    const plan = await buildReferenceRenamePlan(
      context.issueDir,
      normalizedFrom,
      normalizedTo,
    );

    if (!dryRun) {
      await applyReferenceRenamePlan(plan);
    }

    return {
      success: true,
      message: dryRun
        ? "References analyzed successfully"
        : "References renamed successfully",
      data: summarizeReferenceRenamePlan(plan),
    };
  } catch (error) {
    return fail("Failed to rename references", error);
  }
}

function fail(message: string, error?: unknown): CommandResult {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : undefined,
  };
}
