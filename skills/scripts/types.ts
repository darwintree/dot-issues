export type IssueStatus = "open" | "working" | "closed";
export type IssuePriority = "low" | "medium" | "high";
export type FrontMatterValue = string | string[];
export type FrontMatterData = Record<string, FrontMatterValue | undefined>;
export type ParsedArgValue = string | string[] | boolean | undefined;
export type ParsedArgMap = Record<string, ParsedArgValue>;

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  priority?: IssuePriority;
  labels: string[];
  created_at: string;
  updated_at: string;
}

export interface ParsedArgs {
  command: string;
  args: ParsedArgMap;
}

export interface CommandContext {
  cwd: string;
  issueDir: string;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
