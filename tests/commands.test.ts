import { afterEach, expect, test } from "bun:test";
import { DEFAULT_ISSUE_BODY } from "../src/commands/new";
import type { Issue } from "../src/types";
import { toIsoMinuteString } from "../src/utils/markdown";
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

test("new command creates an issue file with generated metadata", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["AUTH", "BUG"]);
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
  expect(documents[0].frontMatter.labels).toEqual(["AUTH", "BUG"]);
  expect(documents[0].body).toBe(DEFAULT_ISSUE_BODY);
});

test("new command writes provided content as the body", async () => {
  const workspace = await makeWorkspace();
  const content = "First line.\n\n- checklist item\n";
  const result = await runCli(workspace, [
    "new",
    "--title",
    "Content issue",
    "--status",
    "open",
    "--content",
    content,
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].frontMatter.title).toBe("Content issue");
  expect(documents[0].body).toBe(content);
});

test("new command writes an empty body when --content is empty", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, [
    "new",
    "--title",
    "Empty content issue",
    "--status",
    "open",
    "--content",
    "",
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].frontMatter.title).toBe("Empty content issue");
  expect(documents[0].body).toBe("");
});

test("new command keeps legacy --blank-body compatibility", async () => {
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

test("new command rejects --content with --blank-body", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, [
    "new",
    "--title",
    "Conflicting body options",
    "--status",
    "open",
    "--content",
    "Body",
    "--blank-body",
  ]);

  expect(result.exitCode).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("Cannot combine --content and --blank-body");
});

test("new command preserves CJK characters in the generated filename", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, [
    "new",
    "--title",
    "收敛测试运行环境依赖并修复时间抖动导致的不稳定",
    "--status",
    "open",
    "--blank-body",
  ]);

  expect(result.exitCode).toBe(0);

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].name).toStartWith(
    "open_收敛测试运行环境依赖并修复时间抖动导致的不稳定_",
  );
});

test("new command rejects unregistered labels unless --allow-new-label is provided", async () => {
  const workspace = await makeWorkspace();

  const rejected = await runCli(workspace, [
    "new",
    "--title",
    "Needs registry",
    "--status",
    "open",
    "--labels",
    "auth",
  ]);

  expect(rejected.exitCode).toBe(1);
  expect(rejected.stderr).toContain("Label is not registered: AUTH");

  const accepted = await runCli(workspace, [
    "new",
    "--title",
    "Needs registry",
    "--status",
    "open",
    "--labels",
    "auth",
    "--allow-new-label",
  ]);

  expect(accepted.exitCode).toBe(0);

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].frontMatter.labels).toEqual(["AUTH"]);
});

test("new command rejects unexpected positional arguments", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, [
    "new",
    "unexpected",
    "--title",
    "Bad args",
    "--status",
    "open",
  ]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Unexpected argument: unexpected");
});

test("new command does not persist registry updates when creation fails", async () => {
  const workspace = await makeWorkspace();
  const now = new Date();
  const createdAtValues = [
    toIsoMinuteString(now),
    toIsoMinuteString(new Date(now.getTime() + 60_000)),
  ];

  for (const created_at of createdAtValues) {
    await seedIssue(workspace, {
      id: crypto.randomUUID(),
      title: "Collision demo",
      status: "open",
      labels: ["AUTH"],
      created_at,
      updated_at: created_at,
    });
  }

  const result = await runCli(workspace, [
    "new",
    "--title",
    "Collision demo",
    "--status",
    "open",
    "--labels",
    "bug",
    "--allow-new-label",
  ]);

  expect(result.exitCode).toBe(1);
  const labelsResult = await runCli(workspace, ["labels"]);
  expect(labelsResult.stdout).toBe("");
});

test("modify-metadata renames the file using a CJK title slug", async () => {
  const workspace = await makeWorkspace();
  const issue = {
    id: "550e8400-e29b-41d4-a716-446655440777",
    title: "Temporary title",
    status: "open" as const,
    created_at: "2026-04-01T14:30:00Z",
    updated_at: "2026-04-01T14:30:00Z",
    labels: [],
  };
  await seedIssue(workspace, issue);

  const result = await runCli(workspace, [
    "modify-metadata",
    "--id",
    issue.id,
    "--title",
    "修复中文文件名降级问题",
  ]);

  expect(result.exitCode).toBe(0);

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].name).toBe("open_修复中文文件名降级问题_202604011430.md");
  expect(documents[0].frontMatter.title).toBe("修复中文文件名降级问题");
});

test("list command returns empty output for an empty workspace", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, ["list"]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("");
});

test("list command rejects unexpected positional arguments", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, ["list", "unexpected"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Unexpected argument: unexpected");
});

test("labels command rejects unexpected positional arguments after the subcommand", async () => {
  const workspace = await makeWorkspace();
  const result = await runCli(workspace, ["labels", "sync", "unexpected"]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Unexpected argument: unexpected");
});

test("list command sorts issues and applies status and priority filters", async () => {
  const workspace = await makeWorkspace();

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Older issue",
    status: "open",
    priority: "low",
    labels: ["DOCS"],
    created_at: "2026-03-28T09:00:00Z",
    updated_at: "2026-03-28T09:00:00Z",
  });

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Newer issue",
    status: "working",
    priority: "high",
    labels: ["AUTH", "BUG"],
    created_at: "2026-04-01T14:30:00Z",
    updated_at: "2026-04-01T14:30:00Z",
  });

  const listResult = await runCli(workspace, ["list"]);
  expect(listResult.exitCode).toBe(0);
  expect(listResult.stdout).toBe(
    "[working] Newer issue (high) #AUTH #BUG (2026-04-01)\n[open] Older issue (low) #DOCS (2026-03-28)",
  );

  const statusResult = await runCli(workspace, ["list", "--status", "working"]);
  expect(statusResult.stdout).toBe(
    "[working] Newer issue (high) #AUTH #BUG (2026-04-01)",
  );

  const priorityResult = await runCli(workspace, ["list", "--priority", "low"]);
  expect(priorityResult.stdout).toBe("[open] Older issue (low) #DOCS (2026-03-28)");
});

test("list command filters by labels using match-any semantics", async () => {
  const workspace = await makeWorkspace();

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440100",
    title: "Auth bug",
    status: "open",
    priority: "high",
    labels: ["AUTH", "BUG"],
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-01T09:00:00Z",
  });

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440101",
    title: "Docs refresh",
    status: "working",
    priority: "low",
    labels: ["DOCS"],
    created_at: "2026-04-02T09:00:00Z",
    updated_at: "2026-04-02T09:00:00Z",
  });

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440102",
    title: "Infra cleanup",
    status: "open",
    labels: ["INFRA"],
    created_at: "2026-04-03T09:00:00Z",
    updated_at: "2026-04-03T09:00:00Z",
  });

  const result = await runCli(workspace, [
    "list",
    "--labels",
    "docs",
    "--labels",
    "bug",
  ]);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toBe(
    "[working] Docs refresh (low) #DOCS (2026-04-02)\n[open] Auth bug (high) #AUTH #BUG (2026-04-01)",
  );
});

test("show command returns issue metadata, body, path, and archived state", async () => {
  const workspace = await makeWorkspace();
  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440103",
    title: "Show me",
    status: "open",
    priority: "medium",
    labels: ["DEMO"],
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  };

  await seedIssue(workspace, issue, "Issue body.\n");

  const result = await runCli(workspace, ["show", "--id", issue.id]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");

  const payload = parseJsonOutput<{
    success: boolean;
    data: {
      issue: Issue & {
        body: string;
        path: string;
        relativePath: string;
        archived: boolean;
      };
    };
  }>(result.stdout);

  expect(payload.success).toBe(true);
  expect(payload.data.issue.title).toBe(issue.title);
  expect(payload.data.issue.body).toBe("Issue body.\n");
  expect(payload.data.issue.relativePath).toBe("open_show-me_202604011000.md");
  expect(payload.data.issue.path).toContain("/.issues/open_show-me_202604011000.md");
  expect(payload.data.issue.archived).toBe(false);
});

test("search command matches title and body, case-insensitively", async () => {
  const workspace = await makeWorkspace();

  await seedIssue(
    workspace,
    {
      id: "550e8400-e29b-41d4-a716-446655440104",
      title: "Login investigation",
      status: "working",
      priority: "high",
      labels: ["AUTH"],
      created_at: "2026-04-02T10:00:00Z",
      updated_at: "2026-04-02T10:00:00Z",
    },
    "Need to reproduce the broken SSO callback.\n",
  );

  await seedIssue(
    workspace,
    {
      id: "550e8400-e29b-41d4-a716-446655440105",
      title: "Dashboard copy",
      status: "open",
      labels: ["UI"],
      created_at: "2026-04-01T10:00:00Z",
      updated_at: "2026-04-01T10:00:00Z",
    },
    "Update the LOGIN helper text for guests.\n",
  );

  const result = await runCli(workspace, ["search", "--query", "login"]);
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(result.stdout).toBe(
    "[working] Login investigation (high) #AUTH (2026-04-02) :: working_login-investigation_202604021000.md\n[open] Dashboard copy #UI (2026-04-01) :: open_dashboard-copy_202604011000.md",
  );
});

test("modify-metadata updates front matter, preserves body, and renames the file", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["AUTH", "BUG", "CONFIRMED"]);
  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    title: "Fix login bug",
    status: "open",
    priority: "high",
    labels: ["AUTH"],
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
  expect(documents[0].frontMatter.labels).toEqual(["BUG", "CONFIRMED"]);
  expect(documents[0].frontMatter.updated_at).not.toBe(issue.updated_at);
  expect(documents[0].body).toBe("Keep this body intact.\n");
});

test("modify-metadata can add a new label only with --allow-new-label", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["AUTH"]);

  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440200",
    title: "Registry update",
    status: "open",
    labels: ["AUTH"],
    created_at: "2026-04-01T14:30:00Z",
    updated_at: "2026-04-01T14:30:00Z",
  };

  await seedIssue(workspace, issue, "Keep this body intact.\n");

  const rejected = await runCli(workspace, [
    "modify-metadata",
    "--id",
    issue.id,
    "--labels",
    "auth",
    "--labels",
    "bug",
  ]);

  expect(rejected.exitCode).toBe(1);
  expect(rejected.stderr).toContain("Label is not registered: BUG");

  const accepted = await runCli(workspace, [
    "modify-metadata",
    "--id",
    issue.id,
    "--labels",
    "auth",
    "--labels",
    "bug",
    "--allow-new-label",
  ]);

  expect(accepted.exitCode).toBe(0);

  const documents = await readIssueDocuments(workspace);
  expect(documents[0].frontMatter.labels).toEqual(["AUTH", "BUG"]);
});

test("modify-metadata does not persist registry updates when rename collides", async () => {
  const workspace = await makeWorkspace();
  await seedLabelRegistry(workspace, ["AUTH"]);

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440201",
    title: "Source issue",
    status: "open",
    labels: ["AUTH"],
    created_at: "2026-04-01T14:30:00Z",
    updated_at: "2026-04-01T14:30:00Z",
  });

  await seedIssue(workspace, {
    id: "550e8400-e29b-41d4-a716-446655440202",
    title: "Target issue",
    status: "closed",
    labels: ["AUTH"],
    created_at: "2026-04-01T14:30:00Z",
    updated_at: "2026-04-01T14:30:00Z",
  });

  const result = await runCli(workspace, [
    "modify-metadata",
    "--id",
    "550e8400-e29b-41d4-a716-446655440201",
    "--title",
    "Target issue",
    "--status",
    "closed",
    "--labels",
    "auth",
    "--labels",
    "bug",
    "--allow-new-label",
  ]);

  expect(result.exitCode).toBe(1);

  const labelsResult = await runCli(workspace, ["labels"]);
  expect(labelsResult.stdout).toBe("AUTH");

  const showResult = await runCli(workspace, [
    "show",
    "--id",
    "550e8400-e29b-41d4-a716-446655440201",
  ]);
  const payload = parseJsonOutput<{ data: { issue: Issue } }>(showResult.stdout);
  expect(payload.data.issue.title).toBe("Source issue");
  expect(payload.data.issue.status).toBe("open");
  expect(payload.data.issue.labels).toEqual(["AUTH"]);
});

test("touch updates only updated_at and preserves body and file path", async () => {
  const workspace = await makeWorkspace();
  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440005",
    title: "Touch me",
    status: "open",
    priority: "medium",
    labels: ["DOCS"],
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

test("archive moves an issue under archive, closes it, and show still finds it", async () => {
  const workspace = await makeWorkspace();
  const issue: Issue = {
    id: "550e8400-e29b-41d4-a716-446655440106",
    title: "Archive me",
    status: "working",
    priority: "medium",
    labels: ["OPS"],
    created_at: "2026-03-28T09:00:00Z",
    updated_at: "2026-03-28T09:00:00Z",
  };

  await seedIssue(workspace, issue, "Preserve this body.\n");

  const archiveResult = await runCli(workspace, ["archive", "--id", issue.id]);
  expect(archiveResult.exitCode).toBe(0);
  expect(archiveResult.stderr).toBe("");

  const archivePayload = parseJsonOutput<{
    success: boolean;
    data: { issue: Issue; path: string };
  }>(archiveResult.stdout);

  expect(archivePayload.success).toBe(true);
  expect(archivePayload.data.issue.status).toBe("closed");
  expect(archivePayload.data.path).toContain("/.issues/archive/closed_archive-me_202603280900.md");

  const listResult = await runCli(workspace, ["list"]);
  expect(listResult.exitCode).toBe(0);
  expect(listResult.stdout).toBe("");

  const searchResult = await runCli(workspace, ["search", "--query", "archive"]);
  expect(searchResult.exitCode).toBe(0);
  expect(searchResult.stdout).toBe("");

  const showResult = await runCli(workspace, ["show", "--id", issue.id]);
  expect(showResult.exitCode).toBe(0);

  const showPayload = parseJsonOutput<{
    data: {
      issue: Issue & {
        body: string;
        relativePath: string;
        archived: boolean;
      };
    };
  }>(showResult.stdout);

  expect(showPayload.data.issue.status).toBe("closed");
  expect(showPayload.data.issue.body).toBe("Preserve this body.\n");
  expect(showPayload.data.issue.relativePath).toBe(
    "archive/closed_archive-me_202603280900.md",
  );
  expect(showPayload.data.issue.archived).toBe(true);

  const documents = await readIssueDocuments(workspace);
  expect(documents).toHaveLength(1);
  expect(documents[0].relativePath).toBe("archive/closed_archive-me_202603280900.md");
  expect(documents[0].frontMatter.status).toBe("closed");
  expect(documents[0].body).toBe("Preserve this body.\n");
});
