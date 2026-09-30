import fs from 'node:fs';

const appPath = new URL('../web/src/App.tsx', import.meta.url);
const app = fs.readFileSync(appPath, 'utf8');

const requiredNavLabels = [
  'Dashboard',
  'Jobs',
  'Job Sources',
  'Crawling',
  'Universal Search',
  'Applications',
  'CVs',
  'Extension',
  'Analytics',
  'Settings',
];

const requiredShellMarkers = [
  'className="app-shell"',
  'sidebar-overlay',
  'className={`sidebar ${sidebarOpen ? \'open\' : \'\'}`}',
  '<TopBar',
  '<GlobalSearch',
  '<Dashboard',
  '<Jobs',
  '<JobSites',
  '<Crawling',
  '<UniversalSearch',
  '<Applications',
  '<CVs',
  '<ChromeExtension',
  '<Analytics',
  '<Settings',
];

const missingLabels = requiredNavLabels.filter((label) => !app.includes(`label: '${label}'`));
const missingMarkers = requiredShellMarkers.filter((marker) => !app.includes(marker));

if (missingLabels.length || missingMarkers.length) {
  console.error('v1.7 UI shell check failed.');
  if (missingLabels.length) console.error(`Missing navigation labels: ${missingLabels.join(', ')}`);
  if (missingMarkers.length) console.error(`Missing shell markers: ${missingMarkers.join(', ')}`);
  process.exit(1);
}

const forbiddenLegacyShells = ['HomePage', 'OpportunitiesPage', 'DiscoverPage', 'PrimaryNavigation'];
const legacy = forbiddenLegacyShells.filter((marker) => app.includes(marker));
if (legacy.length) {
  console.error(`Legacy shell marker(s) detected in App.tsx: ${legacy.join(', ')}`);
  process.exit(1);
}

console.log('v1.7 UI shell check passed.');
