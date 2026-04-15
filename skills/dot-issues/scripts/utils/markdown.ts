import type { FrontMatterData, FrontMatterValue, IssueStatus } from "../types";

const FRONT_MATTER_FIELDS = [
  "id",
  "title",
  "status",
  "priority",
  "labels",
  "created_at",
  "updated_at",
] as const;

export function parseFrontMatter(content: string): {
  frontMatter: FrontMatterData;
  body: string;
} {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines[0] !== "---") {
    throw new Error("Missing front matter start delimiter");
  }

  const frontMatter: FrontMatterData = {};
  let index = 1;

  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "---") {
      break;
    }

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      throw new Error(`Invalid front matter line: ${line}`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    frontMatter[key] = parseFrontMatterValue(rawValue);
  }

  if (index >= lines.length) {
    throw new Error("Missing front matter end delimiter");
  }

  return {
    frontMatter,
    body: lines.slice(index + 1).join("\n"),
  };
}

export function generateFrontMatter(data: FrontMatterData): string {
  const lines = ["---", "# This section is managed by the CLI. Do not edit manually."];

  for (const key of FRONT_MATTER_FIELDS) {
    const value = data[key];
    if (value === undefined) {
      continue;
    }

    lines.push(`${key}: ${serializeFrontMatterValue(value)}`);
  }

  lines.push("---");
  return lines.join("\n");
}

export function generateMarkdownContent(
  frontMatter: FrontMatterData,
  body: string,
): string {
  return `${generateFrontMatter(frontMatter)}\n${body}`;
}

export function generateFileName(
  status: IssueStatus,
  title: string,
  createdAt: Date,
): string {
  return `${status}_${titleToSlug(title)}_${formatFileTimestamp(createdAt)}.md`;
}

export function titleToSlug(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "issue";
}

export function toIsoMinuteString(date: Date): string {
  const normalized = new Date(date);
  normalized.setUTCSeconds(0, 0);
  return normalized.toISOString().replace(".000Z", "Z");
}

function parseFrontMatterValue(rawValue: string): FrontMatterValue {
  if (rawValue.startsWith("[")) {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new Error("Only string arrays are supported in front matter");
    }

    return parsed;
  }

  if (rawValue.startsWith('"')) {
    const parsed = JSON.parse(rawValue) as unknown;
    if (typeof parsed !== "string") {
      throw new Error("Invalid front matter string value");
    }

    return parsed;
  }

  return rawValue;
}

function serializeFrontMatterValue(value: FrontMatterValue): string {
  return Array.isArray(value)
    ? `[${value.map((item) => JSON.stringify(item)).join(", ")}]`
    : JSON.stringify(value);
}

function formatFileTimestamp(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}`;
}
