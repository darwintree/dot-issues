# Project Structure & Architecture Design

**Date:** 2026-04-01
**Project:** dot-issues → Claude Code Skill
**Status:** Design Approved
**Slogan:** Issues that live in your repo — plain Markdown, built for agents.

---

## Design Goals

1. **Zero External Dependencies** - Auditors can run `bun scripts/index.ts ...` directly without installing packages
2. **Source Transparency** - All source code visible for malware detection before execution
3. **Code Quality** - Comply with CLAUDE.md standards (each file ≤ 200 lines, max 8 files per folder)
4. **Testability** - Support critical path unit tests (new, list, modify-metadata commands)
5. **Distribution as Skill** - Package structure compatible with Claude Code skill distribution

---

## Directory Structure

```text
dot-issues/
├── src → skills/scripts          # Symlink (dev convenience only)
├── skills/
│   ├── scripts/                  # Source code (distributable)
│   │   ├── index.ts              # Entry point, command dispatcher
│   │   ├── parseArgs.ts          # CLI argument parser (~60 lines)
│   │   ├── commands/             # max 3 files
│   │   │   ├── new.ts            # Create issue command
│   │   │   ├── list.ts           # List issues command
│   │   │   └── modify.ts         # Modify metadata command
│   │   ├── utils/                # max 3 files
│   │   │   ├── file.ts           # File I/O operations
│   │   │   ├── markdown.ts       # YAML front matter parsing/generation
│   │   │   └── validate.ts       # Input validation
│   │   └── types.ts              # Type definitions (interfaces)
│   └── SKILL.md                  # Claude Code skill manifest
├── tests/
│   ├── setup.ts                  # Test environment & helpers
│   └── commands.test.ts          # Critical path tests
├── package.json                  # zero dependencies
├── bunfig.toml                   # Bun configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md
```

---

## File Size Constraints

| File            | Max Lines | Rationale                      |
| --------------- | --------- | ------------------------------ |
| `index.ts`      | 120       | Command dispatch logic only    |
| `parseArgs.ts`  | 80        | Simple minimist-style parser   |
| `commands/*.ts` | 150 each  | One command per file           |
| `utils/*.ts`    | 150 each  | Focused utilities              |
| `types.ts`      | 50        | Just type definitions          |

**Total:** ~600-700 lines of source code

---

## Dependencies

**Production:** None (zero external dependencies)

**Dev:**
```json
{
  "devDependencies": {
    "bun-types": "latest"
  }
}
```

**Built-in Node.js/Bun modules only:**
- `fs` / `fs/promises` - File operations
- `path` - Path manipulation
- `crypto` - UUID generation
- Standard objects (Date, Map, etc.)

---

## CLI Argument Parsing (parseArgs.ts)

### Parsing Strategy: Simple Version (Type A)

**Supported Patterns:**

```bash
bun scripts/index.ts <command> --key value --key value ...
```

**Special handling for labels only:**

```bash
--labels bug --labels auth  →  { labels: ['bug', 'auth'] }
```

**All other parameters:** Single string value

### Parser Signature

```typescript
interface ParsedArgs {
  command: string                    // 'new' | 'list' | 'modify-metadata'
  args: Record<string, string | string[]>  // labels is string[], others are string
}

function parseArgs(argv: string[]): ParsedArgs
```

### Parser Implementation Notes

- ~60 lines of code
- Handles whitespace in values (quoted arguments passed by shell)
- Returns `undefined` value if flag has no value (validation handled by commands)
- No type coercion or defaults (each command validates its own args)

---

## Command Specifications

### new command

**Usage:**

```bash
bun scripts/index.ts new --title "Fix login bug" --status open --priority high --labels auth --labels bug
```

**Required Args:** `title`, `status`

**Optional Args:** `priority`, `labels` (repeatable)

**Side Effects:** Creates `.issues/[status]_[title-slug]_[YYYYMMDDHHmm].md` file

**Implementation:**

1. Validate: title (non-empty), status (one of: open/working/closed)
2. Generate: UUID via `crypto.randomUUID()`
3. Generate: title-slug (lowercase, spaces→hyphens, remove special chars)
4. Generate: YYYYMMDDHHmm timestamp from current time
5. Generate: front matter (YAML with metadata)
6. Write: Markdown file with front matter + empty body
7. Output: JSON result (success/error)

### list command

**Usage:**

```bash
bun scripts/index.ts list [--status open] [--priority high]
```

**Optional filters:** `status`, `priority`, (extensible for future labels filtering)

**Output Format:**

```text
[open] Fix login bug (high) #auth #bug (2026-04-01)
[working] Update docs (medium) #docs (2026-03-28)
[closed] Review PR (low) (2026-03-20)
```

**Implementation:**

1. Scan `.issues/` directory
2. Parse each `.md` file's front matter
3. Apply filters if provided
4. Sort by creation date (descending)
5. Format each line: `[status] Title (priority) #label1 #label2 (date)`
6. Output to stdout

### modify-metadata command

**Usage:**

```bash
bun scripts/index.ts modify-metadata --id <uuid> --status closed --priority low --labels bug
```

**Required Args:** `id` (UUID of issue to modify)

**Optional Args:** `title`, `status`, `priority`, `labels`

**Side Effects:** Updates front matter; if `status` changes, renames the file

**Implementation:**

1. Find file by UUID in `.issues/`
2. Parse current front matter
3. Merge changes (only provided fields)
4. Update `updated_at` timestamp
5. If `status` changed: generate new filename and rename file
6. Write updated front matter back
7. Preserve markdown body content (unchanged)
8. Output: JSON result (success/error)

---

## Utility Modules

### file.ts (File I/O)

```typescript
// Read markdown file, returns {frontMatter, body}
async function readMarkdownFile(path: string): Promise<{frontMatter: Record<string, any>, body: string}>

// Write markdown file with front matter + body
async function writeMarkdownFile(path: string, frontMatter: Record<string, any>, body: string): Promise<void>

// List all .md files in directory
async function listIssueFiles(dirPath: string): Promise<string[]>

// Check if .issues directory exists, create if needed
async function ensureIssuesDir(issueDir: string): Promise<void>
```

### markdown.ts (YAML Front Matter)

```typescript
// Parse YAML front matter block from markdown file content
function parseFrontMatter(content: string): {frontMatter: Record<string, any>, body: string}

// Generate YAML front matter string
function generateFrontMatter(data: Record<string, any>): string

// Generate complete markdown file content
function generateMarkdownContent(frontMatter: Record<string, any>, body: string): string

// Generate filename from issue data
function generateFileName(status: string, title: string, createdAt: Date): string

// Generate title slug
function titleToSlug(title: string): string
```

### validate.ts (Input Validation)

```typescript
function validateStatus(status: string): boolean  // Allowed: open, working, closed
function validatePriority(priority: string): boolean  // Allowed: low, medium, high
function validateTitle(title: string): boolean  // Non-empty string
function validateLabels(labels: any): labels is string[]  // Array of strings
function validateUUID(uuid: string): boolean  // UUID v4 format check
```

---

## Type Definitions (types.ts)

```typescript
interface Issue {
  id: string                   // UUID
  title: string
  status: 'open' | 'working' | 'closed'
  priority?: 'low' | 'medium' | 'high'
  labels: string[]
  created_at: string           // ISO 8601, seconds = 00
  updated_at: string           // ISO 8601
}

interface CommandResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

interface ParsedArgs {
  command: string
  args: Record<string, string | string[]>
}
```

---

## Testing Strategy

### Critical Path Tests (commands.test.ts)

**Focus:** Command-level integration tests, not exhaustive coverage

1. **new command tests**
   - Create issue with required args
   - Verify file created with correct format
   - Verify UUID generation
   - Verify filename includes status, slug, timestamp

2. **list command tests**
   - List empty directory
   - List with multiple issues
   - Verify output format matches spec
   - Test status filter
   - Test priority filter

3. **modify-metadata tests**
   - Modify single field (priority)
   - Modify status (verify filename renamed)
   - Modify labels (verify array handling)
   - Verify updated_at timestamp updated

### Test Setup (setup.ts)

- Temporary directory creation/cleanup
- Mock `.issues/` directory for tests
- Test data generators (sample issues)
- Assertion helpers

### Coverage Expectations

- Command entry points: 100%
- Validation functions: 90%
- File I/O: 80% (exclude error edge cases)
- Markdown parsing: 80%
- **Total:** ~80-85% for critical paths

---

## Development Workflow

### Running the CLI

```bash
# Development (via symlink)
bun src/index.ts new --title "Test" --status open

# Or directly
bun skills/scripts/index.ts new --title "Test" --status open

# With watch mode (bun runtime supports file watching)
bun --watch skills/scripts/index.ts ...
```

### Running Tests

```bash
bun test tests/commands.test.ts
```

### Auditing Before Use

1. Reviewer downloads skill
2. Examines `skills/scripts/` source code (~600 lines)
3. Checks for malicious file I/O, network calls, eval, etc.
4. If satisfied: runs with `bun skills/scripts/index.ts ...`

---

## Distribution

### Skill Package Contents

When distributed as a Claude Code skill:

```text
dot-issues-skill/
├── skills/scripts/              # Full source code visible
├── SKILL.md                      # Skill manifest
├── README.md                     # Usage documentation
├── package.json                  # zero dependencies
└── [optional] examples/          # Example issue files
```

**Auditor sees:** All source code before execution

**No black boxes, no build artifacts**

---

## Architecture Principles

1. **Separation of Concerns**
   - `parseArgs.ts` - Only CLI parsing
   - `commands/*.ts` - Command logic only
   - `utils/*.ts` - Reusable functions
   - `types.ts` - Type definitions only

2. **No External Dependencies**
   - Easier auditing
   - Faster startup (no npm install)
   - Simpler distribution
   - Reduces attack surface

3. **File-Centric Design**
   - Issue = One markdown file in `.issues/`
   - Front matter = YAML metadata (CLI-managed)
   - Body = Free-form markdown (user-editable)
   - Filename = Human-readable (status + slug + timestamp)

4. **Immutable Filesystem**
   - Only CLI modifies front matter
   - Only CLI renames files (on status change)
   - User can edit body directly
   - No hidden state outside `.issues/` directory

---

## Next Steps

1. ✅ Design approved
2. Write implementation plan (skill: writing-plans)
3. Initialize project structure (create directories, package.json, tsconfig.json)
4. Implement parseArgs.ts
5. Implement utils (file.ts, markdown.ts, validate.ts)
6. Implement commands (new.ts, list.ts, modify.ts)
7. Implement index.ts
8. Write tests
9. Create SKILL.md manifest
10. Test distribution & auditability

---

## Appendix: Example Usage

```bash
# Create a new issue
bun skills/scripts/index.ts new \
  --title "Fix authentication bug" \
  --status open \
  --priority high \
  --labels auth \
  --labels bug

# List all issues
bun skills/scripts/index.ts list

# List only open issues
bun skills/scripts/index.ts list --status open

# Modify issue status
bun skills/scripts/index.ts modify-metadata \
  --id 550e8400-e29b-41d4-a716-446655440000 \
  --status closed \
  --priority low

# Expected output (JSON)
{
  "success": true,
  "message": "Issue modified successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Fix authentication bug",
    "status": "closed",
    "priority": "low"
  }
}
```
