import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { FrontMatterData } from "../types";
import { generateMarkdownContent, parseFrontMatter } from "./markdown";

export const ARCHIVE_DIRNAME = "archive";

export function isEnoentError(error: unknown): error is NodeJS.ErrnoException {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

export async function readMarkdownFile(filePath: string): Promise<{
  frontMatter: FrontMatterData;
  body: string;
}> {
  const content = await readFile(filePath, "utf8");
  return parseFrontMatter(content);
}

export async function writeMarkdownFile(
  filePath: string,
  frontMatter: FrontMatterData,
  body: string,
): Promise<void> {
  await writeFile(filePath, generateMarkdownContent(frontMatter, body), "utf8");
}

export async function listIssueFiles(
  dirPath: string,
  options?: { includeArchived?: boolean },
): Promise<string[]> {
  try {
    return (await collectIssueFiles(dirPath, options?.includeArchived ?? true)).sort();
  } catch (error) {
    if (isEnoentError(error)) {
      return [];
    }

    throw error;
  }
}

export async function ensureIssuesDir(issueDir: string): Promise<void> {
  await mkdir(issueDir, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveIssueSubdir(issueDir: string, subdir?: string): string {
  if (subdir === undefined) {
    return issueDir;
  }

  const normalizedSubdir = subdir.trim();
  if (!normalizedSubdir || isAbsolute(normalizedSubdir)) {
    throw new Error("Invalid --subdir");
  }

  const targetDir = resolve(issueDir, normalizedSubdir);
  const relativePath = relative(issueDir, targetDir);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Invalid --subdir");
  }

  return targetDir;
}

async function collectIssueFiles(
  dirPath: string,
  includeArchived: boolean,
  isRoot = true,
): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (isEnoentError(error)) {
      return [];
    }

    throw error;
  }
  const filePaths = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(dirPath, entry.name));
  const nestedPaths = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isDirectory() &&
          (includeArchived || !isRoot || entry.name !== ARCHIVE_DIRNAME),
      )
      .map((entry) => collectIssueFiles(join(dirPath, entry.name), includeArchived, false)),
  );

  return [...filePaths, ...nestedPaths.flat()];
}
