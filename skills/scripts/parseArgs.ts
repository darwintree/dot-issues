import type { ParsedArgMap, ParsedArgs } from "./types";

const COMMANDS_WITH_SUBCOMMANDS = new Set(["labels"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rawTokens] = argv;
  const tokens = [...rawTokens];
  const args: ParsedArgMap = {};
  let subcommand: string | undefined;

  if (
    COMMANDS_WITH_SUBCOMMANDS.has(command) &&
    tokens[0] &&
    !tokens[0].startsWith("--")
  ) {
    subcommand = tokens.shift();
  }

  for (let index = 0; index < tokens.length; ) {
    const token = tokens[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (!key) {
      throw new Error("Empty flag name is not allowed");
    }

    const value = tokens[index + 1];
    if (value === undefined || value.startsWith("--")) {
      args[key] = true;
      index += 1;
      continue;
    }

    if (key === "labels") {
      const existing = args.labels;
      args.labels = Array.isArray(existing) ? [...existing, value] : [value];
    } else {
      args[key] = value;
    }

    index += 2;
  }

  return { command, subcommand, args };
}
