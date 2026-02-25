#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const bootstrap = path.resolve(__dirname, 'bootstrap.js');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rockets-bootstrap-smoke-'));
const fixture = path.join(tempRoot, 'fixture-project');
fs.mkdirSync(fixture, { recursive: true });

fs.writeFileSync(path.join(fixture, '.env.example'), 'PORT=3000\n');
fs.writeFileSync(
  path.join(fixture, 'package.json'),
  JSON.stringify({
    name: 'fixture-project',
    private: true,
    scripts: {
      build: 'node -e "console.log(\'build ok\')"',
      test: 'node -e "console.log(\'test ok\')"',
    },
  }, null, 2),
);

const result = spawnSync('node', [
  bootstrap,
  '--skip-clone',
  '--dest',
  fixture,
  '--run-build',
  '--run-test',
  '--json',
], { encoding: 'utf8', stdio: 'pipe' });

if (result.status !== 0) {
  console.error('FAIL bootstrap exited non-zero');
  console.error(result.stdout);
  console.error(result.stderr);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout);
} catch (err) {
  console.error('FAIL invalid JSON output');
  console.error(result.stdout);
  process.exit(1);
}

if (!fs.existsSync(path.join(fixture, '.env'))) {
  console.error('FAIL .env not created from .env.example');
  process.exit(1);
}

const checks = parsed.checks || [];
const build = checks.find((c) => c.name === 'build');
const test = checks.find((c) => c.name === 'test');

if (!build || build.ok !== true) {
  console.error('FAIL build check did not pass');
  process.exit(1);
}

if (!test || test.ok !== true) {
  console.error('FAIL test check did not pass');
  process.exit(1);
}

console.log('PASS smoke test');
