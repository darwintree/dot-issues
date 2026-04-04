import { isAbsolute, resolve } from "node:path";
import { parseArgs } from "./parseArgs";
import type { CommandContext, CommandResult } from "./types";
import { runArchiveCommand } from "./commands/archive";
import { runListCommand } from "./commands/list";
import { runLabelsCommand } from "./commands/labels";
import { runModifyCommand } from "./commands/modify";
import { runNewCommand } from "./commands/new";
import { runSearchCommand } from "./commands/search";
import { runShowCommand } from "./commands/show";
import { runTouchCommand } from "./commands/touch";

const USAGE = `Usage:
  bun {skillPath}/scripts/index.ts new --title "Fix login bug" --status open [--priority high] [--labels bug] [--issue-dir .issues] [--subdir team/auth] [--blank-body] [--allow-new-label]
  bun {skillPath}/scripts/index.ts list [--status open] [--priority high] [--labels bug] [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts search --query "login" [--status open] [--priority high] [--labels bug] [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts show --id <uuid> [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts modify-metadata --id <uuid> [--title "..."] [--status closed] [--priority low] [--labels bug] [--issue-dir .issues] [--allow-new-label]
  bun {skillPath}/scripts/index.ts touch --id <uuid> [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts archive --id <uuid> [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts labels [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts labels sync [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts labels remove --label <label> [--force] [--issue-dir .issues]
  bun {skillPath}/scripts/index.ts labels rename --from <label> --to <label> [--force] [--issue-dir .issues]`;

const COMMAND_HANDLERS = {
  new: runNewCommand,
  list: runListCommand,
  search: runSearchCommand,
  show: runShowCommand,
  "modify-metadata": runModifyCommand,
  touch: runTouchCommand,
  archive: runArchiveCommand,
  labels: runLabelsCommand,
} as const;

export async function main(
  argv: string[] = process.argv.slice(2),
  cwd = process.cwd(),
): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    if (!parsed.command) {
      printError({ success: false, message: USAGE });
      return 1;
    }

    const handler = COMMAND_HANDLERS[parsed.command as keyof typeof COMMAND_HANDLERS];
    if (!handler) {
      printError({ success: false, message: `Unknown command: ${parsed.command}`, error: USAGE });
      return 1;
    }

    const context = buildCommandContext(parsed, cwd);
    if (!context.success || !context.data) {
      printError(context);
      return 1;
    }
    const commandContext = context.data;

    const result = await handler(
      parsed.subcommand
        ? {
            ...parsed.args,
            subcommand: parsed.subcommand,
          }
        : parsed.args,
      commandContext,
    );
    if (!result.success) {
      printError(result);
      return 1;
    }

    if (
      parsed.command === "list" ||
      parsed.command === "search" ||
      parsed.command === "labels"
    ) {
      const output = extractOutput(result);
      if (output) {
        console.log(output);
      }
      return 0;
    }

    console.log(JSON.stringify(result, null, 2));
    return 0;
  } catch (error) {
    printError({
      success: false,
      message: "CLI execution failed",
      error: error instanceof Error ? error.message : String(error),
    });
    return 1;
  }
}

function buildCommandContext(
  parsed: { args: Record<string, unknown> },
  cwd: string,
): CommandResult<CommandContext> {
  const issueDir = parsed.args["issue-dir"];

  if (issueDir !== undefined && typeof issueDir !== "string") {
    return {
      success: false,
      message: "Invalid --issue-dir",
    };
  }

  if (typeof issueDir === "string" && issueDir.trim().length === 0) {
    return {
      success: false,
      message: "Invalid --issue-dir",
    };
  }

  const normalizedIssueDir = issueDir?.trim() || ".issues";
  return {
    success: true,
    message: "Command context created",
    data: {
      cwd,
      issueDir: isAbsolute(normalizedIssueDir)
        ? normalizedIssueDir
        : resolve(cwd, normalizedIssueDir),
    },
  };
}

function extractOutput(result: CommandResult<unknown>): string {
  if (!result.data || typeof result.data !== "object" || !("output" in result.data)) {
    return "";
  }

  const output = result.data.output;
  return typeof output === "string" ? output : "";
}

function printError(result: CommandResult<unknown>): void {
  console.error(JSON.stringify(result, null, 2));
}

if (import.meta.main) {
  const exitCode = await main();
  process.exit(exitCode);
}
