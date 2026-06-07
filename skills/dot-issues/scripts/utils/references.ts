import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute as isAbsoluteFsPath, relative as fsRelative } from "node:path";
import { posix } from "node:path";
import { listIssueFiles } from "./file";

export interface ReferenceRenameChange {
  path: string;
  referencesChanged: number;
}

export interface ReferenceRenameSummary {
  from: string;
  to: string;
  filesChanged: number;
  referencesChanged: number;
  changes: ReferenceRenameChange[];
}

export interface ReferenceRenameCounts {
  filesChanged: number;
  referencesChanged: number;
}

export interface ReferenceRenamePlan extends ReferenceRenameSummary {
  updates: ReferenceFileUpdate[];
}

export interface AppliedReferenceUpdate {
  path: string;
  originalContent: string;
}

interface ReferenceFileUpdate {
  writePath: string;
  originalContent: string;
  nextContent: string;
  nextBody: string;
  referencesChanged: number;
}

interface RewriteBodyOptions {
  fromRelativePath: string;
  toRelativePath: string;
  matchContextRelativePath: string;
  writeContextRelativePath: string;
  rebaseIssueRelativePaths?: Set<string>;
}

interface MarkdownLink {
  raw: string;
  label: string;
  rawDestination: string;
  endIndex: number;
}

const OBSIDIAN_LINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;
const SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;

export function normalizeIssueRelativePath(input: string): string {
  const rawPath = input.trim();
  if (!rawPath) {
    throw new Error("Path must be a non-empty relative path");
  }

  if (
    isAbsoluteFsPath(rawPath) ||
    posix.isAbsolute(rawPath) ||
    /^[A-Za-z]:[\\/]/.test(rawPath)
  ) {
    throw new Error(`Path must be relative: ${rawPath}`);
  }

  const slashPath = rawPath.replace(/\\/g, "/");
  let normalizedPath = posix.normalize(slashPath);
  if (pathEscapesIssueDir(normalizedPath)) {
    throw new Error(`Path escapes issue directory: ${rawPath}`);
  }

  normalizedPath = normalizedPath.replace(/^\.\//, "");
  const extension = posix.extname(normalizedPath);
  if (extension && extension !== ".md") {
    throw new Error(`Path must target a Markdown file: ${rawPath}`);
  }

  return extension === ".md" ? normalizedPath : `${normalizedPath}.md`;
}

export function toIssueRelativePath(issueDir: string, filePath: string): string {
  return fsRelative(issueDir, filePath).replace(/[\\/]+/gu, "/");
}

export async function buildReferenceRenamePlan(
  issueDir: string,
  fromRelativePath: string,
  toRelativePath: string,
  movedFilePath?: string,
  movedNextPath?: string,
): Promise<ReferenceRenamePlan> {
  const from = normalizeIssueRelativePath(fromRelativePath);
  const to = normalizeIssueRelativePath(toRelativePath);
  const filePaths = await listIssueFiles(issueDir, { includeArchived: true });
  const issueRelativePaths = new Set(
    filePaths.map((filePath) => toIssueRelativePath(issueDir, filePath)),
  );
  const updates: ReferenceFileUpdate[] = [];

  for (const filePath of filePaths) {
    const relativePath = toIssueRelativePath(issueDir, filePath);
    let writePath = filePath;
    let writeRelativePath = relativePath;
    if (movedFilePath === filePath && movedNextPath) {
      writePath = movedNextPath;
      writeRelativePath = toIssueRelativePath(issueDir, movedNextPath);
    }

    const originalContent = await readFile(filePath, "utf8");
    const document = splitMarkdownDocument(originalContent);
    const rewrittenBody = rewriteReferencesInBody(document.body, {
      fromRelativePath: from,
      toRelativePath: to,
      matchContextRelativePath: relativePath,
      writeContextRelativePath: writeRelativePath,
      rebaseIssueRelativePaths:
        movedFilePath === filePath ? issueRelativePaths : undefined,
    });

    if (rewrittenBody.referencesChanged === 0) {
      continue;
    }

    updates.push({
      writePath,
      originalContent,
      nextContent: `${document.frontMatterContent}${rewrittenBody.body}`,
      nextBody: rewrittenBody.body,
      referencesChanged: rewrittenBody.referencesChanged,
    });
  }

  const changes = updates.map((update) => ({
    path: update.writePath,
    referencesChanged: update.referencesChanged,
  }));
  const referencesChanged = changes.reduce(
    (total, change) => total + change.referencesChanged,
    0,
  );

  return {
    from,
    to,
    filesChanged: changes.length,
    referencesChanged,
    changes,
    updates,
  };
}

export async function applyReferenceRenamePlan(
  plan: ReferenceRenamePlan,
  options?: { skipPaths?: Set<string> },
): Promise<AppliedReferenceUpdate[]> {
  const applied: AppliedReferenceUpdate[] = [];

  try {
    for (const update of plan.updates) {
      if (options?.skipPaths?.has(update.writePath)) {
        continue;
      }

      await writeFile(update.writePath, update.nextContent, "utf8");
      applied.push({
        path: update.writePath,
        originalContent: update.originalContent,
      });
    }
  } catch (error) {
    await restoreAppliedReferenceUpdates(applied);
    throw error;
  }

  return applied;
}

export async function restoreAppliedReferenceUpdates(
  applied: AppliedReferenceUpdate[],
): Promise<void> {
  for (const update of [...applied].reverse()) {
    await writeFile(update.path, update.originalContent, "utf8");
  }
}

export function getPlannedBodyForPath(
  plan: ReferenceRenamePlan,
  filePath: string,
  fallbackBody: string,
): string {
  const update = plan.updates.find((candidate) => candidate.writePath === filePath);
  return update?.nextBody ?? fallbackBody;
}

export function summarizeReferenceRenamePlan(
  plan: ReferenceRenamePlan,
): ReferenceRenameSummary {
  return {
    from: plan.from,
    to: plan.to,
    filesChanged: plan.filesChanged,
    referencesChanged: plan.referencesChanged,
    changes: plan.changes,
  };
}

export function summarizeReferenceRenameCounts(
  plan: ReferenceRenamePlan | undefined,
): ReferenceRenameCounts {
  return {
    filesChanged: plan?.filesChanged ?? 0,
    referencesChanged: plan?.referencesChanged ?? 0,
  };
}

function rewriteReferencesInBody(
  body: string,
  options: RewriteBodyOptions,
): { body: string; referencesChanged: number } {
  const markdownRewrite = rewriteMarkdownLinks(body, options);
  let referencesChanged = markdownRewrite.referencesChanged;

  const withObsidianLinks = markdownRewrite.body.replace(
    OBSIDIAN_LINK_PATTERN,
    (match, rawTarget: string) => {
      const target = parseObsidianTarget(rawTarget, options);
      if (!target) {
        return match;
      }

      const resolvedPath =
        target.isBarePath && target.path === posix.basename(options.fromRelativePath)
          ? options.fromRelativePath
          : resolveLinkedIssuePath(target.path, options.matchContextRelativePath);
      const targetPath = getReplacementTargetPath(resolvedPath, options);
      if (!targetPath) {
        return match;
      }

      const replacementPath = formatRelativeLinkPath(
        targetPath,
        options.writeContextRelativePath,
        {
          keepMarkdownExtension: target.keepMarkdownExtension,
          urlEncode: false,
        },
      );
      const nextMatch = `[[${replacementPath}${target.fragment}${target.alias}]]`;
      if (nextMatch === match) {
        return match;
      }

      referencesChanged += 1;
      return nextMatch;
    },
  );

  return {
    body: withObsidianLinks,
    referencesChanged,
  };
}

function rewriteMarkdownLinks(
  body: string,
  options: RewriteBodyOptions,
): { body: string; referencesChanged: number } {
  let cursor = 0;
  let referencesChanged = 0;
  let rewrittenBody = "";

  while (cursor < body.length) {
    const linkStart = body.indexOf("[", cursor);
    if (linkStart < 0) {
      rewrittenBody += body.slice(cursor);
      break;
    }

    rewrittenBody += body.slice(cursor, linkStart);
    const parsedLink = parseMarkdownLinkAt(body, linkStart);
    if (!parsedLink) {
      rewrittenBody += body[linkStart];
      cursor = linkStart + 1;
      continue;
    }

    const nextLink = rewriteMarkdownLink(parsedLink, options);
    if (nextLink !== parsedLink.raw) {
      referencesChanged += 1;
    }

    rewrittenBody += nextLink;
    cursor = parsedLink.endIndex;
  }

  return {
    body: rewrittenBody,
    referencesChanged,
  };
}

function rewriteMarkdownLink(
  link: MarkdownLink,
  options: RewriteBodyOptions,
): string {
  const destination = parseMarkdownDestination(link.rawDestination);
  if (!destination) {
    return link.raw;
  }

  const resolvedPath = resolveLinkedIssuePath(
    destination.path,
    options.matchContextRelativePath,
  );
  const targetPath = getReplacementTargetPath(resolvedPath, options);
  if (!targetPath) {
    return link.raw;
  }

  const replacementPath = formatRelativeLinkPath(
    targetPath,
    options.writeContextRelativePath,
    {
      keepMarkdownExtension: destination.keepMarkdownExtension,
      urlEncode: destination.urlEncode,
    },
  );
  const nextDestination = `${destination.open}${replacementPath}${destination.pathSuffix}${destination.close}${destination.titleSuffix}`;
  return `[${link.label}](${nextDestination})`;
}

function parseMarkdownLinkAt(body: string, startIndex: number): MarkdownLink | null {
  if (body[startIndex - 1] === "!") {
    return null;
  }

  const labelEndIndex = findMarkdownLabelEnd(body, startIndex + 1);
  if (labelEndIndex < 0 || body[labelEndIndex + 1] !== "(") {
    return null;
  }

  const destinationStartIndex = labelEndIndex + 2;
  const destinationEndIndex = findMarkdownDestinationEnd(
    body,
    destinationStartIndex,
  );
  if (destinationEndIndex < 0) {
    return null;
  }

  return {
    raw: body.slice(startIndex, destinationEndIndex + 1),
    label: body.slice(startIndex + 1, labelEndIndex),
    rawDestination: body.slice(destinationStartIndex, destinationEndIndex),
    endIndex: destinationEndIndex + 1,
  };
}

function findMarkdownLabelEnd(body: string, startIndex: number): number {
  for (let index = startIndex; index < body.length; index += 1) {
    const char = body[index];
    if (char === "\n") {
      return -1;
    }

    if (char === "\\") {
      index += 1;
      continue;
    }

    if (char === "]") {
      return index;
    }
  }

  return -1;
}

function findMarkdownDestinationEnd(body: string, startIndex: number): number {
  let depth = 1;
  let quote: string | undefined;
  let inAngleDestination = false;

  for (let index = startIndex; index < body.length; index += 1) {
    const char = body[index];
    if (char === "\n") {
      return -1;
    }

    if (char === "\\") {
      index += 1;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (inAngleDestination) {
      if (char === ">") {
        inAngleDestination = false;
      }
      continue;
    }

    if (char === "<") {
      inAngleDestination = true;
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === "(") {
      depth += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function getReplacementTargetPath(
  resolvedPath: string | null,
  options: RewriteBodyOptions,
): string | null {
  if (!resolvedPath) {
    return null;
  }

  if (resolvedPath === options.fromRelativePath) {
    return options.toRelativePath;
  }

  if (options.rebaseIssueRelativePaths?.has(resolvedPath)) {
    return resolvedPath;
  }

  return null;
}

function parseMarkdownDestination(rawDestination: string):
  | {
      path: string;
      pathSuffix: string;
      titleSuffix: string;
      open: string;
      close: string;
      keepMarkdownExtension: boolean;
      urlEncode: boolean;
    }
  | null {
  const parsedTarget = parseMarkdownDestinationTarget(rawDestination);
  if (!parsedTarget || parsedTarget.target.startsWith("#")) {
    return null;
  }

  const splitIndex = findFirstQueryOrFragmentIndex(parsedTarget.target);
  const encodedPath =
    splitIndex >= 0 ? parsedTarget.target.slice(0, splitIndex) : parsedTarget.target;
  const pathSuffix = splitIndex >= 0 ? parsedTarget.target.slice(splitIndex) : "";
  const path = safeDecodeUri(encodedPath);

  if (!path || path.startsWith("#") || hasPathScheme(path) || posix.isAbsolute(path)) {
    return null;
  }

  const normalizedPath = normalizeCandidateIssuePath(path);
  if (!normalizedPath) {
    return null;
  }

  return {
    path: normalizedPath.path,
    pathSuffix,
    titleSuffix: parsedTarget.suffix,
    open: parsedTarget.open,
    close: parsedTarget.close,
    keepMarkdownExtension: normalizedPath.keepMarkdownExtension,
    urlEncode: encodedPath !== path,
  };
}

function parseMarkdownDestinationTarget(rawDestination: string):
  | {
      target: string;
      suffix: string;
      open: string;
      close: string;
    }
  | null {
  const trimmedDestination = rawDestination.trim();
  if (!trimmedDestination) {
    return null;
  }

  if (trimmedDestination.startsWith("<")) {
    const closeIndex = findAngleDestinationEnd(trimmedDestination);
    if (closeIndex < 0) {
      return null;
    }

    return {
      target: trimmedDestination.slice(1, closeIndex),
      suffix: trimmedDestination.slice(closeIndex + 1),
      open: "<",
      close: ">",
    };
  }

  const separatorIndex = findDestinationTitleSeparator(trimmedDestination);
  if (separatorIndex < 0) {
    return {
      target: trimmedDestination,
      suffix: "",
      open: "",
      close: "",
    };
  }

  return {
    target: trimmedDestination.slice(0, separatorIndex),
    suffix: trimmedDestination.slice(separatorIndex),
    open: "",
    close: "",
  };
}

function findAngleDestinationEnd(destination: string): number {
  for (let index = 1; index < destination.length; index += 1) {
    const char = destination[index];
    if (char === "\\") {
      index += 1;
      continue;
    }

    if (char === ">") {
      return index;
    }
  }

  return -1;
}

function findDestinationTitleSeparator(destination: string): number {
  for (let index = 0; index < destination.length; index += 1) {
    if (/\s/u.test(destination[index])) {
      return index;
    }
  }

  return -1;
}

function parseObsidianTarget(rawTarget: string, options: RewriteBodyOptions):
  | {
      path: string;
      fragment: string;
      alias: string;
      keepMarkdownExtension: boolean;
      isBarePath: boolean;
    }
  | null {
  const aliasIndex = rawTarget.indexOf("|");
  const pathAndFragment = aliasIndex >= 0 ? rawTarget.slice(0, aliasIndex) : rawTarget;
  const alias = aliasIndex >= 0 ? rawTarget.slice(aliasIndex) : "";
  const fragmentIndex = pathAndFragment.indexOf("#");
  const rawPath =
    fragmentIndex >= 0 ? pathAndFragment.slice(0, fragmentIndex) : pathAndFragment;
  const fragment = fragmentIndex >= 0 ? pathAndFragment.slice(fragmentIndex) : "";

  if (rawPath.startsWith("#")) {
    return null;
  }

  if (hasPathScheme(rawPath) || posix.isAbsolute(rawPath)) {
    return null;
  }

  const normalizedPath = normalizeCandidateIssuePath(rawPath);
  if (!normalizedPath) {
    return null;
  }

  return {
    path: normalizedPath.path,
    fragment,
    alias,
    keepMarkdownExtension: normalizedPath.keepMarkdownExtension,
    isBarePath: !rawPath.includes("/"),
  };
}

function resolveLinkedIssuePath(
  linkPath: string,
  contextRelativePath: string,
): string | null {
  const contextDir = posix.dirname(contextRelativePath);
  const resolvedPath = posix.normalize(posix.join(contextDir, linkPath));
  if (resolvedPath === "." || resolvedPath.startsWith("../")) {
    return null;
  }

  return resolvedPath;
}

function formatRelativeLinkPath(
  targetRelativePath: string,
  contextRelativePath: string,
  options: { keepMarkdownExtension: boolean; urlEncode: boolean },
): string {
  const contextDir = posix.dirname(contextRelativePath);
  let relativePath = posix.relative(contextDir, targetRelativePath);
  if (!relativePath) {
    relativePath = posix.basename(targetRelativePath);
  }

  if (!options.keepMarkdownExtension) {
    relativePath = relativePath.replace(/\.md$/u, "");
  }

  return options.urlEncode ? encodeURI(relativePath) : relativePath;
}

function normalizeCandidateIssuePath(
  candidatePath: string,
): { path: string; keepMarkdownExtension: boolean } | null {
  const slashPath = candidatePath.replace(/\\/g, "/");
  const extension = posix.extname(slashPath);
  if (extension && extension !== ".md") {
    return null;
  }

  const keepMarkdownExtension = extension === ".md";
  const normalizedPath = posix.normalize(
    keepMarkdownExtension ? slashPath : `${slashPath}.md`,
  );
  if (normalizedPath === ".") {
    return null;
  }

  return {
    path: normalizedPath,
    keepMarkdownExtension,
  };
}

function findFirstQueryOrFragmentIndex(target: string): number {
  const queryIndex = target.indexOf("?");
  const fragmentIndex = target.indexOf("#");
  if (queryIndex < 0) {
    return fragmentIndex;
  }

  if (fragmentIndex < 0) {
    return queryIndex;
  }

  return Math.min(queryIndex, fragmentIndex);
}

function safeDecodeUri(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function hasPathScheme(path: string): boolean {
  return SCHEME_PATTERN.test(path);
}

function pathEscapesIssueDir(path: string): boolean {
  return path === "." || path === ".." || path.startsWith("../");
}

function splitMarkdownDocument(content: string): {
  frontMatterContent: string;
  body: string;
} {
  const endDelimiter = content.match(/\n---\r?\n/u);
  if (!content.startsWith("---") || !endDelimiter || endDelimiter.index === undefined) {
    return {
      frontMatterContent: "",
      body: content,
    };
  }

  const bodyStart = endDelimiter.index + endDelimiter[0].length;
  return {
    frontMatterContent: content.slice(0, bodyStart),
    body: content.slice(bodyStart),
  };
}
