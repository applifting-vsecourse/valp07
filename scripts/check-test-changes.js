#!/usr/bin/env node
const { execFileSync } = require('node:child_process');

const baseRef = process.argv[2] || 'origin/main';

const output = execFileSync(
  'git',
  [
    'diff',
    '--numstat',
    `${baseRef}...HEAD`,
    '--',
    '*.spec.ts',
    '*.int-spec.ts',
    '*.test.tsx',
    'apps/frontend/e2e',
  ],
  { encoding: 'utf8' },
).trim();

if (!output) {
  console.log('No test files changed.');
  process.exit(0);
}

const offendingFiles = [];
for (const line of output.split('\n')) {
  const [added, deleted, file] = line.split('\t');
  if (deleted && deleted !== '0') {
    offendingFiles.push({ file, added, deleted });
  }
}

if (offendingFiles.length > 0) {
  console.error('The following test files have removed or rewritten lines:');
  for (const { file, added, deleted } of offendingFiles) {
    console.error(`  ${file} (+${added} / -${deleted})`);
  }
  process.exit(1);
}

console.log('All test file changes are additions only.');
