# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Whiteboard Resume Workflow — a node-based visual pipeline that ingests an Obsidian markdown vault, runs a configurable agent pipeline (Claude + MCP), and outputs ATS-optimized DOCX resumes tailored to specific job descriptions.

**Output format:** `company_jobtitle_myname.docx` written to a configurable output folder (`./generated-resumes`).

## Tech Stack

- **Frontend:** React + React Flow (`@xyflow/react` v12) + Vite + Tailwind + Zustand
- **Backend:** TypeScript / Node.js + Express + WebSocket (`ws`)
- **LLM:** Claude API (`@anthropic-ai/sdk`) for reasoning; MCP (`@anthropic-ai/mcp`) for tool integrations
- **Document generation:** `marked` (MD parsing) + `docx` (DOCX generation) + `gray-matter` (frontmatter)
- **Testing:** Vitest
- **Monorepo:** npm workspaces (`packages/shared`, `packages/backend`, `packages/frontend`)

## Architecture

```
Obsidian Vault --> Ingestion & Indexer --> Memory Store (LRU cache)
                                         |
Job Descriptions --> JD Parser Tool ----+
                                         --> Agent Orchestrator --> Resume Composer --> DOCX Generator --> Output Folder
Whiteboard UI <--> Workflow Engine <----+
       |                    |
       WebSocket <----------+ (NodeStatus events: nodeId, status, progress)
```

### Monorepo Structure

```
packages/
  shared/        # Types and constants consumed by both frontend and backend
    src/types/   # workflow.ts, vault.ts, agent.ts, job.ts, output.ts
    src/constants/ # nodeTypes.ts (NodeType enum), skillNames.ts
  backend/
    src/
      ingestion/     # VaultScanner, FrontmatterParser, SectionParser, VaultNormalizer
      workflow/      # WorkflowEngine (topological DAG executor), NodeRegistry, WorkflowSerializer
      orchestrator/  # AgentOrchestrator, ContextManager, MemoryStore
      skills/        # BaseSkill abstract + 6 skills (see below)
      llm/           # ClaudeClient (retry + token budgeting), PromptBuilder
      mcp/           # McpClient, FilesystemTool, DocxTool
      output/        # DocxGenerator, TemplateLoader, OutputWriter
      api/routes/    # workflow, vault, run, health
      api/ws/        # progressGateway (WebSocket)
  frontend/
    src/
      store/         # workflowStore, vaultStore, settingsStore (Zustand)
      components/
        canvas/      # WorkflowCanvas (React Flow wrapper), CanvasToolbar
        nodes/       # BaseNode + one component per NodeType (8 total)
        panels/      # NodeConfigPanel, VaultPreviewPanel, RunLogPanel
      hooks/         # useWorkflowSocket, useRunPipeline, useVaultScan
      api/           # Typed fetch client for all backend routes
```

### 6 Pipeline Skills (in execution order)

1. **JobDescriptionParser** — extracts required skills, title, company, seniority from raw JD text
2. **ProfileUnderstanding** — structured summary of which vault data matches the parsed JD
3. **ProjectSelector** — ranks and selects top N projects by match score
4. **ResumeComposer** — generates full markdown resume following template section order
5. **AtsOptimizer** — rewrites bullets with keyword alignment from parsed JD
6. **OutputValidator** — deterministic checks (no LLM): section presence, contact info, bullet count

All skills extend `BaseSkill` (abstract class with `execute()`, retry logic, error boundaries via `SkillError`).

### Key Data Types (in `packages/shared`)

- `WorkflowGraph` = `{ nodes: WorkflowNode[], edges: WorkflowEdge[] }` — serialized to JSON/YAML
- `VaultData` = `{ profile, skills[], projects[], experiences[] }` — produced by ingestion layer
- `AgentState` / `SkillResult` / `MemoryEntry` — orchestrator state management
- `NodeStatus` = `{ nodeId, status: "running"|"done"|"error", progress, message? }` — WebSocket events

### Backend API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/vault/scan` | POST | Triggers vault scan, returns VaultData summary |
| `/api/workflow` | GET/POST | Read/write workflow graph JSON |
| `/api/run` | POST | Starts batch run with `{ jobDescriptions: string[] }` |
| `/api/health` | GET | Health check |
| `/ws/progress` | WebSocket | Streams NodeStatus events during runs |

## Key Design Patterns

- **Error isolation:** `Promise.allSettled` for batch jobs — one JD failure doesn't stop others
- **Caching:** `MemoryStore` (LRU) keyed by content hash. VaultData cached if vault unchanged between batch jobs. ParsedJD keyed by raw text hash. TTL: 1 hour.
- **Context window management:** `ContextManager` measures token count before each Claude call, truncates lower-priority sections (project descriptions first, then experience bullets) if exceeding limit. Profile + parsed JD always kept in full.
- **Model swappability:** `ClaudeClient` accepts a `model` string from node params. `BaseSkill.execute(input, context) => SkillResult` has no Anthropic types in its signature.
- **Workflow execution:** `WorkflowEngine` uses Kahn's algorithm (topological sort) for DAG execution, emitting `NodeStatus` events via `EventEmitter`.
- **Filename pattern:** `${slugify(company)}_${slugify(jobTitle)}_${slugify(myName)}.docx` with numeric suffix for collisions.

## Input Processing

The ingestion layer scans a configured Obsidian vault path and normalizes markdown into `VaultData`:
- Profile (name, contact, summary)
- Global skills list
- Project list (tags, tech stack, impact)
- Experience entries (company, role, bullets, dates)

Supports frontmatter (`gray-matter`) and section-based metadata (`## Skills`, `## Experience`). Must handle missing/incomplete fields gracefully with warnings.

## Build & Development Commands

```bash
pnpm install                          # Install all workspace dependencies
pnpm build                            # Build shared → backend → frontend (sequential)
pnpm dev                              # Start backend (tsx watch) + frontend (Vite) concurrently
pnpm dev:backend                      # Backend only (tsx watch, port 3001)
pnpm dev:frontend                     # Frontend only (Vite, port 5173, proxies /api to 3001)
pnpm test                             # Run vitest across all packages
pnpm test:backend                     # Backend tests only
pnpm test:frontend                    # Frontend tests only
pnpm lint                             # ESLint across all packages
pnpm build:shared                     # Rebuild shared types only

# CLI scripts (headless, no UI):
pnpm tsx scripts/scan-vault.ts                          # One-off vault scan
pnpm tsx scripts/batch-run.ts --jd-dir ./job-descriptions  # Headless batch run
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=             # Required: Claude API key (server-side only, never sent to frontend)
VAULT_PATH=                    # Required: absolute path to Obsidian vault
OUTPUT_PATH=./generated-resumes # Output folder for generated DOCX files
```
