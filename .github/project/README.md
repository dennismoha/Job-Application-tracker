# GitHub Roadmap Synchronization

This package treats the roadmap and GitHub Project as **two different kinds of truth**.

## Ownership model

### `roadmap.json` owns product definition
Use it for:
- Roadmap ID
- title
- description
- acceptance criteria
- type
- area
- priority
- architecture/layer
- effort

### GitHub Project owns operational state
Use GitHub for:
- Backlog / Ready / In Progress / Review / Done
- assignee
- comments
- PR links
- discussion
- board position
- labels/issues generated during implementation

### `project-state.json` is a local cache
It records:
- issue number
- issue/project node IDs
- current pulled Status
- last synced definition hash

It is **not** the product-definition source of truth.

## Features and bugs

Bugs use exactly the same model as features.

Example:

```json
{
  "id": "JI-200",
  "title": "Login returns 500 when session cookie is missing",
  "type": "Bug",
  "status": "Ready",
  "area": "Platform",
  "priority": "High",
  "layer": "Backend",
  "effort": "S",
  "description": "A missing session cookie causes the error handler to dereference a null error payload.",
  "acceptanceCriteria": [
    "Request returns a controlled 401 response",
    "Error handler never dereferences null error data",
    "Regression test covers the missing-cookie case"
  ]
}
```

A bug therefore becomes a normal GitHub Issue + Project card, but is explicitly typed as `Bug`.

## What happens when work moves through Kanban?

Suppose `JI-023` starts in `Backlog`.

You move it to:

`Backlog -> Ready -> In Progress -> Review -> Done`

Those moves happen in GitHub and are **not overwritten by `roadmap.json`**.

Running:

```bash
npm run github:roadmap:sync
```

will:
1. find existing roadmap IDs;
2. create only missing issues;
3. update issue definition only if the definition changed;
4. never reset the existing Project Status;
5. pull the live Project Status into `project-state.json`.

## Adding new work later

Add a new item such as `JI-200` to `roadmap.json`.

Then run:

```bash
npm run github:roadmap:sync
```

Existing items are recognized by immutable `JI-xxx` IDs. They are not recreated and their Kanban state is not reset. Only `JI-200` is created.

## Bugs discovered during development

For a newly discovered bug:
1. Add a new `JI-xxx` item with `"type": "Bug"`.
2. Give it its own acceptance criteria.
3. Run the sync.
4. Work the bug through the same Kanban.
5. Link the relevant PR to the GitHub issue.

For a bug that is already represented by an existing feature, prefer a **separate Bug card** if it needs independent tracking, ownership, review, or release verification. Reference the related feature in the bug description.

## What about bugs created directly in GitHub?

The current safe sync recognizes roadmap-managed cards by:

```text
Roadmap ID: `JI-xxx`
```

A GitHub issue created manually without a Roadmap ID is therefore not silently overwritten.

Recommended next step for a mature workflow: add a `pull --discover` mode that reports unclassified GitHub issues and lets you deliberately import them into `roadmap.json`.

## Commands

```bash
npm run github:roadmap:validate
npm run github:roadmap:push
npm run github:roadmap:pull
npm run github:roadmap:sync
npm run github:roadmap:sync -- --dry-run
```

Required environment:

```bash
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_PROJECT_NUMBER=
GITHUB_PROJECT_NODE_ID=
```

`GITHUB_PROJECT_NODE_ID` is required only when creating new issues and automatically adding them to the Project.

## Important Git rule

Do not treat every Kanban movement as a product-definition change.

That would create noisy commits like:

```text
"move JI-023 from Ready to In Progress"
"move JI-023 from In Progress to Review"
"move JI-023 from Review to Done"
```

Keep those operational changes in GitHub. Commit `roadmap.json` when the actual definition of the work changes.

This preserves both:
- Git history for the product definition
- GitHub history for execution
