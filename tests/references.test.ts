import { afterEach, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import type { Issue } from "../src/types";
import {
  createWorkspace,
  destroyWorkspace,
  parseJsonOutput,
  readIssueDocuments,
  runCli,
  seedIssue,
} from "./setup";

const workspaces: string[] = [];

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((workspace) => destroyWorkspace(workspace)));
});

async function makeWorkspace(): Promise<string> {
  const workspace = await createWorkspace();
  workspaces.push(workspace);
  return workspace;
}

test("modify-metadata status rename updates Markdown links and skips excluded targets", async () => {
  const workspace = await makeWorkspace();
  const target: Issue = {
    id: "550e8400-e29b-41d4-a716-446655441001",
    title: "Target issue",
    status: "open",
    labels: [],
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  };
  const referrer: Issue = {
    id: "550e8400-e29b-41d4-a716-446655441002",
    title: "Referrer issue",
    status: "open",
    labels: [],
    created_at: "2026-04-01T11:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
  };

  await seedIssue(workspace, target, "Target body.\n");
  await seedIssue(
    workspace,
    referrer,
    [
      "[target](open_target-issue_202604011000.md?plain=1#notes)",
      '[target title](open_target-issue_202604011000.md "Target issue")',
      "[target single title](open_target-issue_202604011000.md 'Target issue')",
      "[target paren title](open_target-issue_202604011000.md (Target issue))",
      "[target angle title](<open_target-issue_202604011000.md> \"Target issue\")",
      "[web](https://example.com/open_target-issue_202604011000.md)",
      "[anchor](#open_target-issue_202604011000)",
      "[root](/open_target-issue_202604011000.md)",
      "[file](file:///tmp/open_target-issue_202604011000.md)",
      "[image](./diagram.png)",
      "",
    ].join("\n"),
  );

  const result = await runCli(workspace, [
    "modify-metadata",
    "--id",
    target.id,
    "--status",
    "closed",
  ]);

  expect(result.exitCode).toBe(0);
  const payload = parseJsonOutput<{
    data: { references: { filesChanged: number; referencesChanged: number } };
  }>(result.stdout);
  expect(payload.data.references).toEqual({
    filesChanged: 1,
    referencesChanged: 5,
  });

  const documents = await readIssueDocuments(workspace);
  const referrerDocument = documents.find(
    (document) => document.frontMatter.id === referrer.id,
  );
  expect(referrerDocument?.frontMatter.updated_at).toBe(referrer.updated_at);
  expect(referrerDocument?.body).toBe(
    [
      "[target](closed_target-issue_202604011000.md?plain=1#notes)",
      '[target title](closed_target-issue_202604011000.md "Target issue")',
      "[target single title](closed_target-issue_202604011000.md 'Target issue')",
      "[target paren title](closed_target-issue_202604011000.md (Target issue))",
      "[target angle title](<closed_target-issue_202604011000.md> \"Target issue\")",
      "[web](https://example.com/open_target-issue_202604011000.md)",
      "[anchor](#open_target-issue_202604011000)",
      "[root](/open_target-issue_202604011000.md)",
      "[file](file:///tmp/open_target-issue_202604011000.md)",
      "[image](./diagram.png)",
      "",
    ].join("\n"),
  );
});

test("modify-metadata title rename updates Obsidian links while preserving alias and fragments", async () => {
  const workspace = await makeWorkspace();
  const target: Issue = {
    id: "550e8400-e29b-41d4-a716-446655441003",
    title: "Old title",
    status: "open",
    labels: [],
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  };
  const referrer: Issue = {
    id: "550e8400-e29b-41d4-a716-446655441004",
    title: "Nested referrer",
    status: "open",
    labels: [],
    created_at: "2026-04-01T11:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
  };

  await seedIssue(workspace, target, "Target body.\n", ".issues/team");
  await seedIssue(
    workspace,
    referrer,
    [
      "[[../team/open_old-title_202604011000#Notes|Old title]]",
      "[[../team/open_old-title_202604011000#^block-id]]",
      "[[open_old-title_202604011000]]",
      "",
    ].join("\n"),
    ".issues/notes",
  );

  const result = await runCli(workspace, [
    "modify-metadata",
    "--id",
    target.id,
    "--title",
    "New title",
  ]);

  expect(result.exitCode).toBe(0);
  const payload = parseJsonOutput<{
    data: { references: { filesChanged: number; referencesChanged: number } };
  }>(result.stdout);
  expect(payload.data.references).toEqual({
    filesChanged: 1,
    referencesChanged: 2,
  });

  const documents = await readIssueDocuments(workspace);
  const referrerDocument = documents.find(
    (document) => document.frontMatter.id === referrer.id,
  );
  expect(referrerDocument?.body).toBe(
    [
      "[[../team/open_new-title_202604011000#Notes|Old title]]",
      "[[../team/open_new-title_202604011000#^block-id]]",
      "[[open_old-title_202604011000]]",
      "",
    ].join("\n"),
  );
});

test("archive updates nested relative links and moved-file self references", async () => {
  const workspace = await makeWorkspace();
  const target: Issue = {
    id: "550e8400-e29b-41d4-a716-446655441005",
    title: "Nested archive",
    status: "working",
    labels: [],
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  };
  const referrer: Issue = {
    id: "550e8400-e29b-41d4-a716-446655441006",
    title: "Frontend referrer",
    status: "open",
    labels: [],
    created_at: "2026-04-01T11:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
  };

  await seedIssue(
    workspace,
    target,
    [
      "[self](working_nested-archive_202604011000.md)",
      "[[working_nested-archive_202604011000|self]]",
      "[frontend](../frontend/open_frontend-referrer_202604011100.md?view=1#notes)",
      "[[../frontend/open_frontend-referrer_202604011100#Notes|Frontend]]",
      "",
    ].join("\n"),
    ".issues/team/backend",
  );
  await seedIssue(
    workspace,
    referrer,
    "[target](../backend/working_nested-archive_202604011000.md)\n",
    ".issues/team/frontend",
  );

  const result = await runCli(workspace, ["archive", "--id", target.id]);

  expect(result.exitCode).toBe(0);
  const payload = parseJsonOutput<{
    data: { references: { filesChanged: number; referencesChanged: number } };
  }>(result.stdout);
  expect(payload.data.references).toEqual({
    filesChanged: 2,
    referencesChanged: 5,
  });

  const documents = await readIssueDocuments(workspace);
  const targetDocument = documents.find(
    (document) => document.frontMatter.id === target.id,
  );
  const referrerDocument = documents.find(
    (document) => document.frontMatter.id === referrer.id,
  );

  expect(targetDocument?.relativePath).toBe(
    "archive/team/backend/closed_nested-archive_202604011000.md",
  );
  expect(targetDocument?.body).toBe(
    [
      "[self](closed_nested-archive_202604011000.md)",
      "[[closed_nested-archive_202604011000|self]]",
      "[frontend](../../../team/frontend/open_frontend-referrer_202604011100.md?view=1#notes)",
      "[[../../../team/frontend/open_frontend-referrer_202604011100#Notes|Frontend]]",
      "",
    ].join("\n"),
  );
  expect(referrerDocument?.body).toBe(
    "[target](../../archive/team/backend/closed_nested-archive_202604011000.md)\n",
  );
});

test("rename-references supports dry-run, missing source paths, and URL-encoded Markdown destinations", async () => {
  const workspace = await makeWorkspace();
  const referrer: Issue = {
    id: "550e8400-e29b-41d4-a716-446655441007",
    title: "Manual referrer",
    status: "open",
    labels: [],
    created_at: "2026-04-01T11:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
  };
  const filePath = await seedIssue(
    workspace,
    referrer,
    "[missing](missing/old%20name.md#notes)\n",
  );

  const dryRun = await runCli(workspace, [
    "rename-references",
    "--from",
    "missing/old name",
    "--to",
    "archive/missing/new name",
    "--dry-run",
  ]);
  expect(dryRun.exitCode).toBe(0);

  const dryRunPayload = parseJsonOutput<{
    data: { filesChanged: number; referencesChanged: number };
  }>(dryRun.stdout);
  expect(dryRunPayload.data.filesChanged).toBe(1);
  expect(dryRunPayload.data.referencesChanged).toBe(1);
  expect(await readFile(filePath, "utf8")).toContain(
    "[missing](missing/old%20name.md#notes)",
  );

  const applied = await runCli(workspace, [
    "rename-references",
    "--from",
    "missing/old name",
    "--to",
    "archive/missing/new name",
  ]);
  expect(applied.exitCode).toBe(0);
  expect(await readFile(filePath, "utf8")).toContain(
    "[missing](archive/missing/new%20name.md#notes)",
  );
});

test("rename-references rejects paths that escape the issue directory", async () => {
  const workspace = await makeWorkspace();
  const parentResult = await runCli(workspace, [
    "rename-references",
    "--from",
    "..",
    "--to",
    "archive/inside",
  ]);
  expect(parentResult.exitCode).toBe(1);
  expect(parentResult.stderr).toContain("Path escapes issue directory");

  const normalizedParentResult = await runCli(workspace, [
    "rename-references",
    "--from",
    "a/../..",
    "--to",
    "archive/inside",
  ]);
  expect(normalizedParentResult.exitCode).toBe(1);
  expect(normalizedParentResult.stderr).toContain("Path escapes issue directory");

  const outsideResult = await runCli(workspace, [
    "rename-references",
    "--from",
    "../outside",
    "--to",
    "archive/inside",
  ]);

  expect(outsideResult.exitCode).toBe(1);
  expect(outsideResult.stderr).toContain("Path escapes issue directory");
});
