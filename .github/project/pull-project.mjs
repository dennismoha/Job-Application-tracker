#!/usr/bin/env node
/**
 * Pull live GitHub Project state into project-state.json.
 *
 * This intentionally does NOT modify roadmap.json.
 * Kanban Status, assignees and other operational state belong to GitHub.
 */
import fs from "node:fs";

const projectDir = new URL(".", import.meta.url);
const statePath = new URL("./project-state.json", projectDir);
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

const token = process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_OWNER;
const projectNumber = Number(process.env.GITHUB_PROJECT_NUMBER);

if (!token || !owner || !projectNumber) {
  console.error("Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_PROJECT_NUMBER.");
  process.exit(1);
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
  if (!response.ok || data.errors) throw new Error(JSON.stringify(data.errors ?? data));
  return data.data;
}

const data = await gql(`
  query($owner:String!,$number:Int!) {
    user(login:$owner) {
      projectV2(number:$number) {
        id
        items(first:100) {
          nodes {
            id
            content {
              ... on Issue {
                number
                title
                body
                state
              }
            }
            fieldValues(first:30) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field { ... on ProjectV2Field { name } }
                }
              }
            }
          }
        }
      }
    }
  }`, { owner, number: projectNumber });

const items = data.user.projectV2.items.nodes;
const byRoadmapId = {};

for (const item of items) {
  const issue = item.content;
  if (!issue?.body) continue;
  const match = issue.body.match(/Roadmap ID:\s*`(JI-\d+)`/);
  if (!match) continue;

  const roadmapId = match[1];
  const values = item.fieldValues.nodes ?? [];
  const statusField = values.find((v) => v.field?.name === "Status" && v.name);

  byRoadmapId[roadmapId] = {
    ...(state.items[roadmapId] ?? {}),
    issueNumber: issue.number,
    projectItemId: item.id,
    issueState: issue.state,
    status: statusField?.name ?? null,
    lastPulledAt: new Date().toISOString()
  };
}

state.items = byRoadmapId;
fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");

console.log(`Pulled ${Object.keys(byRoadmapId).length} roadmap items from GitHub.`);
