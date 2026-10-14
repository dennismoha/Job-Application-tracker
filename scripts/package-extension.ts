import { execFileSync } from 'node:child_process';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ExtensionManifest {
  manifest_version: number;
  name: string;
  version: string;
  host_permissions?: string[];
  action?: { default_popup?: string };
  options_page?: string;
  background?: { service_worker?: string };
  icons?: Record<string, string>;
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const extensionDirectory = path.join(projectRoot, 'browser-extension');
const outputDirectory = path.join(projectRoot, 'dist', 'extension');
const zipPath = path.join(projectRoot, 'dist', 'job-intelligence-companion.zip');
const productionApiOrigin = 'https://job-application-tracker-k0jm.onrender.com';
const excludedEntries = new Set([
  '.DS_Store',
  '.env',
  '.env.local',
  '.git',
  '.github',
  'coverage',
  'node_modules',
  'tests',
  '__tests__',
]);

async function exists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateManifest(
  manifest: ExtensionManifest,
  packagedDirectory: string,
): Promise<void> {
  if (manifest.manifest_version !== 3) {
    throw new Error('Expected a Manifest V3 extension.');
  }
  if (!manifest.name?.trim() || !manifest.version?.trim()) {
    throw new Error('The extension manifest must include a name and version.');
  }

  const referencedFiles = [
    manifest.action?.default_popup,
    manifest.options_page,
    manifest.background?.service_worker,
    ...Object.values(manifest.icons ?? {}),
  ].filter((file): file is string => Boolean(file));

  for (const file of referencedFiles) {
    const resolvedFile = path.resolve(packagedDirectory, file);
    if (!resolvedFile.startsWith(`${packagedDirectory}${path.sep}`)) {
      throw new Error(`Manifest path escapes the extension directory: ${file}`);
    }
    if (!(await exists(resolvedFile))) {
      throw new Error(`Manifest references a missing file: ${file}`);
    }
  }
}

async function copyExtension(source: string, destination: string): Promise<void> {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (excludedEntries.has(entry.name) || entry.name.endsWith('.map')) continue;
    if (
      entry.isFile() &&
      (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js'))
    ) {
      continue;
    }

    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyExtension(from, to);
    } else if (entry.isFile()) {
      await cp(from, to);
    }
  }
}

async function main(): Promise<void> {
  const sourceManifestPath = path.join(extensionDirectory, 'manifest.json');
  if (!(await exists(sourceManifestPath))) {
    throw new Error(`Extension manifest not found: ${sourceManifestPath}`);
  }

  const manifest = JSON.parse(
    await readFile(sourceManifestPath, 'utf8'),
  ) as ExtensionManifest;

  await rm(outputDirectory, { recursive: true, force: true });
  await rm(zipPath, { force: true });
  await mkdir(outputDirectory, { recursive: true });
  await copyExtension(extensionDirectory, outputDirectory);

  manifest.host_permissions = [
    ...new Set([
      ...(manifest.host_permissions ?? []).filter(
        (permission) =>
          !/^https?:\/\/localhost(?::\d+)?\//.test(permission) &&
          !permission.startsWith(productionApiOrigin),
      ),
      `${productionApiOrigin}/*`,
    ]),
  ];
  await writeFile(
    path.join(outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await validateManifest(manifest, outputDirectory);

  await mkdir(path.dirname(zipPath), { recursive: true });
  execFileSync('zip', ['-r', '-X', zipPath, '.'], {
    cwd: outputDirectory,
    stdio: 'inherit',
  });

  console.log(`Extension files staged at: ${outputDirectory}`);
  console.log(`Chrome Web Store package created: ${zipPath}`);
}

void main();
