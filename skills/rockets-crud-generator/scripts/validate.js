#!/usr/bin/env node

/**
 * Rockets SDK Post-Generation Validator
 *
 * Runs static checks against a project to verify CRUD generation was done correctly.
 * Optionally runs `yarn build` / `npm run build` for full TypeScript validation.
 *
 * Usage:
 *   node validate.js --project <project-path> [--build] [--entity <EntityName>]
 *
 * Options:
 *   --project  Path to the project root (default: .)
 *   --build    Also run the build command
 *   --entity   Only validate a specific entity (can repeat)
 *
 * Output:
 *   JSON { passed: boolean, issues: [{ severity, rule, message, file, line }] }
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { toKebabCase } = require('./lib/name-utils');

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { projectPath: '.', runBuild: false, entities: [] };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      result.projectPath = args[i + 1];
      i++;
    } else if (args[i] === '--build') {
      result.runBuild = true;
    } else if (args[i] === '--entity' && args[i + 1]) {
      result.entities.push(args[i + 1]);
      i++;
    }
  }

  return result;
}

/**
 * Recursively find files matching a pattern
 */
function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      findFiles(fullPath, pattern, results);
    } else if (entry.isFile() && pattern.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Check: @InjectRepository only in *-typeorm-crud.adapter.ts
 */
function checkInjectRepository(srcDir, issues) {
  const tsFiles = findFiles(srcDir, /\.ts$/);

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('@InjectRepository')) continue;

    const relPath = path.relative(srcDir, file);

    // Allowed in any adapter file (*-typeorm-crud.adapter.ts or adapters/*.adapter.ts)
    if (relPath.endsWith('.adapter.ts')) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('@InjectRepository')) {
        issues.push({
          severity: 'error',
          rule: 'inject-repository-location',
          message: '@InjectRepository is only allowed in *-typeorm-crud.adapter.ts',
          file: relPath,
          line: i + 1,
        });
      }
    }
  }
}

/**
 * Check: Entity files live inside their module directories (src/modules/<name>/entities/)
 */
function checkEntitiesInModules(srcDir, issues) {
  const modulesDir = path.join(srcDir, 'modules');
  if (!fs.existsSync(modulesDir)) return;

  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of moduleDirs) {
    const moduleFile = path.join(modulesDir, dir, `${dir}.module.ts`);
    if (!fs.existsSync(moduleFile)) continue;

    // Check that this module has an entities/ subdirectory with at least one entity
    const entitiesDir = path.join(modulesDir, dir, 'entities');
    const entityFiles = fs.existsSync(entitiesDir)
      ? findFiles(entitiesDir, /\.entity\.ts$/)
      : [];

    if (entityFiles.length === 0) {
      // Check if module references an entity (TypeOrmModule.forFeature) but has no entity dir
      const moduleContent = fs.readFileSync(moduleFile, 'utf8');
      if (moduleContent.includes('TypeOrmModule.forFeature')) {
        issues.push({
          severity: 'warning',
          rule: 'entity-in-module',
          message: `Module ${dir} uses TypeOrmModule.forFeature but has no entities/ directory`,
          file: `src/modules/${dir}/${dir}.module.ts`,
        });
      }
    }
  }

  // Warn if legacy shared entities/ directory exists
  const legacyEntitiesDir = path.join(srcDir, 'entities');
  if (fs.existsSync(legacyEntitiesDir)) {
    const legacyEntityFiles = findFiles(legacyEntitiesDir, /\.entity\.ts$/);
    if (legacyEntityFiles.length > 0) {
      issues.push({
        severity: 'warning',
        rule: 'entity-in-module',
        message: `Found ${legacyEntityFiles.length} entity file(s) in src/entities/ — entities should live inside their module (src/modules/<name>/entities/)`,
        file: 'src/entities/',
      });
    }
  }
}

/**
 * Check: All feature modules imported in app.module.ts
 */
function checkAppModuleImports(srcDir, issues) {
  const appModulePath = path.join(srcDir, 'app.module.ts');
  if (!fs.existsSync(appModulePath)) {
    issues.push({
      severity: 'warning',
      rule: 'app-module-imports',
      message: 'app.module.ts does not exist',
      file: 'src/app.module.ts',
    });
    return;
  }

  const appModuleContent = fs.readFileSync(appModulePath, 'utf8');
  const modulesDir = path.join(srcDir, 'modules');

  if (!fs.existsSync(modulesDir)) return;

  const moduleDirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of moduleDirs) {
    const moduleFile = path.join(modulesDir, dir, `${dir}.module.ts`);
    if (!fs.existsSync(moduleFile)) continue;

    // Extract class name from the module file
    const moduleContent = fs.readFileSync(moduleFile, 'utf8');
    const classMatch = moduleContent.match(/export\s+class\s+(\w+Module)/);
    if (!classMatch) continue;

    const className = classMatch[1];
    if (!appModuleContent.includes(className)) {
      issues.push({
        severity: 'error',
        rule: 'app-module-imports',
        message: `Module ${className} not imported in app.module.ts`,
        file: 'src/app.module.ts',
      });
    }
  }
}

/**
 * Check: ACL resources defined in app.acl.ts
 */
function checkAclResources(srcDir, issues) {
  const aclPath = path.join(srcDir, 'app.acl.ts');
  if (!fs.existsSync(aclPath)) {
    // Not all projects use ACL
    return;
  }

  const aclContent = fs.readFileSync(aclPath, 'utf8');

  // Find all controller files with @AccessControlQuery
  const controllerFiles = findFiles(path.join(srcDir, 'modules'), /\.crud\.controller\.ts$/);

  for (const ctrlFile of controllerFiles) {
    const content = fs.readFileSync(ctrlFile, 'utf8');
    if (!content.includes('AccessControlQuery')) continue;

    // Extract resource constant usage like TaskResource.One
    const resourceMatch = content.match(/(\w+)Resource\./);
    if (!resourceMatch) continue;

    const resourceName = resourceMatch[1];
    // Check if this resource is defined in the ACL
    const kebab = toKebabCase(resourceName);

    if (!aclContent.includes(`'${kebab}'`) && !aclContent.includes(`"${kebab}"`)) {
      issues.push({
        severity: 'error',
        rule: 'acl-resource-defined',
        message: `Resource '${kebab}' used in controller but not defined in app.acl.ts`,
        file: path.relative(srcDir, ctrlFile),
      });
    }
  }
}

/**
 * Check: Access query services registered in their feature module providers
 *
 * AccessControlGuard.moduleRef.resolve() scopes to the controller's host module,
 * so access query services MUST be providers in the feature module — not in app.module.
 */
function checkQueryServicesRegistration(srcDir, issues) {
  // Find all access query service files
  const aqsFiles = findFiles(path.join(srcDir, 'modules'), /-access-query\.service\.ts$/);

  for (const aqsFile of aqsFiles) {
    const content = fs.readFileSync(aqsFile, 'utf8');
    const classMatch = content.match(/export\s+class\s+(\w+AccessQueryService)/);
    if (!classMatch) continue;

    const className = classMatch[1];

    // Check it IS in the feature module providers
    const moduleDir = path.dirname(aqsFile);
    const moduleFiles = findFiles(moduleDir, /\.module\.ts$/);
    let foundInFeatureModule = false;

    for (const moduleFile of moduleFiles) {
      const moduleContent = fs.readFileSync(moduleFile, 'utf8');
      // Use bracket-depth counting to extract providers array (handles nested arrays)
      const providersStart = moduleContent.match(/providers:\s*\[/);
      if (providersStart) {
        const startIdx = providersStart.index + providersStart[0].length;
        let depth = 1;
        let pos = startIdx;
        while (pos < moduleContent.length && depth > 0) {
          if (moduleContent[pos] === '[') depth++;
          if (moduleContent[pos] === ']') depth--;
          if (depth > 0) pos++;
        }
        const providersContent = moduleContent.slice(startIdx, pos);
        if (providersContent.includes(className)) {
          foundInFeatureModule = true;
        }
      }
    }

    if (!foundInFeatureModule) {
      issues.push({
        severity: 'error',
        rule: 'query-service-in-feature',
        message: `${className} must be in feature module providers (AccessControlGuard resolves from controller's module)`,
        file: path.relative(srcDir, aqsFile),
      });
    }
  }
}

/**
 * Check: No ACCESS_CONTROL_MODULE_SETTINGS_TOKEN in feature modules
 */
function checkNoAclProvidersInFeatureModules(srcDir, issues) {
  const moduleFiles = findFiles(path.join(srcDir, 'modules'), /\.module\.ts$/);

  for (const file of moduleFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(srcDir, file);

    if (content.includes('ACCESS_CONTROL_MODULE_SETTINGS_TOKEN')) {
      issues.push({
        severity: 'error',
        rule: 'no-acl-providers-in-feature',
        message: 'ACCESS_CONTROL_MODULE_SETTINGS_TOKEN should not be in feature modules',
        file: relPath,
      });
    }

    // Check for direct AccessControlService provider
    if (content.includes('provide: AccessControlService')) {
      issues.push({
        severity: 'error',
        rule: 'no-acl-providers-in-feature',
        message: 'AccessControlService provider should not be in feature modules',
        file: relPath,
      });
    }
  }
}

/**
 * Run build check
 */
function runBuild(projectPath, issues) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    issues.push({
      severity: 'warning',
      rule: 'build',
      message: 'No package.json found, skipping build check',
    });
    return;
  }

  // Detect package manager
  const hasYarnLock = fs.existsSync(path.join(projectPath, 'yarn.lock'));
  const cmd = hasYarnLock ? 'yarn build' : 'npm run build';

  try {
    execSync(cmd, {
      cwd: projectPath,
      stdio: 'pipe',
      timeout: 120000,
    });
  } catch (err) {
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    const output = stderr + stdout;

    // Extract TypeScript errors
    const errorLines = output.split('\n').filter(l => /error TS\d+/.test(l));

    if (errorLines.length > 0) {
      for (const line of errorLines.slice(0, 20)) {
        issues.push({
          severity: 'error',
          rule: 'build',
          message: line.trim(),
        });
      }
    } else {
      issues.push({
        severity: 'error',
        rule: 'build',
        message: `Build failed: ${output.slice(0, 500)}`,
      });
    }
  }
}

/**
 * Check: ACL own-scope entities must have ownerField column in their entity file
 */
function checkAclOwnerField(srcDir, issues) {
  const aclPath = path.join(srcDir, 'app.acl.ts');
  if (!fs.existsSync(aclPath)) return;

  const aclContent = fs.readFileSync(aclPath, 'utf8');

  // Find access query services that check ownership
  const aqsFiles = findFiles(path.join(srcDir, 'modules'), /-access-query\.service\.ts$/);

  for (const aqsFile of aqsFiles) {
    const content = fs.readFileSync(aqsFile, 'utf8');
    // Find the ownerField being checked (e.g., .userId, .createdBy)
    const ownerMatch = content.match(/\(entity as any\)\?\.(\w+)\s*===\s*user\.id/);
    if (!ownerMatch) continue;

    const ownerField = ownerMatch[1];
    const relPath = path.relative(srcDir, aqsFile);

    // Determine the entity being checked by looking at the repo injection
    const entityMatch = content.match(/RepositoryInterface<(\w+)Entity>/);
    if (!entityMatch) continue;

    const entityName = entityMatch[1];
    const entityKebab = toKebabCase(entityName);

    // Find the entity file inside its module directory
    const entityFiles = findFiles(path.join(srcDir, 'modules', entityKebab, 'entities'), new RegExp(`${entityKebab}\\.entity\\.ts$`));
    if (entityFiles.length === 0) continue;

    const entityContent = fs.readFileSync(entityFiles[0], 'utf8');
    if (!entityContent.includes(ownerField)) {
      issues.push({
        severity: 'error',
        rule: 'acl-owner-field',
        message: `${entityName}Entity is missing "${ownerField}" column but access query service checks ownership on it. Add the field or change ACL to "any" possession.`,
        file: path.relative(srcDir, entityFiles[0]),
      });
    }
  }
}

/**
 * Check: CrudModule.forRoot({}) must exist in app.module.ts
 */
function checkCrudModuleRoot(srcDir, issues) {
  const appModulePath = path.join(srcDir, 'app.module.ts');
  if (!fs.existsSync(appModulePath)) return;

  const content = fs.readFileSync(appModulePath, 'utf8');

  // Only check if project uses CrudModule.forFeature (has CRUD modules)
  const moduleFiles = findFiles(path.join(srcDir, 'modules'), /\.module\.ts$/);
  let usesCrudFeature = false;
  for (const mf of moduleFiles) {
    const mc = fs.readFileSync(mf, 'utf8');
    if (mc.includes('CrudModule.forFeature')) {
      usesCrudFeature = true;
      break;
    }
  }

  if (usesCrudFeature && !/CrudModule\.forRoot\s*\(/.test(content)) {
    issues.push({
      severity: 'error',
      rule: 'crud-module-root',
      message: 'CrudModule.forRoot({}) is required in app.module.ts before using CrudModule.forFeature() in feature modules',
      file: 'src/app.module.ts',
    });
  }
}

/**
 * Check: No imports from internal dist/ paths
 */
function checkDistImports(srcDir, issues) {
  const tsFiles = findFiles(srcDir, /\.ts$/);

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match imports from dist/ paths in node_modules packages
      const distMatch = line.match(/from\s+['"](@[\w-]+\/[\w-]+)\/dist\//);
      if (distMatch) {
        issues.push({
          severity: 'warning',
          rule: 'dist-import',
          message: `Import from internal dist/ path: "${distMatch[0]}". Use the package barrel export instead.`,
          file: path.relative(srcDir, file),
          line: i + 1,
        });
      }
    }
  }
}

/**
 * Check: No stale template placeholder strings
 */
function checkStaleTemplates(srcDir, issues) {
  const stalePatterns = [
    { pattern: /Music Management/i, label: '"Music Management" placeholder' },
    { pattern: /PetAccessQueryService/, label: '"PetAccessQueryService" template reference' },
    { pattern: /pet-management/i, label: '"pet-management" placeholder' },
    { pattern: /rockets-starter/i, label: '"rockets-starter" default project reference' },
  ];

  // Only check non-generated files (main.ts, config/, app.acl.ts)
  const filesToCheck = [
    path.join(srcDir, 'main.ts'),
    path.join(srcDir, 'app.acl.ts'),
  ];
  // Add config files
  const configDir = path.join(srcDir, 'config');
  if (fs.existsSync(configDir)) {
    const configFiles = findFiles(configDir, /\.ts$/);
    filesToCheck.push(...configFiles);
  }

  for (const file of filesToCheck) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(srcDir, file);
    const lines = content.split('\n');

    for (const { pattern, label } of stalePatterns) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          issues.push({
            severity: 'warning',
            rule: 'stale-template',
            message: `Stale template string found: ${label}. Update to match this project.`,
            file: relPath,
            line: i + 1,
          });
          break; // One warning per pattern per file
        }
      }
    }
  }
}

/**
 * Check: No SQLite entity base classes in a Postgres project.
 *
 * Rockets SDK always uses Postgres. If any entity extends *SqliteEntity,
 * it's a leftover from a different template and will cause runtime conflicts.
 */
function checkConflictingBaseClasses(srcDir, issues) {
  const allEntityFiles = findFiles(srcDir, /\.entity\.ts$/);

  for (const file of allEntityFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relPath = path.relative(srcDir, file);

    // Detect SQLite base classes
    const sqliteMatch = content.match(/extends\s+(\w*Sqlite\w*Entity)/);
    if (sqliteMatch) {
      const lines = content.split('\n');
      let lineNum = 1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(sqliteMatch[1])) {
          lineNum = i + 1;
          break;
        }
      }

      issues.push({
        severity: 'error',
        rule: 'postgres-only',
        message: `Entity extends "${sqliteMatch[1]}" (SQLite) but project uses Postgres. Remove this file or change to Postgres base class.`,
        file: relPath,
        line: lineNum,
      });
    }
  }
}

/**
 * Check: Entity tables have corresponding migrations
 */
function checkMigrations(srcDir, issues) {
  const migrationsDir = path.join(srcDir, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  // Read all migration files
  const migrationFiles = findFiles(migrationsDir, /\.ts$/);
  let migrationContent = '';
  for (const mf of migrationFiles) {
    migrationContent += fs.readFileSync(mf, 'utf8') + '\n';
  }

  // Find all entity table names (entities live inside their modules)
  const entityFiles = findFiles(path.join(srcDir, 'modules'), /\.entity\.ts$/);
  for (const ef of entityFiles) {
    const content = fs.readFileSync(ef, 'utf8');
    const tableMatch = content.match(/@Entity\(['"](\w+)['"]\)/);
    if (!tableMatch) continue;

    const tableName = tableMatch[1];
    // Check if table is created in any migration (createTable or table name reference)
    if (!migrationContent.includes(`"${tableName}"`) && !migrationContent.includes(`'${tableName}'`)) {
      issues.push({
        severity: 'error',
        rule: 'migration-coverage',
        message: `Entity table "${tableName}" has no migration. Run the orchestrator with migration support or use migration:generate.`,
        file: path.relative(srcDir, ef),
      });
    }
  }
}

/**
 * Main
 */
async function main() {
  const { projectPath, runBuild: shouldBuild, entities } = parseArgs();
  const resolvedPath = path.resolve(projectPath);
  const srcDir = path.join(resolvedPath, 'src');
  const issues = [];

  if (!fs.existsSync(srcDir)) {
    console.error(JSON.stringify({
      passed: false,
      issues: [{ severity: 'error', rule: 'project-structure', message: `src/ directory not found at ${resolvedPath}` }],
    }));
    process.exit(1);
  }

  // Run all checks
  checkInjectRepository(srcDir, issues);
  checkEntitiesInModules(srcDir, issues);
  checkAppModuleImports(srcDir, issues);
  checkAclResources(srcDir, issues);
  checkQueryServicesRegistration(srcDir, issues);
  checkNoAclProvidersInFeatureModules(srcDir, issues);

  // New checks (P2)
  checkAclOwnerField(srcDir, issues);
  checkCrudModuleRoot(srcDir, issues);
  checkDistImports(srcDir, issues);
  checkStaleTemplates(srcDir, issues);
  checkMigrations(srcDir, issues);
  checkConflictingBaseClasses(srcDir, issues);

  // Optionally run build
  if (shouldBuild) {
    runBuild(resolvedPath, issues);
  }

  const errors = issues.filter(i => i.severity === 'error');
  const passed = errors.length === 0;

  console.log(JSON.stringify({ passed, issues }, null, 2));
  process.exit(passed ? 0 : 1);
}

main();
