import { parseArgs as parseNodeArgs } from "node:util";
import type { ParsedArgMap, ParsedArgs } from "./types";

const OPTION_CONFIG = {
  title: { type: "string" },
  content: { type: "string" },
  status: { type: "string" },
  priority: { type: "string" },
  labels: { type: "string", multiple: true },
  query: { type: "string" },
  id: { type: "string" },
  "issue-dir": { type: "string" },
  subdir: { type: "string" },
  "blank-body": { type: "boolean" },
  "allow-new-label": { type: "boolean" },
  label: { type: "string" },
  force: { type: "boolean" },
  from: { type: "string" },
  to: { type: "string" },
  "dry-run": { type: "boolean" },
} as const;

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rawTokens] = argv;
  let subcommand: string | undefined;
  let tokens = rawTokens;

  if (command === "labels" && tokens[0] && !tokens[0].startsWith("--")) {
    subcommand = tokens[0];
    tokens = tokens.slice(1);
  }

  const { values, positionals } = parseNodeArgs({
    args: tokens,
    options: OPTION_CONFIG,
    allowPositionals: true,
    strict: true,
  });

  if (positionals.length > 0) {
    throw new Error(`Unexpected argument: ${positionals[0]}`);
  }

  return {
    command,
    subcommand,
    args: values as ParsedArgMap,
  };
}
