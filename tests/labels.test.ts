import { afterEach, expect, test } from "bun:test";
import type { Issue } from "../src/types";
import {
  createWorkspace,
  destroyWorkspace,
  parseJsonOutput,
  readIssueDocuments,
  runCli,
  seedIssue,
  seedLabelRegistry,
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

test("labels command lists registry labels in sorted order", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["bug", "Auth", "OPS"]);

  const result = await runCli(workspace, ["labels"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe("AUTH\nBUG\nOPS");
});

test("labels sync normalizes issue labels and writes the registry", async () => {
  const workspace = await makeWorkspace();

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440300",
    title: "Mixed labels",
    status: "open",
    labels: ["auth", "Bug", "auth"],
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  });

  const result = await runCli(workspace, ["labels", "sync"]);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe("AUTH\nBUG");

  const documents = await readIssueDocuments(workspace);
  expect(documents[0].frontMatter.labels).toEqual(["AUTH", "BUG"]);
  expect(documents[0].frontMatter.updated_at).toBe("2026-04-01T09:00:00Z");
});

test("labels sync also normalizes existing registry entries", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["bug", "Auth"]);

  const result = await runCli(workspace, ["labels", "sync"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe("AUTH\nBUG");
});

test("labels remove fails when the label is still referenced unless forced", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["AUTH", "BUG"]);

  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440301",
    title: "Referenced label",
    status: "open",
    labels: ["BUG"],
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  };
  await seedIssue(workspace, issue);

  const rejected = await runCli(workspace, ["labels", "remove", "--label", "bug"]);
  expect(rejected.exitCode).toBe(1);
  expect(rejected.stderr).toContain("Label is still referenced by issues: BUG");

  const accepted = await runCli(workspace, [
    "labels",
    "remove",
    "--label",
    "bug",
    "--force",
  ]);
  expect(accepted.exitCode).toBe(0);
  expect(accepted.stdout).toBe("AUTH");

  const documents = await readIssueDocuments(workspace);
  expect(documents[0].frontMatter.labels).toEqual([]);
  expect(documents[0].frontMatter.updated_at).toBe(issue.updated_at);
});

test("labels rename updates issues and can merge into an existing target with --force", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["AUTH", "BUG", "OPS"]);

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440302",
    title: "Rename source",
    status: "open",
    labels: ["BUG", "OPS"],
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  });

  const rejected = await runCli(workspace, [
    "labels",
    "rename",
    "--from",
    "bug",
    "--to",
    "ops",
  ]);
  expect(rejected.exitCode).toBe(1);
  expect(rejected.stderr).toContain("Label already exists: OPS");

  const accepted = await runCli(workspace, [
    "labels",
    "rename",
    "--from",
    "bug",
    "--to",
    "ops",
    "--force",
  ]);
  expect(accepted.exitCode).toBe(0);
  expect(accepted.stdout).toBe("AUTH\nOPS");

  const documents = await readIssueDocuments(workspace);
  expect(documents[0].frontMatter.labels).toEqual(["OPS"]);
});
