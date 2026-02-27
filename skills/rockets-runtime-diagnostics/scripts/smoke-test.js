#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

const base = path.resolve(__dirname, '..');
const diagnose = path.join(base, 'scripts', 'diagnose.js');

const cases = [
  {
    name: 'missing-auth-module',
    fixture: 'missing-auth-module',
    expect: ['ROCKETS_MODULE_NOT_REGISTERED'],
  },
  {
    name: 'wrong-import-order',
    fixture: 'wrong-import-order',
    expect: ['ROCKETS_AUTH_IMPORT_ORDER'],
  },
  {
    name: 'missing-dynamic-token',
    fixture: 'missing-dynamic-token',
    expect: ['DYNAMIC_USER_METADATA_TOKEN_MISSING'],
  },
  {
    name: 'acl-missing-resource',
    fixture: 'acl-missing-resource',
    expect: ['ACL_RESOURCE_LITERAL_NOT_IN_ENUM'],
  },
  {
    name: 'missing-access-query',
    fixture: 'missing-access-query',
    expect: ['ACCESS_QUERY_SERVICE_MISSING'],
  },
  {
    name: 'typeorm-adapter-missing-repo',
    fixture: 'typeorm-adapter-missing-repo',
    expect: ['TYPEORM_ADAPTER_REPOSITORY_MISSING'],
  },
  {
    name: 'access-control-guard-deps-missing',
    fixture: 'access-control-guard-deps-missing',
    expect: ['ACCESS_CONTROL_GUARD_DEPS_MISSING'],
  },
];

let failed = 0;

for (const testCase of cases) {
  const fixtureDir = path.join(base, 'fixtures', testCase.fixture);
  const result = spawnSync('node', [diagnose, fixtureDir, '--json'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (!result.stdout) {
    console.error(`FAIL ${testCase.name}: no output`);
    failed += 1;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (err) {
    console.error(`FAIL ${testCase.name}: invalid JSON`);
    console.error(result.stdout);
    failed += 1;
    continue;
  }

  const codes = new Set((parsed.issues || []).map((i) => i.code));
  const missing = testCase.expect.filter((code) => !codes.has(code));

  if (missing.length > 0) {
    console.error(`FAIL ${testCase.name}: missing codes ${missing.join(', ')}`);
    console.error(`Found: ${Array.from(codes).join(', ')}`);
    failed += 1;
  } else {
    console.log(`PASS ${testCase.name}`);
  }
}

if (failed > 0) {
  console.error(`\nSmoke tests failed: ${failed}`);
  process.exit(1);
}

console.log('\nAll smoke tests passed');
