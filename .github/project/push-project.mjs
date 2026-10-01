#!/usr/bin/env node
/**
 * Push roadmap definitions to GitHub without overwriting live Kanban state.
 *
 * Ownership:
 * - roadmap.json: product/work-item definitions.
 * - GitHub Project: live Status, assignee, comments, PRs, board position.
 * - project-state.json: optional local mapping/cache.
 *
 * Existing items are identified by immutable Roadmap ID (JI-xxx).
 * Existing GitHub issue descriptions are only updated when the definition changed.
 * Project Status is NEVER overwritten by this script.
 */
import fs from "node:fs";
import crypto from "node:crypto";

const projectDir = new URL(".", import.meta.url);
const roadmap = JSON.parse(fs.readFileSync(new URL("./roadmap.json", projectDir), "utf8"));
const statePath = new URL("./project-state.json", projectDir);
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const validateOnly = args.has("--validate");

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const projectNumber = Number(process.env.GITHUB_PROJECT_NUMBER);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!Array.isArray(roadmap.items)) fail("roadmap.json must contain an items array.");

const validTypes = new Set(["Feature", "Bug", "Architecture", "Engineering", "Infrastructure", "Documentation", "Security", "UX"]);
const validStatuses = new Set(["Backlog", "Ready", "In Progress", "Review", "Done"]);
const validPriorities = new Set(["Critical", "High", "Medium", "Low"]);

for (const item of roadmap.items) {
  if (!/^JI-\d+$/.test(item.id)) fail(`Invalid roadmap ID: ${item.id}`);
  if (!item.title?.trim()) fail(`${item.id}: title is required`);
  if (!validTypes.has(item.type)) fail(`${item.id}: unsupported type "${item.type}"`);
  if (!validStatuses.has(item.status)) fail(`${item.id}: unsupported status "${item.status}"`);
  if (!validPriorities.has(item.priority)) fail(`${item.id}: unsupported priority "${item.priority}"`);
  if (!Array.isArray(item.acceptanceCriteria)) fail(`${item.id}: acceptanceCriteria must be an array`);
}

if (validateOnly) {
  console.log(`Validated ${roadmap.items.length} roadmap items.`);
  process.exit(0);
}

if (!token || !owner || !repo || !projectNumber) {
  fail("Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO and GITHUB_PROJECT_NUMBER.");
}

async function gql(query, variables = {}) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "job-intelligence-roadmap-sync"
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await response.json();
  if (!response.ok || data.errors) {
    throw new Error(JSON.stringify(data.errors ?? data));
  }
  return data.data;
}

function definitionHash(item) {
  const definition = {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    acceptanceCriteria: item.acceptanceCriteria ?? [],
    type: item.type,
    area: item.area,
    priority: item.priority,
    layer: item.layer,
    effort: item.effort
  };
  return crypto.createHash("sha256").update(JSON.stringify(definition)).digest("hex");
}

function issueBody(item) {
  const criteria = item.acceptanceCriteria.map((x) => `- [ ] ${x}`).join("\n");
  return [
    `## ${item.title}`,
    "",
    item.description ?? "",
    "",
    "## Acceptance Criteria",
    criteria || "- [ ] Define acceptance criteria",
    "",
    "## Roadmap Metadata",
    `- Roadmap ID: \`${item.id}\``,
    `- Type: ${item.type}`,
    `- Area: ${item.area}`,
    `- Priority: ${item.priority}`,
    `- Layer: ${item.layer}`,
    `- Effort: ${item.effort}`,
    "",
    "<!-- ROADMAP-MANAGED: definition below this marker may be updated by roadmap push. -->"
  ].join("\n");
}

async function findIssue(roadmapId) {
  const q = `repo:${owner}/${repo} in:body "Roadmap ID: \\\`${roadmapId}\\\`"`;
  const data = await gql(`
    query($q:String!) {
      search(query:$q, type:ISSUE, first:10) {
        nodes {
          ... on Issue { id number title body url }
        }
      }
    }`, { q });
  return data.search.nodes[0] ?? null;
}

async function createIssue(item) {
  const data = await gql(`
    mutation($input:CreateIssueInput!) {
      createIssue(input:$input) {
        issue { id number title body url }
      }
    }`, {
      input: {
        repositoryId: (await gql(`
          query($owner:String!,$repo:String!) {
            repository(owner:$owner,name:$repo) { id }
          }`, { owner, repo })).repository.id,
        title: `[${item.id}] ${item.title}`,
        body: issueBody(item)
      }
    });
  return data.createIssue.issue;
}

async function updateIssue(issueId, body, title) {
  const data = await gql(`
    mutation($input:UpdateIssueInput!) {
      updateIssue(input:$input) {
        issue { id number title body url }
      }
    }`, { input: { id: issueId, title, body } });
  return data.updateIssue.issue;
}

async function addToProject(contentId) {
  const data = await gql(`
    mutation($input:AddProjectV2ItemByIdInput!) {
      addProjectV2ItemById(input:$input) {
        item { id }
      }
    }`, {
      input: { projectId: process.env.GITHUB_PROJECT_NODE_ID, contentId }
    });
  return data.addProjectV2ItemById.item.id;
}

for (const item of roadmap.items) {
  const hash = definitionHash(item);
  const existing = await findIssue(item.id);

  if (!existing) {
    if (dryRun) {
      console.log(`[CREATE] ${item.id} ${item.title} (${item.type})`);
      continue;
    }
    const created = await createIssue(item);
    let projectItemId = null;
    if (process.env.GITHUB_PROJECT_NODE_ID) {
      projectItemId = await addToProject(created.id);
    }
    state.items[item.id] = {
      issueNumber: created.number,
      issueNodeId: created.id,
      projectItemId,
      lastSyncedDefinitionHash: hash
    };
    console.log(`[CREATE] ${item.id} -> #${created.number}`);
    continue;
  }

  const previousHash = state.items[item.id]?.lastSyncedDefinitionHash;
  if (previousHash !== hash && !dryRun) {
    await updateIssue(existing.id, issueBody(item), `[${item.id}] ${item.title}`);
    console.log(`[UPDATE DEFINITION] ${item.id} -> #${existing.number}`);
  } else if (previousHash !== hash) {
    console.log(`[UPDATE DEFINITION] ${item.id} -> #${existing.number}`);
  } else {
    console.log(`[UNCHANGED] ${item.id} -> #${existing.number}`);
  }

  state.items[item.id] = {
    ...(state.items[item.id] ?? {}),
    issueNumber: existing.number,
    issueNodeId: existing.id,
    lastSyncedDefinitionHash: hash
  };
}

if (!dryRun) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}
