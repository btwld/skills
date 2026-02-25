#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const targetArg = args.find((a) => !a.startsWith('--')) || '.';
const targetDir = path.resolve(process.cwd(), targetArg);
const asJson = args.includes('--json');
const runBuild = args.includes('--run-build');
const runTests = args.includes('--run-tests');

function readIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function walkTsFiles(root) {
  const out = [];
  function walk(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.git')) {
        continue;
      }

      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        out.push(full);
      }
    }
  }

  walk(root);
  return out;
}

function detectPackageManager(root) {
  if (fileExists(path.join(root, 'yarn.lock'))) return 'yarn';
  if (fileExists(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fileExists(path.join(root, 'package-lock.json'))) return 'npm';
  return 'yarn';
}

function runScript(root, scriptName) {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJsonRaw = readIfExists(packageJsonPath);
  if (!packageJsonRaw) {
    return { skipped: true, reason: 'package.json not found' };
  }

  let packageJson;
  try {
    packageJson = JSON.parse(packageJsonRaw);
  } catch {
    return { skipped: true, reason: 'invalid package.json' };
  }

  if (!packageJson.scripts || !packageJson.scripts[scriptName]) {
    return { skipped: true, reason: `script \"${scriptName}\" not defined` };
  }

  const pm = detectPackageManager(root);
  const cmd = pm;
  const pmArgs = ['run', scriptName];

  const result = spawnSync(cmd, pmArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    skipped: false,
    success: result.status === 0,
    status: result.status,
    command: `${cmd} run ${scriptName}`,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function findAppModule(root) {
  const candidates = [
    path.join(root, 'src', 'app.module.ts'),
    path.join(root, 'apps', 'api', 'src', 'app.module.ts'),
  ];

  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate;
  }

  const tsFiles = walkTsFiles(root);
  return tsFiles.find((f) => f.endsWith('app.module.ts')) || null;
}

function findAclFile(root) {
  const candidates = [
    path.join(root, 'src', 'app.acl.ts'),
    path.join(root, 'apps', 'api', 'src', 'app.acl.ts'),
  ];

  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate;
  }

  const tsFiles = walkTsFiles(root);
  return tsFiles.find((f) => f.endsWith('app.acl.ts')) || null;
}

function relative(root, filePath) {
  return path.relative(root, filePath) || '.';
}

function addIssue(issues, issue) {
  issues.push(issue);
}

function checkRocketsModuleRegistration({ issues, packageJsonRaw, appModulePath, appModuleRaw, root }) {
  const hasRocketsPkg = /"@bitwild\/rockets-server"/.test(packageJsonRaw || '') || /"@bitwild\/rockets-server-auth"/.test(packageJsonRaw || '');
  if (!hasRocketsPkg) return;

  if (!appModuleRaw) {
    addIssue(issues, {
      code: 'APP_MODULE_NOT_FOUND',
      severity: 'HIGH',
      message: 'Could not find app.module.ts to validate Rockets module wiring.',
      evidence: ['Looked for src/app.module.ts and apps/api/src/app.module.ts'],
      files: [],
      fixes: [
        'Create or locate app.module.ts and register Rockets modules.',
      ],
    });
    return;
  }

  const hasRocketsModule = /RocketsModule\.forRoot|RocketsModule\.forRootAsync|RocketsServerModule\.forRoot|RocketsServerModule\.forRootAsync/.test(appModuleRaw);
  const hasRocketsAuthModule = /RocketsAuthModule\.forRoot|RocketsAuthModule\.forRootAsync/.test(appModuleRaw);

  if (!hasRocketsModule && !hasRocketsAuthModule) {
    addIssue(issues, {
      code: 'ROCKETS_MODULE_NOT_REGISTERED',
      severity: 'CRITICAL',
      message: 'Rockets packages are installed, but Rockets modules are not registered in app.module.ts.',
      evidence: [
        `Found Rockets packages in package.json`,
        `No RocketsModule/RocketsServerModule/RocketsAuthModule forRoot call in ${relative(root, appModulePath)}`,
      ],
      files: [relative(root, appModulePath)],
      fixes: [
        'Register RocketsAuthModule.forRoot(...) and/or RocketsModule.forRoot(...) in app.module.ts.',
        'Re-run: node skills/rockets-runtime-diagnostics/scripts/diagnose.js .',
      ],
    });
  }
}

function checkImportOrder({ issues, appModuleRaw, appModulePath, root }) {
  if (!appModuleRaw) return;

  const authIdx = appModuleRaw.search(/RocketsAuthModule\.forRoot|RocketsAuthModule\.forRootAsync/);
  const rocketsIdx = appModuleRaw.search(/RocketsModule\.forRoot|RocketsModule\.forRootAsync|RocketsServerModule\.forRoot|RocketsServerModule\.forRootAsync/);

  if (authIdx >= 0 && rocketsIdx >= 0 && authIdx > rocketsIdx) {
    addIssue(issues, {
      code: 'ROCKETS_AUTH_IMPORT_ORDER',
      severity: 'CRITICAL',
      message: 'RocketsAuthModule appears after RocketsModule/RocketsServerModule. This breaks provider resolution.',
      evidence: [
        `RocketsAuthModule index: ${authIdx}`,
        `RocketsModule/RocketsServerModule index: ${rocketsIdx}`,
      ],
      files: [relative(root, appModulePath)],
      fixes: [
        'In app.module.ts imports, place RocketsAuthModule before RocketsModule/RocketsServerModule.',
        'Then run build: yarn build (or pnpm/npm equivalent).',
      ],
    });
  }
}

function checkDynamicToken({ issues, root, appModuleRaw, tsFiles }) {
  if (!appModuleRaw) return;

  const usesUserMetadataConfig = /userMetadata\s*:/.test(appModuleRaw);
  if (!usesUserMetadataConfig) return;

  const hasDynamicTokenRegistration = tsFiles.some((file) => {
    const raw = readIfExists(file);
    if (!raw) return false;
    return /TypeOrmExtModule\.forFeature\(/.test(raw) && /userMetadata\s*:/.test(raw);
  });

  if (!hasDynamicTokenRegistration) {
    addIssue(issues, {
      code: 'DYNAMIC_USER_METADATA_TOKEN_MISSING',
      severity: 'CRITICAL',
      message: 'userMetadata is configured but dynamic repository token registration is missing.',
      evidence: [
        'Found userMetadata config in app module.',
        'No TypeOrmExtModule.forFeature({ userMetadata: ... }) found in TypeScript files.',
      ],
      files: ['src/app.module.ts'],
      fixes: [
        'Add TypeOrmExtModule.forFeature({ userMetadata: { entity: UserMetadataEntity } }) in imports.',
        'Ensure UserMetadataEntity is part of TypeORM entities.',
      ],
    });
  }
}

function extractAclResources(aclRaw) {
  const resources = new Set();
  const rx = /=\s*'([^']+)'/g;
  let m;
  while ((m = rx.exec(aclRaw)) !== null) {
    resources.add(m[1]);
  }
  return resources;
}

function checkAclResourceLiterals({ issues, root, aclPath, aclRaw, tsFiles }) {
  if (!aclRaw) return;

  const aclResources = extractAclResources(aclRaw);
  const decoratorRx = /resource\s*:\s*'([^']+)'/g;

  for (const file of tsFiles) {
    if (!file.endsWith('.crud.controller.ts')) continue;
    const raw = readIfExists(file);
    if (!raw) continue;

    let m;
    while ((m = decoratorRx.exec(raw)) !== null) {
      const resource = m[1];
      if (!aclResources.has(resource)) {
        addIssue(issues, {
          code: 'ACL_RESOURCE_LITERAL_NOT_IN_ENUM',
          severity: 'HIGH',
          message: `Controller uses resource '${resource}' that is not declared in AppResource enum.`,
          evidence: [
            `${relative(root, file)} contains resource: '${resource}'`,
            `${relative(root, aclPath)} does not declare '${resource}'`,
          ],
          files: [relative(root, file), relative(root, aclPath)],
          fixes: [
            `Add '${resource}' to AppResource enum and grant rules in acRules.`,
            'Re-run diagnostics and then run tests.',
          ],
        });
      }
    }
  }
}

function checkAccessQueryService({ issues, root, tsFiles }) {
  const controllers = tsFiles.filter((f) => f.endsWith('.crud.controller.ts'));

  for (const controllerFile of controllers) {
    const dir = path.dirname(controllerFile);
    const expected = fs.readdirSync(dir).some((name) => name.endsWith('-access-query.service.ts'));

    if (!expected) {
      addIssue(issues, {
        code: 'ACCESS_QUERY_SERVICE_MISSING',
        severity: 'HIGH',
        message: 'CRUD controller found without matching access-query service in module folder.',
        evidence: [
          `Found controller: ${relative(root, controllerFile)}`,
          `No *-access-query.service.ts in ${relative(root, dir)}`,
        ],
        files: [relative(root, controllerFile)],
        fixes: [
          'Create {entity}-access-query.service.ts implementing CanAccess with default deny.',
          'Wire it into module providers if required by your pattern.',
        ],
      });
    }
  }
}

/**
 * CRUD adapters using @InjectRepository(Entity) require TypeOrmModule.forFeature([Entity])
 * in the same module so Nest can resolve the repository.
 */
function checkTypeOrmAdapterRepository({ issues, root, tsFiles }) {
  const adapters = tsFiles.filter((f) => f.endsWith('-typeorm-crud.adapter.ts'));

  for (const adapterPath of adapters) {
    const adapterRaw = readIfExists(adapterPath);
    if (!adapterRaw || !/InjectRepository\s*\(\s*(\w+)\s*\)/.test(adapterRaw)) continue;

    const entityMatch = adapterRaw.match(/InjectRepository\s*\(\s*(\w+)\s*\)/);
    const entityName = entityMatch ? entityMatch[1] : null;
    if (!entityName) continue;

    const dir = path.dirname(adapterPath);
    const moduleFiles = fs.readdirSync(dir).filter((n) => n.endsWith('.module.ts'));
    if (moduleFiles.length === 0) continue;

    const modulePath = path.join(dir, moduleFiles[0]);
    const moduleRaw = readIfExists(modulePath);
    if (!moduleRaw) continue;

    const hasTypeOrmForFeature = /TypeOrmModule\.forFeature\s*\(/.test(moduleRaw);
    const hasThisEntityInForFeature = new RegExp(
      `TypeOrmModule\\.forFeature\\s*\\([^)]*\\b${entityName}\\b`,
    ).test(moduleRaw);

    if (!hasTypeOrmForFeature || !hasThisEntityInForFeature) {
      addIssue(issues, {
        code: 'TYPEORM_ADAPTER_REPOSITORY_MISSING',
        severity: 'HIGH',
        message: `Adapter uses @InjectRepository(${entityName}) but module does not register the entity with TypeOrmModule.forFeature.`,
        evidence: [
          `Adapter: ${relative(root, adapterPath)}`,
          `Module: ${relative(root, modulePath)}`,
          `Add TypeOrmModule.forFeature([${entityName}]) to the module imports.`,
        ],
        files: [relative(root, modulePath)],
        fixes: [
          `Import TypeOrmModule from @nestjs/typeorm and add TypeOrmModule.forFeature([${entityName}]) to the module's imports array.`,
          'Re-run diagnostics and start the app to verify.',
        ],
      });
    }
  }
}

/**
 * Controllers using @UseGuards(AccessControlGuard) require the guard's dependencies
 * (ACCESS_CONTROL_MODULE_SETTINGS_TOKEN and AccessControlService) in the same module.
 */
function checkAccessControlGuardDeps({ issues, root, tsFiles }) {
  const controllers = tsFiles.filter((f) => f.endsWith('.crud.controller.ts'));

  for (const controllerPath of controllers) {
    const controllerRaw = readIfExists(controllerPath);
    if (!controllerRaw || !/AccessControlGuard/.test(controllerRaw)) continue;

    const dir = path.dirname(controllerPath);
    const moduleFiles = fs.readdirSync(dir).filter((n) => n.endsWith('.module.ts'));
    if (moduleFiles.length === 0) continue;

    const modulePath = path.join(dir, moduleFiles[0]);
    const moduleRaw = readIfExists(modulePath);
    if (!moduleRaw) continue;

    const hasSettingsToken =
      /ACCESS_CONTROL_MODULE_SETTINGS_TOKEN|'ACCESS_CONTROL_MODULE_SETTINGS_TOKEN'/.test(moduleRaw);
    const hasAcService =
      /provide:\s*AccessControlService/.test(moduleRaw) && /useClass:\s*ACService/.test(moduleRaw);

    if (!hasSettingsToken || !hasAcService) {
      addIssue(issues, {
        code: 'ACCESS_CONTROL_GUARD_DEPS_MISSING',
        severity: 'HIGH',
        message:
          'CRUD controller uses AccessControlGuard but module does not provide guard dependencies (settings token + AccessControlService).',
        evidence: [
          `Controller: ${relative(root, controllerPath)}`,
          `Module: ${relative(root, modulePath)}`,
        ],
        files: [relative(root, modulePath)],
        fixes: [
          "Add providers: { provide: 'ACCESS_CONTROL_MODULE_SETTINGS_TOKEN', useValue: { rules: acRules } } and { provide: AccessControlService, useClass: ACService }. Import acRules from app.acl and ACService from your access-control.service.",
          "If the token is not exported from @concepta/nestjs-access-control, define const ACCESS_CONTROL_MODULE_SETTINGS_TOKEN = 'ACCESS_CONTROL_MODULE_SETTINGS_TOKEN' in the module.",
          'Re-run diagnostics and start the app to verify.',
        ],
      });
    }
  }
}

function main() {
  if (!fileExists(targetDir)) {
    console.error(`Target path not found: ${targetDir}`);
    process.exit(2);
  }

  const issues = [];
  const checks = [];

  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJsonRaw = readIfExists(packageJsonPath) || '';
  const appModulePath = findAppModule(targetDir);
  const appModuleRaw = appModulePath ? readIfExists(appModulePath) : null;
  const aclPath = findAclFile(targetDir);
  const aclRaw = aclPath ? readIfExists(aclPath) : null;
  const tsFiles = walkTsFiles(targetDir);

  checkRocketsModuleRegistration({ issues, packageJsonRaw, appModulePath, appModuleRaw, root: targetDir });
  checkImportOrder({ issues, appModuleRaw, appModulePath, root: targetDir });
  checkDynamicToken({ issues, root: targetDir, appModuleRaw, tsFiles });
  checkAclResourceLiterals({ issues, root: targetDir, aclPath, aclRaw, tsFiles });
  checkAccessQueryService({ issues, root: targetDir, tsFiles });
  checkTypeOrmAdapterRepository({ issues, root: targetDir, tsFiles });
  checkAccessControlGuardDeps({ issues, root: targetDir, tsFiles });

  if (runBuild) {
    checks.push({ name: 'build', result: runScript(targetDir, 'build') });
  }

  if (runTests) {
    checks.push({ name: 'test', result: runScript(targetDir, 'test') });
  }

  const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const output = {
    target: targetDir,
    issueCount: issues.length,
    issues,
    checks,
  };

  if (asJson) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`# Rockets Runtime Diagnostics`);
    console.log(`Target: ${targetDir}`);
    console.log(`Issues: ${issues.length}`);

    if (issues.length === 0) {
      console.log('No known Rockets wiring issues detected.');
    } else {
      for (const issue of issues) {
        console.log(`\n[${issue.severity}] ${issue.code}`);
        console.log(issue.message);
        if (issue.evidence && issue.evidence.length) {
          console.log('Evidence:');
          for (const line of issue.evidence) console.log(`- ${line}`);
        }
        if (issue.fixes && issue.fixes.length) {
          console.log('Fixes:');
          for (const line of issue.fixes) console.log(`- ${line}`);
        }
      }
    }

    if (checks.length) {
      console.log('\n# Build/Test checks');
      for (const check of checks) {
        const result = check.result;
        if (result.skipped) {
          console.log(`- ${check.name}: SKIPPED (${result.reason})`);
        } else {
          console.log(`- ${check.name}: ${result.success ? 'PASS' : 'FAIL'} via ${result.command}`);
        }
      }
    }
  }

  const hasBlockingIssue = issues.some((i) => i.severity === 'CRITICAL');
  const hasFailedCommand = checks.some((c) => !c.result.skipped && !c.result.success);

  process.exit(hasBlockingIssue || hasFailedCommand ? 1 : 0);
}

main();
