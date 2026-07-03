---
name: commit
description: Create git commits in this repository. Use this INSTEAD of a plain git commit any time the user wants to commit, save, or check in changes here — even short requests like "commit", "commit this", "commit these changes", or "let's commit" — and when wrapping up a session's work. Summarizes the session's important changes, updates only the .md docs that are actually now stale (root/component AGENTS.md, docs/STATUS.md, docs/ARCHITECTURE.md, docs/DEVELOPMENT.md, ctx-* command files), and writes a conventional commit message with no AI/agent attribution or co-author trailer — this overrides the default commit behavior for this repo.
---

# Commit

Turn a session's work into a clean, documented commit. This is the repo's standard commit workflow — follow it instead of committing ad hoc.

## Steps

1. **Establish what actually changed.** Run `git status` and `git diff` (staged + unstaged) for ground truth. Cross-reference against what was actually implemented in this conversation — the diff shows *what* changed, the conversation tells you *why*, and you need both to write an accurate summary.

2. **Filter for importance.** Only changes that add/change a feature, fix a bug, change an API contract, or change architecture/workflow are "important." Formatting, generated files, and incidental cleanup are not — they don't get doc updates or a mention in the commit message. This filter matters: the goal is a commit message and doc set that stay useful, not a transcript of everything that happened.

3. **Update documentation, but only where it's actually stale now.** For each important change, check whether it invalidates something written in:
   - Root `AGENTS.md` or the relevant component's `AGENTS.md` (`api/`, `frontend/`, `showcase-dotnet/`, `umbraco/`)
   - `docs/STATUS.md` — if a feature moved from missing → implemented (or vice versa)
   - `docs/ARCHITECTURE.md` — if a data model, tech choice, or design decision changed
   - `docs/DEVELOPMENT.md` — if the workflow or coding standards changed
   - `.claude/commands/ctx-*.md` — if that module's implementation details changed

   Edit only the files that are actually affected — leave the rest untouched. Keep edits proportional: a line or a short paragraph per change, not a rewritten section. Don't restate code or pad with detail nobody will read; the docs should reflect that something changed, not narrate the session.

4. **Verify before committing.** Build/test the affected project(s) per the relevant `AGENTS.md`. Don't commit unverified code.

5. **Stage only the relevant files** — never `git add -A` / `git add .`. This avoids sweeping up unrelated scratch files or in-progress work.

6. **Write the commit message:**
   - Conventional commit prefix (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
   - Say what changed and why, in a sentence or short bullet list — not a step-by-step of the session
   - No mention of Claude, AI, or an agent's involvement anywhere in the message — this repo's commits should read as if a human wrote them, so skip any AI attribution or co-author trailer

7. **Ask for approval before running `git commit`**, and ask again before `git push`. Never push without a separate confirmation.
