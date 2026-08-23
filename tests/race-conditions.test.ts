import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import * as fs from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Issue } from "../src/types";
import { parseFrontMatter } from "../src/utils/markdown";
import * as fileUtils from "../src/utils/file";
import { createWorkspace, destroyWorkspace, seedIssue } from "./setup";

const workspaces: string[] = [];
let spies: ReturnType<typeof spyOn>[] = [];

afterEach(async () => {
  for (const s of spies.splice(0)) s.mockRestore();
  mock.restore();
  await Promise.all(workspaces.splice(0).map((workspace) => destroyWorkspace(workspace)));
});

beforeEach(() => {
  mock.restore();
});

test("findIssueById skips files that disappear after scan and still returns the target issue", async () => {
  const workspace = await makeWorkspace();
  const issueDir = join(workspace, ".issues");
  const archivedIssue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440701",
    title: "Already archived elsewhere",
    status: "closed",
    labels: ["BUG"],
    created_at: "2026-04-05T00:00:00Z",
    updated_at: "2026-04-05T00:00:00Z",
  };
  const targetIssue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440702",
    title: "Archive target",
    status: "closed",
    labels: ["BUG"],
    created_at: "2026-04-05T00:01:00Z",
    updated_at: "2026-04-05T00:01:00Z",
  };

  const disappearedPath = await seedIssue(workspace, archivedIssue, "Moved away.\n");
  const targetPath = await seedIssue(workspace, targetIssue, "Still here.\n");

  const listSpy = spyOn(fileUtils, "listIssueFiles").mockResolvedValue([
    disappearedPath,
    targetPath,
  ]);
  const readSpy = spyOn(fileUtils, "readMarkdownFile").mockImplementation(async (filePath: string) => {
    if (filePath === disappearedPath) {
      const error = new Error(`ENOENT: no such file or directory, open '${disappearedPath}'`) as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    }
    return parseFrontMatter(await readFile(filePath, "utf8"));
  });
  spies.push(listSpy, readSpy as unknown as ReturnType<typeof spyOn>);

  const { findIssueById } = await import("../src/utils/issue");
  const locatedIssue = await findIssueById(issueDir, targetIssue.id);

  expect(locatedIssue).not.toBeNull();
  expect(locatedIssue?.issue.id).toBe(targetIssue.id);
  expect(locatedIssue?.body).toBe("Still here.\n");
});

test("listIssueFiles returns empty when directory is removed concurrently", async () => {
  const workspace = await makeWorkspace();
  const issueDir = join(workspace, ".issues");
  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440703",
    title: "Ephemeral",
    status: "open",
    labels: [],
    created_at: "2026-04-05T00:02:00Z",
    updated_at: "2026-04-05T00:02:00Z",
  });

  const readdirSpy = spyOn(fs, "readdir").mockImplementation(async () => {
    const err = new Error("ENOENT: no such file or directory") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    throw err;
  });
  spies.push(readdirSpy as unknown as ReturnType<typeof spyOn>);

  const { listIssueFiles } = await import("../src/utils/file");
  const files = await listIssueFiles(issueDir);
  expect(files).toEqual([]);
});

async function makeWorkspace(): Promise<string> {
  const workspace = await createWorkspace();
  workspaces.push(workspace);
  return workspace;
}
