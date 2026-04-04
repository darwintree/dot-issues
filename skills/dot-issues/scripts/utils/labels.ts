import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { LabelRegistry } from "../types";
import { normalizeLabel, normalizeLabels } from "./validate";

export const LABEL_REGISTRY_FILENAME = "labels.json";

export function getLabelRegistryPath(issueDir: string): string {
  return join(issueDir, LABEL_REGISTRY_FILENAME);
}

export async function readLabelRegistry(issueDir: string): Promise<string[]> {
  const filePath = getLabelRegistryPath(issueDir);

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as unknown;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("labels" in parsed) ||
      !Array.isArray(parsed.labels) ||
      parsed.labels.some((label) => typeof label !== "string")
    ) {
      throw new Error("Invalid labels registry");
    }

    return normalizeLabels(parsed.labels);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function writeLabelRegistry(
  issueDir: string,
  labels: string[],
): Promise<string[]> {
  const normalizedLabels = [...normalizeLabels(labels)].sort((left, right) =>
    left.localeCompare(right),
  );
  const payload: LabelRegistry = { labels: normalizedLabels };
  const filePath = getLabelRegistryPath(issueDir);

  await mkdir(issueDir, { recursive: true });
  await writeFile(`${filePath}`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return normalizedLabels;
}

export async function addLabelsToRegistry(
  issueDir: string,
  labels: string[],
): Promise<string[]> {
  const currentLabels = await readLabelRegistry(issueDir);
  const nextLabels = buildUpdatedRegistryLabels(currentLabels, labels);

  if (nextLabels.length === currentLabels.length) {
    return [...currentLabels].sort((left, right) => left.localeCompare(right));
  }

  return writeLabelRegistry(issueDir, nextLabels);
}

export function buildUpdatedRegistryLabels(
  currentLabels: string[],
  nextLabels: string[],
): string[] {
  return normalizeLabels([...currentLabels, ...nextLabels]);
}

export async function assertLabelsRegistered(
  issueDir: string,
  labels: string[],
): Promise<void> {
  const normalizedLabels = normalizeLabels(labels);
  if (normalizedLabels.length === 0) {
    return;
  }

  const registry = new Set(await readLabelRegistry(issueDir));
  const missingLabel = normalizedLabels.find((label) => !registry.has(label));
  if (missingLabel) {
    throw new Error(`Label is not registered: ${missingLabel}`);
  }
}

export function renameRegistryLabel(
  labels: string[],
  fromLabel: string,
  toLabel: string,
): string[] {
  const normalizedFrom = normalizeLabel(fromLabel);
  const normalizedTo = normalizeLabel(toLabel);
  return normalizeLabels(
    labels.map((label) => (normalizeLabel(label) === normalizedFrom ? normalizedTo : label)),
  );
}
