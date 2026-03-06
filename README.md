# AI Whiteboard Resume Workflow Specification

## 1. System Overview

This system is a **whiteboard-style AI workflow** that takes Obsidian-based markdown as input, runs a configurable agent pipeline, and outputs ATS-optimized DOCX resumes per job description.[web:24][web:30]

**High-level pipeline**

1. Input: Obsidian vault (markdown files, attachments, links, JSON exports).[web:24]
2. Preprocessing: Index and normalize markdown into structured profile + project data.[web:24]
3. Agent Orchestrator: Controls a pipeline of tools/skills, memory, hooks, and plugins.
4. Specialized Tools:
   - Job description analyzer
   - Profile/project matcher
   - Resume template/format enforcer
   - ATS optimization tool
   - DOCX generator
5. Output: Folder of generated resumes in DOCX format:
   - `company_jobtitle_myname.docx`.

The whiteboard UI represents each step as a node in a visual workflow, similar to node-based AI agent frameworks.[web:16][web:25]

---

## 2. Goals and Non-Goals

### 2.1 Goals

- Generate **job-specific resumes** in a consistent, user-defined format.
- Use **Obsidian markdown** as the single source of truth for:
  - Profile
  - Skills
  - Projects
  - Experience
- Implement a **visual workflow** that:
  - Shows the pipeline end-to-end
  - Allows toggling nodes/tools on/off
- Provide **ATS-optimized** output tailored to each job description.[web:42]
- Support **Claude-native** endpoints and **MCP tools** for external context access.[web:32][web:33]

### 2.2 Non-Goals

- Not a generic resume builder for random users.
- Not a replacement for Obsidian; Obsidian remains the editing UX.
- No real-time multi-user collaboration in v1.

---

## 3. Functional Requirements

### 3.1 Input: Obsidian Markdown Ingestion

1. The system shall **scan a configured Obsidian vault path** and load markdown files and attachments.[web:24]
2. The system shall support **frontmatter** and **section-based** metadata (e.g. `--- skills: [...] ---`).[web:24]
3. The system shall normalize:
   - Profile file (name, contact, summary)
   - Global skills list
   - Project list (each project with tags, tech stack, impact)
   - Experience entries (company, role, bullets, dates)
4. The system shall maintain a **JSON representation** of the parsed vault for downstream agents.

### 3.2 Agent & Skills

5. The system shall expose an **Agent Orchestrator** that:
   - Reads a workflow definition
   - Invokes tools/skills in sequence or branches
   - Manages context and memory between steps.[web:21][web:25]
6. The agent shall support **skills**:
   - Job description parsing
   - Profile understanding
   - Project selection and ranking
   - Resume composition
   - ATS optimization
   - Output validation (format checks).

### 3.3 Workflow Configuration (Whiteboard)

7. The system shall provide a **visual canvas** where each node is:
   - A tool/skill
   - A data transformation
   - A conditional branch (e.g., skip ATS optimization).
8. The user shall be able to:
   - Add/remove nodes
   - Connect nodes with edges
   - Configure node parameters (e.g., model temperature, template path).
9. The workflow definition shall be **serializable** to JSON/YAML for versioning.

### 3.4 Output Generation

10. The system shall generate **one DOCX resume per job description** passed into the pipeline.
11. For each job, the system shall:
    - Create a tailored resume following a **strict format template**.
    - Use only approved sections and headings.
12. The output filename pattern shall be:
    - `company_jobtitle_myname.docx`.
13. The system shall write outputs to a **configurable folder** (e.g., `./generated-resumes`).

---

## 4. Non-Functional Requirements

### 4.1 Performance

- Process **N job descriptions** (configurable, e.g., 10–20) in a single batch in less than a few minutes, depending on model latency.[web:39]
- Avoid redundant LLM calls by caching intermediate results where possible.

### 4.2 Reliability & Robustness

- Each node shall have **error boundaries** and retry logic.
- Failures in one job description shall not stop the whole batch.

### 4.3 Maintainability

- Implement in **TypeScript** with strong types for:
  - Workflow graph
  - Node definitions
  - Agent state.[web:16][web:18]
- Use a clear project structure (see Appendix).

### 4.4 Privacy & Security

- Keep Obsidian vault data **local**, unless explicitly configured to use remote tools.
- When using Claude/MCP, ensure only necessary context is sent.[web:32][web:33][web:38]

---

## 5. Constraints

### 5.1 Technical Constraints

- Language: **TypeScript** (Node.js backend, React frontend).[web:16][web:17]
- LLM: Claude-native endpoints for core reasoning steps.[web:32]
- Protocol: **Model Context Protocol (MCP)** for integrating:
  - Filesystem (Obsidian)
  - Vector store (optional)
  - DOCX generation service.[web:32][web:33][web:38]
- Document generation:
  - Markdown → DOCX using a library or conversion pipeline.[web:37][web:40]

### 5.2 Data Constraints

- Markdown files may be:
  - Inconsistent
  - Incomplete
- System must handle missing fields gracefully and surface warnings.

### 5.3 Business Constraints

- Cost: Minimize LLM calls (batch, reuse embeddings, cache).
- No vendor lock-in beyond Claude/MCP; design to swap models later.[web:18][web:28]

---

## 6. System Design

### 6.1 High-Level Architecture

**Components**

- Whiteboard UI (React + React Flow)
- Workflow Engine (TypeScript)
- Agent Orchestrator
- Tools/Skills Layer
- Memory Layer
- MCP Integration Layer
- Output Writer (DOCX + file system)

```text
Obsidian Vault --> Ingestion & Indexer --> Memory Store
                                        |
Job Descriptions --> JD Parser Tool ----+
                                        --> Agent Orchestrator --> Resume Composer --> DOCX Generator --> Output Folder
Whiteboard UI <--> Workflow Engine <----+

