import mermaid from 'mermaid';
import './styles.css';

const flowModules = import.meta.glob('../flows/**/*.mmd', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const flowEntries = Object.entries(flowModules)
  .map(([path, source]) => ({
    path,
    source,
    name: path
      .split('/')
      .pop()
      ?.replace(/\.mmd$/, '')
      .replaceAll('-', ' ') ?? path,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

const flowList = document.querySelector<HTMLElement>('#flow-list');
const flowTitle = document.querySelector<HTMLElement>('#flow-title');
const diagram = document.querySelector<HTMLElement>('#diagram');

if (!flowList || !flowTitle || !diagram) {
  throw new Error('Mermaid viewer could not find its required page elements.');
}

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
});

async function renderFlow(name: string, source: string): Promise<void> {
  flowTitle.textContent = name;
  diagram.innerHTML = '';

  try {
    const id = `flow-${Date.now()}`;
    const { svg } = await mermaid.render(id, source);
    diagram.innerHTML = svg;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Mermaid rendering error.';
    diagram.textContent = message;
  }
}

for (const [index, flow] of flowEntries.entries()) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = flow.name;
  button.addEventListener('click', () => {
    void renderFlow(flow.name, flow.source);
  });
  flowList.append(button);

  if (index === 0) {
    void renderFlow(flow.name, flow.source);
  }
}
