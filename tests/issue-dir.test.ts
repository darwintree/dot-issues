import { afterEach, expect, test } from "bun:test";
import {
  createWorkspace,
  destroyWorkspace,
  parseJsonOutput,
  readIssueDocuments,
  runCli,
  seedLabelRegistry,
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

test("commands use a custom issue directory when --issue-dir is provided", async () => {
  const workspace = await makeWorkspace();
  const issueDir = "custom-issues";

  const createResult = await runCli(workspace, [
    "new",
    "--title",
    "Custom dir issue",
    "--status",
    "open",
    "--issue-dir",
    issueDir,
  ]);

  expect(createResult.exitCode).toBe(0);

  const createPayload = parseJsonOutput<{
    data: { issue: { id: string; created_at: string }; path: string };
  }>(createResult.stdout);
  expect(createPayload.data.path).toContain("/custom-issues/");

  await seedIssue(
    workspace,
    {
      id: "550e8400-e29b-41d4-a716-446655440003",
      title: "Second custom issue",
      status: "working",
      priority: "medium",
      labels: ["CUSTOM"],
      created_at: "2026-04-01T15:00:00Z",
      updated_at: "2026-04-01T15:00:00Z",
    },
    "",
    issueDir,
  );

  const listResult = await runCli(workspace, ["list", "--issue-dir", issueDir]);
  expect(listResult.exitCode).toBe(0);
  expect(listResult.stdout).toBe(
    `[open] Custom dir issue (${createPayload.data.issue.created_at.slice(0, 10)})\n[working] Second custom issue (medium) #CUSTOM (2026-04-01)`,
  );

  const modifyResult = await runCli(workspace, [
    "modify-metadata",
    "--id",
    createPayload.data.issue.id,
    "--status",
    "closed",
    "--labels",
    "customized",
    "--allow-new-label",
    "--issue-dir",
    issueDir,
  ]);

  expect(modifyResult.exitCode).toBe(0);

  const documents = await readIssueDocuments(workspace, issueDir);
  expect(documents).toHaveLength(2);
  const modifiedDocument = documents.find(
    (document) => document.frontMatter.id === createPayload.data.issue.id,
  );
  expect(modifiedDocument?.name).toContain("_closed_custom-dir-issue.md");
  expect(modifiedDocument?.frontMatter.labels).toEqual(["CUSTOMIZED"]);
});

test("list rejects unexpected positional arguments", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, ["list", "unexpected"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Unexpected argument: unexpected");
});

test("recursive scan finds nested issue files and modify preserves the subdir", async () => {
  const workspace = await makeWorkspace();
  const issueDir = "custom-issues";

  await seedIssue(
    workspace,
    {
      id: "550e8400-e29b-41d4-a716-446655440004",
      title: "Nested issue",
      status: "working",
      priority: "high",
      labels: ["NESTED"],
      created_at: "2026-04-01T16:00:00Z",
      updated_at: "2026-04-01T16:00:00Z",
    },
    "",
    `${issueDir}/team/backend`,
  );

  const listResult = await runCli(workspace, ["list", "--issue-dir", issueDir]);
  expect(listResult.exitCode).toBe(0);
  expect(listResult.stdout).toBe("[working] Nested issue (high) #NESTED (2026-04-01)");

  const modifyResult = await runCli(workspace, [
    "modify-metadata",
    "--id",
    "550e8400-e29b-41d4-a716-446655440004",
    "--status",
    "closed",
    "--issue-dir",
    issueDir,
  ]);
  expect(modifyResult.exitCode).toBe(0);

  const documents = await readIssueDocuments(workspace, issueDir);
  expect(documents).toHaveLength(1);
  expect(documents[0].relativePath).toBe(
    "team/backend/20260401_closed_nested-issue.md",
  );
});

test("new stores issues in a nested subdir when --subdir is provided", async () => {
  const workspace = await makeWorkspace();
  const issueDir = "custom-issues";

  const createResult = await runCli(workspace, [
    "new",
    "--title",
    "Nested new issue",
    "--status",
    "open",
    "--issue-dir",
    issueDir,
    "--subdir",
    "triage/frontend",
  ]);

  expect(createResult.exitCode).toBe(0);

  const createPayload = parseJsonOutput<{
    data: { path: string };
  }>(createResult.stdout);
  expect(createPayload.data.path).toContain("/custom-issues/triage/frontend/");

  const documents = await readIssueDocuments(workspace, issueDir);
  expect(documents).toHaveLength(1);
  expect(documents[0].relativePath).toStartWith(
    "triage/frontend/202",
  );
  expect(documents[0].relativePath).toContain("_open_nested-new-issue.md");
});

test("touch finds nested issue files in a custom issue directory", async () => {
  const workspace = await makeWorkspace();
  const issueDir = "custom-issues";

  await seedIssue(
    workspace,
    {
      id: "550e8400-e29b-41d4-a716-446655440006",
      title: "Nested touch issue",
      status: "working",
      priority: "high",
      labels: ["NESTED", "TOUCH"],
      created_at: "2026-03-28T09:00:00Z",
      updated_at: "2026-03-28T09:00:00Z",
    },
    "Keep nested body.\n",
    `${issueDir}/team/backend`,
  );

  const result = await runCli(workspace, [
    "touch",
    "--id",
    "550e8400-e29b-41d4-a716-446655440006",
    "--issue-dir",
    issueDir,
  ]);

  expect(result.exitCode).toBe(0);

  const documents = await readIssueDocuments(workspace, issueDir);
  expect(documents).toHaveLength(1);
  expect(documents[0].relativePath).toBe(
    "team/backend/20260328_working_nested-touch-issue.md",
  );
  expect(documents[0].frontMatter.updated_at).not.toBe("2026-03-28T09:00:00Z");
  expect(documents[0].body).toBe("Keep nested body.\n");
});

test("archive preserves nested subdirs in a custom issue directory", async () => {
  const workspace = await makeWorkspace();
  const issueDir = "custom-issues";

  await seedIssue(
    workspace,
    {
      id: "550e8400-e29b-41d4-a716-446655440107",
      title: "Nested archive issue",
      status: "working",
      priority: "high",
      labels: ["NESTED", "ARCHIVE"],
      created_at: "2026-03-28T09:00:00Z",
      updated_at: "2026-03-28T09:00:00Z",
    },
    "Archive nested body.\n",
    `${issueDir}/team/backend`,
  );

  const archiveResult = await runCli(workspace, [
    "archive",
    "--id",
    "550e8400-e29b-41d4-a716-446655440107",
    "--issue-dir",
    issueDir,
  ]);

  expect(archiveResult.exitCode).toBe(0);

  const listResult = await runCli(workspace, ["list", "--issue-dir", issueDir]);
  expect(listResult.exitCode).toBe(0);
  expect(listResult.stdout).toBe("");

  const showResult = await runCli(workspace, [
    "show",
    "--id",
    "550e8400-e29b-41d4-a716-446655440107",
    "--issue-dir",
    issueDir,
  ]);
  expect(showResult.exitCode).toBe(0);

  const showPayload = parseJsonOutput<{
    data: {
      issue: {
        status: string;
        relativePath: string;
        archived: boolean;
      };
    };
  }>(showResult.stdout);

  expect(showPayload.data.issue.status).toBe("closed");
  expect(showPayload.data.issue.relativePath).toBe(
    "archive/team/backend/20260328_closed_nested-archive-issue.md",
  );
  expect(showPayload.data.issue.archived).toBe(true);

  const documents = await readIssueDocuments(workspace, issueDir);
  expect(documents).toHaveLength(1);
  expect(documents[0].relativePath).toBe(
    "archive/team/backend/20260328_closed_nested-archive-issue.md",
  );
  expect(documents[0].body).toBe("Archive nested body.\n");
});
