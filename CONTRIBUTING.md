# Contributing

This repository uses npm workspaces:

- `sdk`
- `web`
- `docs`
- `examples`

## 1. Local setup

```bash
npm install
```

## 2. Common commands

```bash
npm test
npm run typecheck
npm run docs:check
npm run docs:build
```

## 3. Change scope

- Keep changes scoped to the target module.
- Do not modify unrelated files in the same commit.
- Do not import internal SDK paths such as `sdk/src/**` from external usage examples.

## 4. Commit requirements

- Use clear commit messages with scope, for example:
  - `docs(sdk): ...`
  - `feat(sdk): ...`
  - `fix(web): ...`
- Include tests or checks when behavior changes.

## 5. Pull request requirements

- Describe what changed and why.
- List verification commands and outcomes.
- Confirm docs updates for any user-visible change.
- Confirm no breaking changes, or document them explicitly.

## 6. Definition of done

A change is ready to merge when:

- required checks pass locally,
- docs are updated,
- PR template items are completed.
