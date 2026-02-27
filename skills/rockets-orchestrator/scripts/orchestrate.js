#!/usr/bin/env node

/**
 * Rockets SDK Orchestrator
 *
 * Batch-generates multiple CRUD modules from a spec file with:
 * - Topological sorting (dependency-aware wave ordering)
 * - Wave-based execution (generate → integrate → validate)
 * - Cross-session state (.rockets/state.json)
 * - Final build + optional smoke test
 *
 * Usage:
 *   node orchestrate.js --project <path> --spec <plan.json>
 *   node orchestrate.js --project <path> --resume
 *   node orchestrate.js --project <path> --spec <plan.json> --dry-run
 *
 * Output:
 *   JSON { success, waves, summary }
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Paths to other scripts (relative to this file)
// ---------------------------------------------------------------------------
const SCRIPTS_ROOT = path.resolve(__dirname, '..', '..', 'rockets-crud-generator', 'scripts');
const GENERATE_SCRIPT = path.join(SCRIPTS_ROOT, 'generate.js');
const INTEGRATE_SCRIPT = path.join(SCRIPTS_ROOT, 'integrate.js');
const VALIDATE_SCRIPT = path.join(SCRIPTS_ROOT, 'validate.js');
const SMOKE_TEST_SCRIPT = path.resolve(__dirname, '..', '..', 'rockets-runtime-diagnostics', 'scripts', 'smoke-test-endpoints.js');

const { parseConfig } = require(path.join(SCRIPTS_ROOT, 'lib', 'config-parser'));
const { generateMigration } = require(path.join(SCRIPTS_ROOT, 'generators', 'migration'));

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    projectPath: null,
    specPath: null,
    dryRun: false,
    resume: false,
    skipSmoke: false,
    skipMigration: false,
    validateOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      result.projectPath = args[i + 1];
      i++;
    } else if (args[i] === '--spec' && args[i + 1]) {
      result.specPath = args[i + 1];
      i++;
    } else if (args[i] === '--dry-run') {
      result.dryRun = true;
    } else if (args[i] === '--resume') {
      result.resume = true;
    } else if (args[i] === '--skip-smoke') {
      result.skipSmoke = true;
    } else if (args[i] === '--skip-migration') {
      result.skipMigration = true;
    } else if (args[i] === '--validate-only') {
      result.validateOnly = true;
    }
  }

  if (!result.projectPath) {
    console.error(JSON.stringify({ error: 'Missing --project <path>' }));
    process.exit(1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Topological sort — Kahn's algorithm
// ---------------------------------------------------------------------------
function topologicalSort(entities) {
  // Build adjacency list: entity → depends on (via relations)
  const entityNames = new Set(entities.map(e => e.entityName));
  const graph = new Map(); // entity → set of dependencies
  const entityMap = new Map(); // name → config

  for (const entity of entities) {
    entityMap.set(entity.entityName, entity);
    graph.set(entity.entityName, new Set());
  }

  // Build dependency edges from relations
  for (const entity of entities) {
    if (!entity.relations) continue;
    for (const rel of entity.relations) {
      const target = rel.targetEntity.replace(/Entity$/, '');
      // Only add dependency if target is in our entity list
      if (entityNames.has(target) && target !== entity.entityName) {
        graph.get(entity.entityName).add(target);
      }
    }
  }

  // Kahn's algorithm — group by wave (BFS levels)
  const inDegree = new Map();
  const reverseGraph = new Map(); // target → set of dependents

  for (const name of entityNames) {
    inDegree.set(name, 0);
    reverseGraph.set(name, new Set());
  }

  for (const [entity, deps] of graph) {
    inDegree.set(entity, deps.size);
    for (const dep of deps) {
      reverseGraph.get(dep).add(entity);
    }
  }

  const waves = [];
  const processed = new Set();

  while (processed.size < entityNames.size) {
    // Find all entities with in-degree 0 (no unresolved deps)
    const wave = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0 && !processed.has(name)) {
        wave.push(name);
      }
    }

    if (wave.length === 0) {
      // Circular dependency detected
      const remaining = [...entityNames].filter(n => !processed.has(n));
      console.error(JSON.stringify({
        error: 'Circular dependency detected',
        entities: remaining,
        hint: 'Check relations between these entities',
      }));
      process.exit(1);
    }

    waves.push(wave.sort()); // Sort alphabetically within wave for determinism

    // Remove processed entities
    for (const name of wave) {
      processed.add(name);
      for (const dependent of reverseGraph.get(name)) {
        inDegree.set(dependent, inDegree.get(dependent) - 1);
      }
    }
  }

  return { waves, entityMap };
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------
function loadState(projectPath) {
  const statePath = path.join(projectPath, '.rockets', 'state.json');
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (err) {
    console.error(`[warn] Corrupted state.json — ignoring: ${err.message}`);
    return null;
  }
}

function saveState(projectPath, state) {
  const stateDir = path.join(projectPath, '.rockets');
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  const statePath = path.join(stateDir, 'state.json');
  const tmpPath = statePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, statePath);
}

function initState(waves) {
  return {
    startedAt: new Date().toISOString(),
    waves: waves.map((entities, index) => ({
      index,
      entities,
      status: 'pending',
    })),
    completedEntities: [],
    failedEntities: [],
    currentWave: 0,
  };
}

// ---------------------------------------------------------------------------
// Execute one entity: generate → integrate → validate
// ---------------------------------------------------------------------------
function generateEntity(entityConfig, projectPath) {
  // Write config to temp file to avoid shell injection via string interpolation
  const rocketsDir = path.join(projectPath, '.rockets');
  if (!fs.existsSync(rocketsDir)) fs.mkdirSync(rocketsDir, { recursive: true });
  const tmpFile = path.join(rocketsDir, `_tmp_gen_${Date.now()}.json`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(entityConfig), 'utf8');
    const output = execSync(
      `node "${GENERATE_SCRIPT}" --input "${tmpFile}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 }
    );
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    return { success: true, output: JSON.parse(output) };
  } catch (err) {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    const stderr = err.stderr?.toString() || err.message;
    return { success: false, error: `generate.js failed: ${stderr.slice(0, 500)}` };
  }
}

function integrateEntity(generateOutput, projectPath) {
  const inputJson = JSON.stringify(generateOutput);
  const tmpFile = path.join(projectPath, '.rockets', `_tmp_integrate_${Date.now()}.json`);

  try {
    // Ensure .rockets dir exists
    const rocketsDir = path.join(projectPath, '.rockets');
    if (!fs.existsSync(rocketsDir)) fs.mkdirSync(rocketsDir, { recursive: true });

    fs.writeFileSync(tmpFile, inputJson, 'utf8');

    const output = execSync(
      `node "${INTEGRATE_SCRIPT}" --input "${tmpFile}" --project "${projectPath}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 }
    );

    // Cleanup temp file
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

    return { success: true, output: JSON.parse(output) };
  } catch (err) {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    const stderr = err.stderr?.toString() || err.message;
    return { success: false, error: `integrate.js failed: ${stderr.slice(0, 500)}` };
  }
}

function validateProject(projectPath, withBuild = false) {
  const buildFlag = withBuild ? '--build' : '';
  try {
    const output = execSync(
      `node "${VALIDATE_SCRIPT}" --project "${projectPath}" ${buildFlag}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }
    );
    return { success: true, output: JSON.parse(output) };
  } catch (err) {
    // validate.js exits 1 on failure but still outputs JSON
    const stdout = err.stdout?.toString() || '';
    try {
      return { success: false, output: JSON.parse(stdout) };
    } catch {
      return { success: false, error: err.stderr?.toString() || err.message };
    }
  }
}

// ---------------------------------------------------------------------------
// Execute a wave
// ---------------------------------------------------------------------------
function executeWave(waveEntities, entityMap, projectPath, globalPaths) {
  const results = [];

  for (const entityName of waveEntities) {
    const config = entityMap.get(entityName);
    if (!config) {
      results.push({ entity: entityName, success: false, error: `Entity config not found` });
      continue;
    }

    // Merge global paths and sdkVersion into entity config
    const fullConfig = { ...config };
    if (globalPaths && !fullConfig.paths) {
      fullConfig.paths = globalPaths;
    }
    if (!fullConfig.sdkVersion && entityMap._sdkVersion) {
      fullConfig.sdkVersion = entityMap._sdkVersion;
    }

    console.error(`  [generate] ${entityName}...`);
    const genResult = generateEntity(fullConfig, projectPath);
    if (!genResult.success) {
      results.push({ entity: entityName, success: false, step: 'generate', error: genResult.error });
      continue;
    }

    console.error(`  [integrate] ${entityName}...`);
    const intResult = integrateEntity(genResult.output, projectPath);
    if (!intResult.success) {
      results.push({ entity: entityName, success: false, step: 'integrate', error: intResult.error });
      continue;
    }

    results.push({
      entity: entityName,
      success: true,
      files: genResult.output.files?.length || 0,
      actions: intResult.output?.actions || [],
      warnings: intResult.output?.warnings || [],
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Migration generation: TypeORM CLI first, static fallback
// ---------------------------------------------------------------------------
function detectPackageManager(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  return 'npm';
}

function attemptMigration(projectPath, spec) {
  const migrationsDir = path.join(projectPath, 'src', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const migrationName = 'AddGeneratedEntities';

  // --- Attempt 1: TypeORM CLI (requires DB connection) ---
  const pm = detectPackageManager(projectPath);
  const typeormScript = pm === 'npm' ? 'npx' : pm;
  const migrationPath = `./src/migrations/${migrationName}`;

  try {
    const cmd = `${typeormScript} typeorm -d ./dist/ormconfig.js migration:generate ${migrationPath}`;
    const output = execSync(cmd, {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
    return {
      success: true,
      method: 'typeorm',
      message: 'Migration generated via TypeORM CLI (DB-verified diff)',
      output: output.trim(),
    };
  } catch (_typeormErr) {
    // TypeORM failed (likely no DB) — fall through to static
  }

  // --- Attempt 2: Static fallback ---
  try {
    const parsedConfigs = spec.entities.map(entityConfig => {
      const fullConfig = { ...entityConfig };
      if (spec.paths && !fullConfig.paths) {
        fullConfig.paths = spec.paths;
      }
      if (spec.sdkVersion) fullConfig.sdkVersion = spec.sdkVersion;
      return parseConfig(fullConfig);
    });

    const result = generateMigration(parsedConfigs, migrationName);
    const outputPath = path.join(migrationsDir, result.fileName);
    fs.writeFileSync(outputPath, result.content, 'utf8');

    return {
      success: true,
      method: 'static',
      message: 'Migration generated statically (no DB). Verify with migration:generate before production.',
      file: `src/migrations/${result.fileName}`,
      className: result.className,
    };
  } catch (staticErr) {
    return {
      success: false,
      method: 'static',
      error: `Both TypeORM CLI and static fallback failed: ${staticErr.message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();
  const projectPath = path.resolve(opts.projectPath);

  if (!fs.existsSync(projectPath)) {
    console.error(JSON.stringify({ error: `Project path not found: ${projectPath}` }));
    process.exit(1);
  }

  // Load spec or resume
  let spec;
  let state;

  if (opts.resume) {
    state = loadState(projectPath);
    if (!state) {
      console.error(JSON.stringify({ error: 'No .rockets/state.json found — cannot resume' }));
      process.exit(1);
    }

    const specPath = path.join(projectPath, '.rockets', 'plan.json');
    if (!fs.existsSync(specPath)) {
      console.error(JSON.stringify({ error: 'No .rockets/plan.json found — cannot resume' }));
      process.exit(1);
    }
    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  } else {
    const specPath = opts.specPath
      ? path.resolve(opts.specPath)
      : path.join(projectPath, '.rockets', 'plan.json');

    if (!fs.existsSync(specPath)) {
      console.error(JSON.stringify({
        error: `Spec file not found: ${specPath}`,
        hint: 'Provide --spec <path> or create .rockets/plan.json',
      }));
      process.exit(1);
    }

    spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

    // Save plan to .rockets/ for future resume
    const rocketsDir = path.join(projectPath, '.rockets');
    if (!fs.existsSync(rocketsDir)) fs.mkdirSync(rocketsDir, { recursive: true });
    fs.writeFileSync(path.join(rocketsDir, 'plan.json'), JSON.stringify(spec, null, 2), 'utf8');
  }

  if (!spec.entities || spec.entities.length === 0) {
    console.error(JSON.stringify({ error: 'No entities found in spec' }));
    process.exit(1);
  }

  // Topological sort
  const { waves, entityMap } = topologicalSort(spec.entities);
  entityMap._sdkVersion = spec.sdkVersion || 'latest';

  console.error(`\nOrchestrator: ${spec.entities.length} entities in ${waves.length} wave(s)`);
  for (let i = 0; i < waves.length; i++) {
    console.error(`  Wave ${i}: ${waves[i].join(', ')}`);
  }

  // Dry run mode
  if (opts.dryRun) {
    const result = {
      dryRun: true,
      waves: waves.map((entities, index) => ({ index, entities })),
      totalEntities: spec.entities.length,
      totalWaves: waves.length,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Validate only mode
  if (opts.validateOnly) {
    console.error('\nRunning validation only...');
    const valResult = validateProject(projectPath, true);
    console.log(JSON.stringify(valResult, null, 2));
    process.exit(valResult.success ? 0 : 1);
  }

  // Initialize or resume state
  if (!state) {
    state = initState(waves);
  } else {
    // Reconcile state with (possibly updated) spec: rebuild waves preserving completion status
    const newState = initState(waves);
    newState.completedEntities = state.completedEntities.filter(e =>
      spec.entities.some(se => se.entityName === e)
    );
    newState.failedEntities = state.failedEntities.filter(e =>
      spec.entities.some(se => se.entityName === e)
    );
    newState.startedAt = state.startedAt;
    // Recompute currentWave based on what's already completed
    let resumeWave = 0;
    for (let w = 0; w < waves.length; w++) {
      if (waves[w].every(e => newState.completedEntities.includes(e))) {
        newState.waves[w].status = 'completed';
        resumeWave = w + 1;
      }
    }
    newState.currentWave = resumeWave;
    state = newState;
  }

  // Execute waves
  const waveResults = [];
  const startWave = state.currentWave || 0;

  for (let i = startWave; i < waves.length; i++) {
    const waveEntities = waves[i];

    // Skip already completed entities
    const remaining = waveEntities.filter(e => !state.completedEntities.includes(e));
    if (remaining.length === 0) {
      console.error(`\nWave ${i}: already completed — skipping`);
      waveResults.push({ index: i, entities: waveEntities, status: 'completed', skipped: true });
      continue;
    }

    console.error(`\nWave ${i}: generating ${remaining.join(', ')}...`);
    state.waves[i].status = 'in_progress';
    state.currentWave = i;
    saveState(projectPath, state);

    const results = executeWave(remaining, entityMap, projectPath, spec.paths);

    // Post-wave validation
    console.error(`  [validate] Wave ${i}...`);
    const valResult = validateProject(projectPath);

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    for (const r of succeeded) {
      if (!state.completedEntities.includes(r.entity)) {
        state.completedEntities.push(r.entity);
      }
    }
    for (const r of failed) {
      if (!state.failedEntities.includes(r.entity)) {
        state.failedEntities.push(r.entity);
      }
    }

    const waveStatus = failed.length > 0 ? 'partial' : 'completed';
    state.waves[i].status = waveStatus;

    const waveReport = {
      index: i,
      entities: waveEntities,
      status: waveStatus,
      results,
      validation: valResult.output || valResult.error,
    };
    waveResults.push(waveReport);

    saveState(projectPath, state);

    // Gate: if validation has errors, stop (exclude migration-coverage — checked after all waves)
    if (valResult.output && !valResult.output.passed) {
      const errors = (valResult.output.issues || []).filter(
        issue => issue.severity === 'error' && issue.rule !== 'migration-coverage',
      );
      if (errors.length > 0) {
        console.error(`  [GATE FAIL] Wave ${i} validation failed with ${errors.length} error(s) — stopping`);
        break;
      }
    }

    // Gate: if any entity failed, stop
    if (failed.length > 0) {
      console.error(`  [GATE FAIL] ${failed.length} entity(ies) failed in wave ${i} — stopping`);
      break;
    }

    console.error(`  Wave ${i}: done (${succeeded.length} succeeded)`);
  }

  // Migration generation (before final validation so migration-coverage passes)
  let migrationResult = null;
  if (!opts.skipMigration && state.failedEntities.length === 0) {
    console.error('\nGenerating migration...');
    migrationResult = attemptMigration(projectPath, spec);
    if (migrationResult.success) {
      console.error(`  [migration] ${migrationResult.method}: ${migrationResult.message}`);
      if (migrationResult.file) {
        console.error(`  [migration] File: ${migrationResult.file}`);
      }
    } else {
      console.error(`  [migration] FAILED: ${migrationResult.error}`);
    }
  }

  // Final build + validation check (after migration)
  console.error('\nFinal build validation...');
  const finalValidation = validateProject(projectPath, true);

  // Smoke test (optional)
  let smokeResult = null;
  if (!opts.skipSmoke && finalValidation.success && fs.existsSync(SMOKE_TEST_SCRIPT)) {
    console.error('Running endpoint smoke test...');
    try {
      const output = execSync(
        `node "${SMOKE_TEST_SCRIPT}" --project "${projectPath}" --timeout 45000`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 120000 }
      );
      smokeResult = JSON.parse(output);
    } catch (err) {
      const stdout = err.stdout?.toString() || '';
      try { smokeResult = JSON.parse(stdout); } catch { smokeResult = { passed: false, error: 'Smoke test crashed' }; }
    }
  }

  // Save final state
  state.finishedAt = new Date().toISOString();
  saveState(projectPath, state);

  // Build report
  const report = {
    success: state.failedEntities.length === 0 && (finalValidation.output?.passed ?? false),
    waves: waveResults,
    summary: {
      totalEntities: spec.entities.length,
      completed: state.completedEntities.length,
      failed: state.failedEntities.length,
      buildPassed: finalValidation.output?.passed ?? false,
      buildIssues: finalValidation.output?.issues?.length ?? 0,
      migration: migrationResult,
      smokeTestPassed: smokeResult?.passed ?? null,
    },
    state: {
      file: path.join(projectPath, '.rockets', 'state.json'),
      resumable: state.failedEntities.length > 0,
    },
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.success ? 0 : 1);
}

main();
