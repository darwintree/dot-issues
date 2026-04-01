import type {
  FrontMatterData,
  Issue,
  IssuePriority,
  IssueStatus,
} from "../types";

const VALID_STATUSES = new Set<IssueStatus>(["open", "working", "closed"]);
const VALID_PRIORITIES = new Set<IssuePriority>(["low", "medium", "high"]);
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateStatus(status: string): status is IssueStatus {
  return VALID_STATUSES.has(status as IssueStatus);
}

export function validatePriority(priority: string): priority is IssuePriority {
  return VALID_PRIORITIES.has(priority as IssuePriority);
}

export function validateTitle(title: string): boolean {
  return title.trim().length > 0;
}

export function validateLabels(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((label) => typeof label === "string" && label.trim().length > 0)
  );
}

export function validateUUID(uuid: string): boolean {
  return UUID_V4_PATTERN.test(uuid);
}

export function toIssue(frontMatter: FrontMatterData): Issue {
  const { id, title, status, priority, labels, created_at, updated_at } =
    frontMatter;

  if (typeof id !== "string" || !validateUUID(id)) {
    throw new Error("Invalid issue id");
  }

  if (typeof title !== "string" || !validateTitle(title)) {
    throw new Error("Invalid issue title");
  }

  if (typeof status !== "string" || !validateStatus(status)) {
    throw new Error("Invalid issue status");
  }

  if (
    priority !== undefined &&
    (typeof priority !== "string" || !validatePriority(priority))
  ) {
    throw new Error("Invalid issue priority");
  }

  if (!validateLabels(labels)) {
    throw new Error("Invalid issue labels");
  }

  if (typeof created_at !== "string" || typeof updated_at !== "string") {
    throw new Error("Invalid issue timestamps");
  }

  return {
    id,
    title,
    status,
    priority,
    labels,
    created_at,
    updated_at,
  };
}
