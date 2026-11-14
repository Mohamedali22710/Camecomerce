# CCTV E-Commerce Backend — Continuation & Execution Plan

> **IMPORTANT: CONTINUE EXISTING IMPLEMENTATION — DO NOT START FROM SCRATCH**  
> This is an existing backend repository with an existing implementation. The repository has already been cloned, prepared, and partially developed. Existing source files, configurations, utilities, features, and previous code changes must be preserved.  
> An earlier OpenCode implementation/audit report has already been provided. **You MUST read and understand that report before making any changes.**

---

## 1. Your Actual Mission
You are **NOT** building a new backend from scratch. You are continuing the existing implementation.

### Responsibilities:
* Understand what has already been implemented.
* Identify what is working correctly.
* Identify what is partially implemented.
* Identify bugs and incomplete functionality.
* Improve existing code where necessary.
* Complete missing requirements.
* Add missing tests.
* Improve documentation.
* Verify everything.

> *Do not recreate existing functionality just because you prefer a different implementation.*

---

## 2. Read the Previous Report and Inspect the Current Code
Before making any changes:
1. Locate and read the previous OpenCode report.
2. Inspect the current repository and actual source code.
3. Compare the report with the current implementation.
4. Inspect the existing Git status and changes.
5. Inspect existing `package.json` and `package-lock.json`.
6. Identify installed dependencies and existing utilities.
7. Inspect existing tests and configurations.

> **Source of Truth:** The actual code is the source of truth. The previous report is important historical context, but do not assume every statement in it still describes the current code accurately. If the report and actual code disagree, investigate and document the discrepancy.

---

## 3. Preserve Existing Work (MANDATORY)
* **NEVER** delete existing working files without a clear technical reason.
* **NEVER** overwrite existing implementations blindly.
* **NEVER** replace working utilities with duplicate implementations.
* **NEVER** reinstall dependencies that are already correctly installed.
* **NEVER** create duplicate validation, logging, error-handling, or response systems.
* **NEVER** reset Git changes or use destructive Git commands.
* **NEVER** discard uncommitted user changes.
* **NEVER** regenerate the project from a template.
* **NEVER** restructure existing modules or folders.

> *Inspect Git status before modifying anything. Preserve existing changes, including changes that are not committed.*

---

## 4. Continue from the Actual Implementation State
For every requested feature, classify it as:
* **COMPLETE:** Implemented and verified.
* **PARTIAL:** Implemented but missing requirements.
* **NEEDS_FIX:** Implemented but has bugs.
* **MISSING:** Not implemented.
* **NEEDS_REVIEW:** Cannot be verified without additional information.

### Action Rules:
* **Do not rewrite** `COMPLETE` features.
* For `PARTIAL` and `NEEDS_FIX` features, improve the current implementation rather than replacing it unnecessarily.
* For `MISSING` features, implement them using the existing project conventions.

---

## 5. Existing Utilities and Dependencies
Before adding anything, inspect whether the project already has:
* Logger
* Validation middleware
* Error classes & Error-handling middleware
* Response helpers
* Authentication middleware
* JWT utilities & Password hashing utilities
* Mongoose models
* Pagination or query utilities
* Test setup and helpers

### Dependency Rules:
* Reuse existing implementations.
* Install **only** genuinely missing dependencies.
* If Jest or Zod is already installed, configure and use the existing installation instead of installing another version unnecessarily.
* Do not add duplicate packages or duplicate configuration.

---

## 6. Continue the Agreed Implementation Roadmap
The target remains:
1. Node.js stable LTS upgrade.
2. Joi-to-Zod migration.
3. Authentication completion and testing.
4. Product feature completion and testing.
5. Product pagination.
6. Jest unit tests.
7. Clean Code Guard.
8. Test Guard.
9. Docs Guard.
10. Accurate implementation documentation.

> *The implementation order must follow the actual current project state. If a task is already complete, verify it and move forward. If partially complete, finish it. If broken, fix it. Do not blindly repeat all previous work.*

---

## 7. Protect the Existing Project Structure
* The existing architecture and folder structure must remain unchanged.
* Only make targeted changes inside existing locations.
* Any structural change, database schema change, breaking API change, or business-rule change requires approval first.

---

## 8. Reporting Requirements
Maintain `BACKEND_IMPLEMENTATION_REPORT.md` and include:
* What existed before.
* What was already completed.
* What was incomplete.
* What was fixed.
* What was added.
* Files changed and reasons.
* Dependencies installed, removed, or upgraded.
* Actual test results.
* Guard skill results.
* Remaining issues.

> *Distinguish clearly between previously existing work and newly implemented work.*

---

## 9. Execution Instruction
1. Start by reading the previous OpenCode report and inspecting the current repository.
2. Produce a concise implementation status assessment.
3. Continue implementation without recreating completed features.

> *You are expected to finish and improve the existing project, not start another project.*