---
name: ship
description: Executes the final verification, commit, and push sequence to finalize a task.
---

# Ship Skill

Use this skill strictly to finalize and deploy completed work. You must execute the following sequence in exact order. Do not proceed to the next step if the current step fails.

## Execution Sequence

1. **Verify Quality:** Run `pnpm verify`.
   - If the command fails, immediately stop the shipping process, analyze the terminal errors, and fix the codebase.
   - If the command succeeds, proceed to Step 2.

2. **Stage Files:** Run `git status` to identify modified files. Stage only the specific files relevant to your task using:
   `git add <file1> <file2>`

3. **Commit:** Create a Conventional Commit (all-lowercase subject) and execute:
   `git commit -m "type(scope): description"`

4. **Push:** Upload the changes to the repository:
   `git push`

## Rules
- You are required to fix any pre-existing warnings or test failures in the packages you modify before committing.
- If a test fails that you cannot fix, stop and ask the user how to proceed.
