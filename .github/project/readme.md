# GitHub Roadmap Automation

This directory contains the automation used to maintain the **Job Intelligence Platform roadmap** in GitHub.

The system connects the project's local roadmap definition to:

* GitHub Issues
* GitHub Projects V2
* Project fields such as Status, Priority, Type, etc.
* Local synchronization state

The purpose of this system is to allow the roadmap to remain defined in the repository while GitHub provides the live project-management interface.

This document is intended to be a **handover and maintenance guide**. A developer who has never worked on this project should be able to understand the files, configure GitHub access, run the commands, troubleshoot failures, and safely modify the roadmap.

---

# 1. Directory Structure

The repository uses the following structure:

```text
job-intelligence-platform/
│
├── .env
├── package.json
│
└── .github/
    └── project/
        ├── README.md
        ├── roadmap.json
        ├── project-state.json
        ├── push-project.mjs
        ├── pull-project.mjs
        └── sync-project.mjs
```

The root configuration and the `.github/project` directory work together.

## Root files

### `.env`

Contains the private GitHub configuration used by the Node scripts.

Typical values:

```env
GITHUB_TOKEN=github_pat_...
GITHUB_OWNER=your-github-username-or-organization
GITHUB_REPO=job-intelligence-platform
GITHUB_PROJECT_NUMBER=3
GITHUB_PROJECT_NODE_ID=PVT_...
```

Do **not** commit `.env`.

A safe repository should instead contain an `.env.example` containing empty values:

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_PROJECT_NUMBER=
GITHUB_PROJECT_NODE_ID=
```

### `package.json`

Provides the commands used to operate the roadmap automation.

Current commands:

```json
{
  "github:roadmap:validate": "node .github/project/push-project.mjs --validate",
  "github:roadmap:push": "node --env-file=.env .github/project/push-project.mjs",
  "github:roadmap:pull": "node --env-file=.env .github/project/pull-project.mjs",
  "github:roadmap:sync": "node --env-file=.env .github/project/sync-project.mjs",
  "github:roadmap:sync:dry": "node --env-file=.env .github/project/sync-project.mjs --dry-run"
}
```

These commands are described in detail later.

---

# 2. Architecture

The simplest way to understand the system is:

```text
                         LOCAL REPOSITORY
                         ================

                         roadmap.json
                              │
                              │
                              ▼
                     push-project.mjs
                              │
                              │ GitHub GraphQL API
                              ▼
                     ┌──────────────────┐
                     │ GitHub Repository│
                     │                  │
                     │ Issues           │
                     └────────┬─────────┘
                              │
                              │ Project item
                              ▼
                     ┌──────────────────┐
                     │ GitHub Project   │
                     │ Projects V2      │
                     │                  │
                     │ Status           │
                     │ Priority         │
                     │ Type             │
                     │ Assignee         │
                     │ Board position   │
                     └────────┬─────────┘
                              │
                              │
                              ▼
                     pull-project.mjs
                              │
                              ▼
                    Local project state
```

The synchronization layer is:

```text
sync-project.mjs
       │
       ├── push-project.mjs
       │
       └── pull-project.mjs
```

In other words, `sync-project.mjs` is an orchestrator. It does not contain the actual roadmap-to-GitHub logic.

---

# 3. Source of Truth

There are several different kinds of information in this system.

They should not be treated as interchangeable.

## `roadmap.json`

Contains the **product/work-item definition**.

Examples:

* roadmap ID
* title
* description
* acceptance criteria
* type
* area
* priority
* layer
* effort
* status

The immutable identifier is the roadmap ID:

```text
JI-001
JI-002
JI-003
```

The ID is important because titles can change while the underlying work item remains the same.

---

# 4. GitHub Issues vs GitHub Project

The system uses GitHub Issues and GitHub Projects for different purposes.

## GitHub Issue

Represents the actual work item.

The issue contains information such as:

```text
[JI-123] Implement Job Source crawling
```

and its description contains:

* description
* acceptance criteria
* roadmap metadata
* Roadmap ID

## GitHub Project

Represents the live project-management state.

The Project can contain information such as:

* Status
* Priority
* Assignee
* comments
* project position
* linked pull requests
* other live Project fields

The important principle is:

> The roadmap defines what the work item is. GitHub Project state describes what is happening to the work item.

---

# 5. Ownership Rules

The scripts intentionally separate ownership of data.

## `roadmap.json` owns

```text
Roadmap ID
Title
Description
Acceptance Criteria
Type
Area
Priority
Layer
Effort
```

## GitHub Project owns live Kanban state

Examples:

```text
Status
Assignee
Board position
Comments
Pull requests
Other live project-management state
```

This distinction is important.

`push-project.mjs` is designed **not to overwrite live Project Status**.

For example, if:

```text
roadmap.json
Status = Backlog
```

but somebody has moved the GitHub Project item to:

```text
In Progress
```

the roadmap push should not blindly move the live Project item back to `Backlog`.

The Project is being used as the live operational board.

---

# 6. `roadmap.json`

`roadmap.json` is intentionally a large file.

It contains the project's roadmap definitions.

Each roadmap item has an immutable ID.

Example:

```json
{
  "id": "JI-001",
  "title": "Example feature",
  "description": "Description of the feature.",
  "type": "Feature",
  "area": "Jobs",
  "priority": "High",
  "layer": "Backend",
  "effort": "Medium",
  "status": "Ready",
  "acceptanceCriteria": [
    "The feature can be created.",
    "The feature can be edited.",
    "The feature is tested."
  ]
}
```

The actual roadmap contains many more items.

Do not be concerned about the file being long. It is acting as the structured product roadmap.

---

# 7. Roadmap IDs

Every roadmap item must have an ID matching:

```text
JI-<number>
```

For example:

```text
JI-001
JI-002
JI-100
JI-250
```

The validation code enforces:

```javascript
/^JI-\d+$/
```

The Roadmap ID is used to identify the same work item across synchronization operations.

It is also written into the GitHub Issue body:

```text
Roadmap ID: `JI-001`
```

This allows the script to locate the corresponding GitHub Issue later.

---

# 8. Valid Roadmap Types

The current implementation accepts:

```text
Feature
Bug
Architecture
Engineering
Infrastructure
Documentation
Security
UX
```

These values are validated by `push-project.mjs`.

If a new type is added to `roadmap.json` but not added to the validation set, validation will fail.

For example:

```text
unsupported type "Research"
```

To add a new type, both the roadmap and the relevant GitHub Project configuration may need to be updated.

---

# 9. Valid Roadmap Statuses

The current accepted statuses are:

```text
Backlog
Ready
In Progress
Review
Done
```

These are roadmap-definition values.

The important distinction is that the push script does not use this information to overwrite the live GitHub Project Status.

---

# 10. Valid Priorities

The current accepted priorities are:

```text
Critical
High
Medium
Low
```

These are validated before any GitHub mutation is performed.

---

# 11. Acceptance Criteria

Every roadmap item must contain:

```json
"acceptanceCriteria": []
```

The value must be an array.

The acceptance criteria are converted into GitHub Issue checkboxes.

For example:

```json
"acceptanceCriteria": [
  "User can create a job",
  "User can edit a job"
]
```

becomes:

```markdown
## Acceptance Criteria

- [ ] User can create a job
- [ ] User can edit a job
```

---

# 12. `push-project.mjs`

This is the main roadmap-to-GitHub script.

Its responsibility is to take the definitions in `roadmap.json` and ensure the corresponding GitHub Issues exist and contain the current roadmap definition.

It also optionally adds newly created Issues to the GitHub Project.

---

# 13. How `push-project.mjs` starts

The script reads:

```javascript
const projectDir = new URL(".", import.meta.url);
```

It then loads:

```text
./roadmap.json
./project-state.json
```

relative to the script itself.

This means the script does not depend on the developer's current working directory.

It can be launched from the root with:

```bash
npm run github:roadmap:push
```

---

# 14. Project State

`project-state.json` is a local mapping/cache used by the push process.

Conceptually it stores mappings such as:

```text
JI-001
   │
   ├── GitHub issue number
   ├── GitHub issue node ID
   ├── Project item ID
   └── last synced definition hash
```

Example structure:

```json
{
  "items": {
    "JI-001": {
      "issueNumber": 123,
      "issueNodeId": "...",
      "projectItemId": "...",
      "lastSyncedDefinitionHash": "..."
    }
  }
}
```

The exact file should be treated as generated synchronization state rather than the product roadmap itself.

If this file is missing, `push-project.mjs` currently expects it to exist and be valid JSON.

---

# 15. Definition Hashing

The push script calculates a SHA-256 hash from the roadmap definition.

The hash includes:

```text
id
title
description
acceptanceCriteria
type
area
priority
layer
effort
```

This allows the script to determine whether the definition has changed since the previous synchronization.

For example:

```text
roadmap.json
    │
    ▼
definitionHash()
    │
    ▼
SHA-256
    │
    ▼
project-state.json
```

If the hash has not changed:

```text
[UNCHANGED]
```

If it has changed:

```text
[UPDATE DEFINITION]
```

---

# 16. Finding Existing Issues

The script searches GitHub for an Issue containing the Roadmap ID.

Conceptually:

```text
repo:OWNER/REPOSITORY
in:body
"Roadmap ID: `JI-123`"
```

This is why the Roadmap ID inside the Issue body is important.

The title is not the primary identity.

The immutable Roadmap ID is.

---

# 17. Creating an Issue

If no existing Issue is found, the script creates one.

The title follows:

```text
[JI-123] Original roadmap title
```

The Issue body contains:

```text
## Title

Description

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Roadmap Metadata

- Roadmap ID: `JI-123`
- Type: Feature
- Area: ...
- Priority: ...
- Layer: ...
- Effort: ...
```

---

# 18. Updating an Existing Issue

If an Issue already exists, the script compares the current roadmap definition with the previous stored definition hash.

If the definition changed, the Issue title/body can be updated.

If nothing changed:

```text
[UNCHANGED]
```

No unnecessary Issue update is performed.

---

# 19. Adding an Issue to the Project

When a new Issue is created, the script can add it to the GitHub Project.

This is controlled by:

```env
GITHUB_PROJECT_NODE_ID=PVT_...
```

The GraphQL mutation used is:

```text
addProjectV2ItemById
```

The operation receives:

```text
projectId
contentId
```

where:

```text
projectId = GitHub Project node ID
contentId = GitHub Issue node ID
```

This distinction is important.

The Project number:

```text
3
```

is not the same thing as the Project node ID:

```text
PVT_...
```

---

# 20. Project Number vs Project Node ID

GitHub exposes both concepts.

## Project Number

Human-readable number:

```text
3
```

Usually visible in a Project URL such as:

```text
/projects/3
```

This is used by:

```env
GITHUB_PROJECT_NUMBER=3
```

## Project Node ID

GraphQL global ID:

```text
PVT_...
```

This is used for GraphQL mutations such as:

```text
addProjectV2ItemById
```

Configured as:

```env
GITHUB_PROJECT_NODE_ID=PVT_...
```

Do not substitute one for the other.

---

# 21. `sync-project.mjs`

`sync-project.mjs` is the orchestration script.

It does not implement the roadmap synchronization logic itself.

It invokes the other scripts.

The current flow is:

```text
sync-project.mjs
       │
       ▼
push-project.mjs
       │
       ▼
GitHub
       │
       ▼
pull-project.mjs
```

The pull step only runs when the sync is not a dry run.

---

# 22. Normal Sync

Running:

```bash
npm run github:roadmap:sync
```

causes:

```text
sync-project.mjs
      │
      ├── push-project.mjs
      │
      └── pull-project.mjs
```

The environment is inherited by the child processes.

The `.env` file is loaded by Node through:

```bash
node --env-file=.env
```

before `sync-project.mjs` starts.

---

# 23. Dry-Run Sync

Running:

```bash
npm run github:roadmap:sync:dry
```

passes:

```text
--dry-run
```

to `sync-project.mjs`.

`sync-project.mjs` then passes the same flag to:

```text
push-project.mjs
```

The resulting flow is:

```text
sync-project.mjs --dry-run
        │
        ▼
push-project.mjs --dry-run
```

The pull operation is skipped.

This is intentional.

A dry run should allow the developer to see what the push operation intends to do without performing the mutations.

Example output:

```text
[CREATE] JI-001 Example feature (Feature)
[UPDATE DEFINITION] JI-002 -> #125
[UNCHANGED] JI-003 -> #126
```

---

# 24. Validation

The validation command is:

```bash
npm run github:roadmap:validate
```

This runs:

```bash
node .github/project/push-project.mjs --validate
```

The `--validate` flag causes the script to validate `roadmap.json` and exit before GitHub authentication is required.

This makes it useful for checking the roadmap locally.

For example:

```text
Validated 128 roadmap items.
```

No GitHub mutation is performed.

---

# 25. Environment Variables

The GitHub automation requires:

```env
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_PROJECT_NUMBER=
GITHUB_PROJECT_NODE_ID=
```

## `GITHUB_TOKEN`

Personal access token used to authenticate GitHub GraphQL requests.

The token must have sufficient permissions for the operations being performed.

Never commit it.

Never place it in:

```text
roadmap.json
project-state.json
README.md
package.json
source code
```

---

# 26. `GITHUB_OWNER`

The GitHub user or organization that owns the repository.

Example:

```env
GITHUB_OWNER=myusername
```

or:

```env
GITHUB_OWNER=my-organization
```

---

# 27. `GITHUB_REPO`

The GitHub repository name.

Example:

```env
GITHUB_REPO=job-intelligence-platform
```

Do not include:

```text
https://github.com/
```

The script expects the repository name.

---

# 28. `GITHUB_PROJECT_NUMBER`

The human-readable GitHub Project number.

Example:

```env
GITHUB_PROJECT_NUMBER=3
```

This is not the GraphQL Project node ID.

---

# 29. `GITHUB_PROJECT_NODE_ID`

The GraphQL node ID of the GitHub Project.

Example:

```env
GITHUB_PROJECT_NODE_ID=PVT_kwDO...
```

This is used when adding an Issue to the Project.

---

# 30. Finding the Project with GitHub CLI

GitHub CLI can be used to inspect Projects.

For a user-owned Project:

```bash
gh api graphql -f query='
query {
  viewer {
    projectsV2(first: 100) {
      nodes {
        id
        number
        title
      }
    }
  }
}'
```

To locate a specific Project:

```bash
gh api graphql -f query='
query {
  viewer {
    projectsV2(first: 100) {
      nodes {
        id
        number
        title
      }
    }
  }
}' | jq -r '.data.viewer.projectsV2.nodes[] | select(.title == "Job Intelligence Platform Roadmap") | "number=\(.number) id=\(.id)"'
```

Example:

```text
number=3 id=PVT_kwDO...
```

Use:

```env
GITHUB_PROJECT_NUMBER=3
GITHUB_PROJECT_NODE_ID=PVT_kwDO...
```

---

# 31. GitHub Token Permissions

Authentication and authorization are different things.

A token can successfully authenticate to GitHub while still being unable to perform a specific operation.

For example:

```text
Resource not accessible by personal access token
```

does not necessarily mean that the token is invalid.

It can mean:

```text
Authentication succeeded
        │
        ▼
GitHub recognized the token
        │
        ▼
Requested operation
        │
        ▼
Token lacks required permission
```

The exact permissions required depend on the operations being performed and whether the repository/project is user-owned or organization-owned.

At minimum, verify that the token has access to:

* the target repository
* Issues, where Issue creation/update is required
* Projects, where Project operations are required
* Pull Requests if future automation modifies pull-request data

For organization-owned resources, organization policies may additionally require approval.

---

# 32. Testing Authentication

Check the GitHub CLI identity:

```bash
gh auth status
```

Check the authenticated GitHub user:

```bash
gh api user
```

These commands test the credentials used by `gh`.

They do **not automatically prove that `GITHUB_TOKEN` in `.env` has the same permissions**.

The Node scripts use:

```env
GITHUB_TOKEN
```

directly.

Therefore, always verify the token used by the application when debugging authorization problems.

---

# 33. GitHub GraphQL API

The Node scripts communicate directly with:

```text
https://api.github.com/graphql
```

The request is made using Node's built-in `fetch`.

Authentication is provided through:

```http
Authorization: Bearer <token>
```

The scripts therefore do not require the GitHub CLI to execute.

`gh` is useful for administration and troubleshooting, but the roadmap scripts communicate directly with GitHub.

---

# 34. Why Node Does Not Automatically Read `.env`

The scripts use:

```bash
node --env-file=.env
```

because Node does not automatically load an arbitrary `.env` file merely because it exists.

For example:

```bash
node .github/project/push-project.mjs
```

does not necessarily populate:

```javascript
process.env.GITHUB_TOKEN
```

from `.env`.

The package scripts therefore deliberately use:

```bash
node --env-file=.env
```

for commands that require GitHub credentials.

---

# 35. Why `sync-project.mjs` Can Access the Environment

`sync-project.mjs` launches `push-project.mjs` using:

```javascript
spawnSync(...)
```

and explicitly passes:

```javascript
env: process.env
```

Therefore the child process receives the environment of the parent process.

The flow is:

```text
npm
 │
 ▼
node --env-file=.env sync-project.mjs
 │
 │ process.env
 ▼
sync-project.mjs
 │
 │ env: process.env
 ▼
push-project.mjs
```

This is why `push-project.mjs` can read:

```javascript
process.env.GITHUB_TOKEN
```

even though `sync-project.mjs` does not itself parse `.env`.

---

# 36. Running the System

## First: validate the roadmap

```bash
npm run github:roadmap:validate
```

This checks the local roadmap structure.

---

## Second: run a dry run

```bash
npm run github:roadmap:sync:dry
```

Review the output.

You should see operations such as:

```text
[CREATE]
[UPDATE DEFINITION]
[UNCHANGED]
```

Do not treat dry-run output as confirmation that GitHub permissions are sufficient for every mutation. A dry run deliberately avoids performing those mutations.

---

## Third: push

Once the dry-run output is understood:

```bash
npm run github:roadmap:push
```

This performs the roadmap-to-GitHub push.

---

## Fourth: pull

```bash
npm run github:roadmap:pull
```

The exact behavior of this command is defined by:

```text
pull-project.mjs
```

That script should be consulted before manually modifying files that it manages.

---

## Full synchronization

```bash
npm run github:roadmap:sync
```

This runs the push and then the pull operation.

---

# 37. Recommended Development Workflow

When changing the roadmap:

```text
1. Edit roadmap.json
       │
       ▼
2. Validate
       │
       └── npm run github:roadmap:validate
       │
       ▼
3. Dry run
       │
       └── npm run github:roadmap:sync:dry
       │
       ▼
4. Review output
       │
       ▼
5. Push
       │
       └── npm run github:roadmap:push
       │
       ▼
6. Verify GitHub
       │
       ▼
7. Pull/sync if required
```

Avoid directly editing generated synchronization state unless recovering from a known problem.

---

# 38. Adding a New Roadmap Item

Add a new item to:

```text
.github/project/roadmap.json
```

Give it a new immutable ID:

```text
JI-XXX
```

Do not reuse an existing ID.

Example:

```json
{
  "id": "JI-250",
  "t
```
