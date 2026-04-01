import { afterEach, expect, test } from "bun:test";
import { DEFAULT_ISSUE_BODY } from "../skills/scripts/commands/new";
import type { Issue } from "../skills/scripts/types";
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

test("new command creates an issue file with generated metadata", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, [
    "new",
    "--title",
    "Fix login bug",
    "--status",
    "open",
    "--priority",
    "high",
    "--labels",
    "auth",
    "--labels",
    "bug",
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const payload = parseJsonOutput<{ success: boolean }>(result.stdout);
  expect(payload.success).toBe(true);

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].name).toStartWith("open_fix-login-bug_");
  expect(documents[0].frontMatter.title).toBe("Fix login bug");
  expect(documents[0].frontMatter.status).toBe("open");
  expect(documents[0].frontMatter.priority).toBe("high");
  expect(documents[0].frontMatter.labels).toEqual(["auth", "bug"]);
  expect(documents[0].body).toBe(DEFAULT_ISSUE_BODY);
});

test("new command writes an empty body when --blank-body is provided", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, [
    "new",
    "--title",
    "Blank body issue",
    "--status",
    "open",
    "--blank-body",
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].frontMatter.title).toBe("Blank body issue");
  expect(documents[0].body).toBe("");
});

test("list command returns empty output for an empty workspace", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, ["list"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
});

test("list command sorts issues and applies status and priority filters", async () => {
  const workspace = await makeWorkspace();

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Older issue",
    status: "open",
    priority: "low",
    labels: ["docs"],
    created_at: "2026-03-28T09:00:00Z",
    updated_at: "2026-03-28T09:00:00Z",
  });

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Newer issue",
    status: "working",
    priority: "high",
    labels: ["auth", "bug"],
    created_at: "2026-04-01T14:30:00Z",
    updated_at: "2026-04-01T14:30:00Z",
  });

  const listResult = await runCli(workspace, ["list"]);
  expect(listResult.exitCode).toBe(0);
  expect(listResult.stdout).toBe(
    "[working] Newer issue (high) #auth #bug (2026-04-01)\n[open] Older issue (low) #docs (2026-03-28)",
  );

  const statusResult = await runCli(workspace, ["list", "--status", "working"]);
  expect(statusResult.stdout).toBe(
    "[working] Newer issue (high) #auth #bug (2026-04-01)",
  );

  const priorityResult = await runCli(workspace, ["list", "--priority", "low"]);
  expect(priorityResult.stdout).toBe("[open] Older issue (low) #docs (2026-03-28)");
});

test("modify-metadata updates front matter, preserves body, and renames the file", async () => {
  const workspace = await makeWorkspace();
  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Fix login bug",
    status: "open",
    priority: "high",
    labels: ["auth"],
    created_at: "2026-04-01T14:30:00Z",
    updated_at: "2026-04-01T14:30:00Z",
  };

  await seedIssue(workspace, issue, "Keep this body intact.\n");

  const result = await runCli(workspace, [
    "modify-metadata",
    "--id",
    issue.id,
    "--title",
    "Fix login bug now",
    "--status",
    "closed",
    "--priority",
    "low",
    "--labels",
    "bug",
    "--labels",
    "confirmed",
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const payload = parseJsonOutput<{ success: boolean }>(result.stdout);
  expect(payload.success).toBe(true);

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].name).toBe("closed_fix-login-bug-now_202604011430.md");
  expect(documents[0].frontMatter.title).toBe("Fix login bug now");
  expect(documents[0].frontMatter.status).toBe("closed");
  expect(documents[0].frontMatter.priority).toBe("low");
  expect(documents[0].frontMatter.labels).toEqual(["bug", "confirmed"]);
  expect(documents[0].frontMatter.updated_at).not.toBe(issue.updated_at);
  expect(documents[0].body).toBe("Keep this body intact.\n");
});

test("touch updates only updated_at and preserves body and file path", async () => {
  const workspace = await makeWorkspace();
  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440005",
    title: "Touch me",
    status: "open",
    priority: "medium",
    labels: ["docs"],
    created_at: "2026-03-28T09:00:00Z",
    updated_at: "2026-03-28T09:00:00Z",
  };

  await seedIssue(workspace, issue, "Body stays intact.\n");

  const result = await runCli(workspace, ["touch", "--id", issue.id]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const payload = parseJsonOutput<{ success: boolean }>(result.stdout);
  expect(payload.success).toBe(true);

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].name).toBe("open_touch-me_202603280900.md");
  expect(documents[0].frontMatter.created_at).toBe(issue.created_at);
  expect(documents[0].frontMatter.updated_at).not.toBe(issue.updated_at);
  expect(documents[0].frontMatter.title).toBe(issue.title);
  expect(documents[0].frontMatter.status).toBe(issue.status);
  expect(documents[0].frontMatter.priority).toBe(issue.priority);
  expect(documents[0].frontMatter.labels).toEqual(issue.labels);
  expect(documents[0].body).toBe("Body stays intact.\n");
});
