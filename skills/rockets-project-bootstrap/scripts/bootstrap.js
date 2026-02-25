#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_REPO = 'git@github.com:btwld/rockets-starter.git';

function parseArgs(argv) {
  const args = {
    repo: DEFAULT_REPO,
    dest: '',
    branch: '',
    packageManager: 'auto',
    install: false,
    runBuild: false,
    runTest: false,
    dryRun: false,
    skipClone: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--repo') args.repo = argv[++i];
    else if (arg === '--dest') args.dest = argv[++i];
    else if (arg === '--branch') args.branch = argv[++i];
    else if (arg === '--package-manager') args.packageManager = argv[++i];
    else if (arg === '--install') args.install = true;
    else if (arg === '--run-build') args.runBuild = true;
    else if (arg === '--run-test') args.runTest = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--skip-clone') args.skipClone = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Rockets Project Bootstrap\n\n` +
`Options:\n` +
`  --repo <url>             Template repository (default: ${DEFAULT_REPO})\n` +
`  --dest <path>            Destination directory\n` +
`  --branch <name>          Optional git branch\n` +
`  --package-manager <pm>   yarn|pnpm|npm|auto (default: auto)\n` +
`  --install                Run dependency install\n` +
`  --run-build              Run build script if present\n` +
`  --run-test               Run test script if present\n` +
`  --skip-clone             Use existing project at --dest\n` +
`  --dry-run                Print actions without executing\n` +
`  --json                   JSON output\n` +
`  --help                   Show this help\n`);
}

function basenameFromRepo(repo) {
  const normalized = repo.endsWith('.git') ? repo.slice(0, -4) : repo;
  const parts = normalized.split('/');
  return parts[parts.length - 1] || 'rockets-project';
}

function run(cmd, cmdArgs, opts = {}) {
  const { cwd = process.cwd(), dryRun = false } = opts;
  const joined = `${cmd} ${cmdArgs.join(' ')}`;

  if (dryRun) {
    return { ok: true, command: joined, dryRun: true, stdout: '', stderr: '', status: 0 };
  }

  const result = spawnSync(cmd, cmdArgs, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    ok: result.status === 0,
    command: joined,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function detectPackageManager(projectDir, forced) {
  if (forced && forced !== 'auto') return forced;
  if (exists(path.join(projectDir, 'yarn.lock'))) return 'yarn';
  if (exists(path.join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(path.join(projectDir, 'package-lock.json'))) return 'npm';
  return 'yarn';
}

function readPackageScripts(projectDir) {
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (!exists(packageJsonPath)) return {};

  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return parsed.scripts || {};
  } catch {
    return {};
  }
}

function ensureEnv(projectDir, dryRun) {
  const envPath = path.join(projectDir, '.env');
  const envExamplePath = path.join(projectDir, '.env.example');

  if (exists(envPath)) {
    return { changed: false, message: '.env already present' };
  }

  if (!exists(envExamplePath)) {
    return { changed: false, message: '.env.example not found; skipped .env creation' };
  }

  if (!dryRun) {
    fs.copyFileSync(envExamplePath, envPath);
  }

  return { changed: true, message: 'Created .env from .env.example' };
}

function runScript(projectDir, pm, scriptName, dryRun) {
  const scripts = readPackageScripts(projectDir);
  if (!scripts[scriptName]) {
    return { skipped: true, ok: true, message: `script '${scriptName}' not found` };
  }

  if (pm === 'npm') {
    return run('npm', ['run', scriptName], { cwd: projectDir, dryRun });
  }

  return run(pm, [scriptName], { cwd: projectDir, dryRun });
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const destBase = args.dest ? args.dest : basenameFromRepo(args.repo);
  const projectDir = path.resolve(process.cwd(), destBase);

  const summary = {
    repo: args.repo,
    projectDir,
    steps: [],
    packageManager: null,
    checks: [],
  };

  function step(name, result) {
    summary.steps.push({ name, ...result });
  }

  if (!args.skipClone) {
    if (exists(projectDir)) {
      step('clone', { ok: false, message: `destination already exists: ${projectDir}` });
      outputAndExit(args.json, summary, 1);
      return;
    }

    const cloneArgs = ['clone', args.repo, projectDir];
    if (args.branch) {
      cloneArgs.splice(1, 0, '--branch', args.branch);
    }

    const cloneResult = run('git', cloneArgs, { dryRun: args.dryRun });
    step('clone', cloneResult.ok
      ? { ok: true, message: 'repository cloned', command: cloneResult.command }
      : { ok: false, message: 'git clone failed', command: cloneResult.command, stderr: cloneResult.stderr });

    if (!cloneResult.ok) {
      outputAndExit(args.json, summary, 1);
      return;
    }
  } else {
    if (!exists(projectDir)) {
      step('clone', { ok: false, message: `--skip-clone used but destination does not exist: ${projectDir}` });
      outputAndExit(args.json, summary, 1);
      return;
    }

    step('clone', { ok: true, message: 'skipped clone; using existing directory' });
  }

  const envResult = ensureEnv(projectDir, args.dryRun);
  step('env', { ok: true, ...envResult });

  const pm = detectPackageManager(projectDir, args.packageManager);
  summary.packageManager = pm;
  step('package-manager', { ok: true, message: `using ${pm}` });

  if (args.install) {
    let installResult;
    if (pm === 'npm') installResult = run('npm', ['install'], { cwd: projectDir, dryRun: args.dryRun });
    else installResult = run(pm, ['install'], { cwd: projectDir, dryRun: args.dryRun });

    step('install', installResult.ok
      ? { ok: true, command: installResult.command, message: 'dependencies installed' }
      : { ok: false, command: installResult.command, message: 'dependency install failed', stderr: installResult.stderr });

    if (!installResult.ok) {
      outputAndExit(args.json, summary, 1);
      return;
    }
  }

  if (args.runBuild) {
    const result = runScript(projectDir, pm, 'build', args.dryRun);
    summary.checks.push({ name: 'build', ...result });
    if (!result.ok) {
      outputAndExit(args.json, summary, 1);
      return;
    }
  }

  if (args.runTest) {
    const result = runScript(projectDir, pm, 'test', args.dryRun);
    summary.checks.push({ name: 'test', ...result });
    if (!result.ok) {
      outputAndExit(args.json, summary, 1);
      return;
    }
  }

  outputAndExit(args.json, summary, 0);
}

function outputAndExit(asJson, summary, code) {
  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
    process.exit(code);
  }

  console.log('# Rockets Project Bootstrap');
  console.log(`Repo: ${summary.repo}`);
  console.log(`Project: ${summary.projectDir}`);

  for (const s of summary.steps) {
    console.log(`- ${s.name}: ${s.ok ? 'PASS' : 'FAIL'} - ${s.message || ''}`);
  }

  if (summary.packageManager) {
    console.log(`Package manager: ${summary.packageManager}`);
  }

  if (summary.checks.length > 0) {
    console.log('Checks:');
    for (const check of summary.checks) {
      const status = check.skipped ? 'SKIPPED' : check.ok ? 'PASS' : 'FAIL';
      const suffix = check.skipped ? ` (${check.message})` : check.command ? ` (${check.command})` : '';
      console.log(`- ${check.name}: ${status}${suffix}`);
    }
  }

  if (code === 0) {
    console.log('Bootstrap completed successfully.');
  }

  process.exit(code);
}

main();
