---
name: ship
description: Stage, commit, and push completed work. Hooks enforce the gate chain.
---

# Ship Skill

1. **Stage:** `git status`, then `git add <file1> <file2>` for the files relevant to this task.
2. **Commit:** Conventional Commit, all-lowercase subject. `git commit -m "type(scope): description"`.
3. **Push:** `git push`.

Pre-commit and pre-push hooks (`lefthook.yml`) run the gate chain. If a hook fails, fix the failure and re-run — do not use `--no-verify` on agent authority.

If a pre-existing failure surfaces in a package you modified, fix it in the same commit (see `AGENTS.md` §Cleanup radius). If you cannot, stop and ask the user.
