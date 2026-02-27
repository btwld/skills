#!/usr/bin/env node

/**
 * Rockets SDK Endpoint Smoke Test
 *
 * Starts a NestJS app, runs CRUD endpoint tests, and reports pass/fail.
 *
 * Usage:
 *   node smoke-test-endpoints.js --project <project-path> [--port 3000] [--timeout 30000]
 *
 * Options:
 *   --project   Path to the project root (required)
 *   --port      Port to use (default: 3456 — avoids conflicts)
 *   --timeout   Startup timeout in ms (default: 30000)
 *   --no-auth   Skip signup/login — test without JWT
 *   --keep      Don't kill the app after tests
 *
 * Output:
 *   JSON { passed: boolean, summary: { total, passed, failed }, results: [...] }
 *
 * Requirements:
 *   - Project must have `yarn start` or `npm start` (or `nest start`)
 *   - Database must be accessible (uses project's .env)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { projectPath: null, port: 3456, timeout: 30000, noAuth: false, keep: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      result.projectPath = args[i + 1];
      i++;
    } else if (args[i] === '--port' && args[i + 1]) {
      result.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      result.timeout = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--no-auth') {
      result.noAuth = true;
    } else if (args[i] === '--keep') {
      result.keep = true;
    }
  }

  if (!result.projectPath) {
    console.error(JSON.stringify({ error: 'Missing --project <path>' }));
    process.exit(1);
  }

  return result;
}

// ---------------------------------------------------------------------------
// HTTP helper (zero deps)
// ---------------------------------------------------------------------------
function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;

    const opts = {
      method,
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = mod.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not json */ }
        resolve({ status: res.statusCode, body: json, raw });
      });
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timeout after 30s'));
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Wait for server to be ready
// ---------------------------------------------------------------------------
function waitForServer(baseUrl, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Server did not start within ${timeoutMs}ms`));
      }

      request('GET', baseUrl, null)
        .then((res) => {
          if (res.status < 500) {
            resolve();
          } else {
            setTimeout(check, 500);
          }
        })
        .catch(() => setTimeout(check, 500));
    };
    check();
  });
}

// ---------------------------------------------------------------------------
// Discover CRUD modules by scanning src/modules
// ---------------------------------------------------------------------------
function discoverModules(projectPath) {
  const modulesDir = path.join(projectPath, 'src', 'modules');
  if (!fs.existsSync(modulesDir)) return [];

  const dirs = fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const modules = [];

  for (const dir of dirs) {
    const ctrlFile = path.join(modulesDir, dir, `${dir}.crud.controller.ts`);
    if (!fs.existsSync(ctrlFile)) continue;

    const content = fs.readFileSync(ctrlFile, 'utf8');

    // Extract API path from @Controller('path')
    const pathMatch = content.match(/@Controller\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    const apiPath = pathMatch ? pathMatch[1] : dir;

    // Detect which operations are enabled
    const ops = [];
    if (content.includes('CrudReadMany') || content.includes('AccessControlReadMany')) ops.push('readMany');
    if (content.includes('CrudReadOne') || content.includes('AccessControlReadOne')) ops.push('readOne');
    if (content.includes('CrudCreateOne') || content.includes('AccessControlCreateOne')) ops.push('createOne');
    if (content.includes('CrudUpdateOne') || content.includes('AccessControlUpdateOne')) ops.push('updateOne');
    if (content.includes('CrudDeleteOne') || content.includes('AccessControlDeleteOne')) ops.push('deleteOne');

    // Extract required fields from create DTO (best effort)
    const fields = discoverCreateFields(projectPath, dir);

    modules.push({
      name: dir,
      apiPath: apiPath.startsWith('/') ? apiPath : `/${apiPath}`,
      operations: ops,
      createFields: fields,
    });
  }

  return modules;
}

/**
 * Best-effort field discovery from create DTO for minimum viable POST payload
 */
function discoverCreateFields(projectPath, moduleName) {
  // Try shared DTO first, then local
  const candidates = [
    path.join(projectPath, 'src', 'shared', moduleName, 'dtos', `${moduleName}-create.dto.ts`),
    path.join(projectPath, 'packages', 'shared', 'src', moduleName, 'dtos', `${moduleName}-create.dto.ts`),
  ];

  for (const dtoPath of candidates) {
    if (!fs.existsSync(dtoPath)) continue;
    const content = fs.readFileSync(dtoPath, 'utf8');
    return extractRequiredFields(content);
  }

  return {};
}

/**
 * Extract required fields from DTO class with decorators
 */
function extractRequiredFields(content) {
  const fields = {};
  const lines = content.split('\n');

  let lastDecorators = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Track decorators
    if (trimmed.startsWith('@')) {
      lastDecorators.push(trimmed);
      continue;
    }

    // Property declaration: name!: type or name: type
    const propMatch = trimmed.match(/^(\w+)(!?)\s*:\s*(\w+)/);
    if (!propMatch) {
      if (!trimmed.startsWith('@') && trimmed !== '' && trimmed !== '{' && trimmed !== '}') {
        lastDecorators = [];
      }
      continue;
    }

    const [, name, bang, type] = propMatch;
    const isRequired = bang === '!' || lastDecorators.some(d => d.includes('IsNotEmpty') || d.includes('IsDefined'));
    const isOptional = lastDecorators.some(d => d.includes('IsOptional'));

    if (isRequired && !isOptional) {
      fields[name] = generateSampleValue(name, type, lastDecorators);
    }

    lastDecorators = [];
  }

  return fields;
}

/**
 * Generate a plausible sample value based on field name and type
 */
function generateSampleValue(name, type, decorators) {
  const lower = name.toLowerCase();

  // Check for enum values in decorators
  for (const d of decorators) {
    const enumMatch = d.match(/@IsEnum\(\s*\{([^}]+)\}/);
    if (enumMatch) {
      const firstVal = enumMatch[1].split(',')[0].split(':')[1]?.trim().replace(/['"]/g, '');
      if (firstVal) return firstVal;
    }
  }

  switch (type) {
    case 'string':
      if (lower.includes('email')) return 'smoke-test@test.com';
      if (lower.includes('name')) return 'Smoke Test';
      if (lower.includes('url') || lower.includes('link')) return 'https://example.com';
      if (lower.includes('color')) return '#FF5733';
      if (lower.includes('phone')) return '+1234567890';
      if (lower.includes('description')) return 'Smoke test description';
      return `test-${name}`;
    case 'number':
      if (lower.includes('price') || lower.includes('amount')) return 9.99;
      if (lower.includes('quantity') || lower.includes('count')) return 1;
      if (lower.includes('order') || lower.includes('position') || lower.includes('sort')) return 0;
      return 1;
    case 'boolean':
      return true;
    case 'Date':
      return new Date().toISOString();
    default:
      return `test-${name}`;
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
async function signup(baseUrl) {
  const payload = {
    username: `smoke-test-${Date.now()}@test.com`,
    email: `smoke-test-${Date.now()}@test.com`,
    password: 'SmokeTest123!',
    passwordConfirm: 'SmokeTest123!',
  };

  // Try common signup endpoints
  const endpoints = ['/signup', '/auth/signup', '/register', '/auth/register'];

  for (const ep of endpoints) {
    try {
      const res = await request('POST', `${baseUrl}${ep}`, payload);
      if (res.status >= 200 && res.status < 300) {
        return { success: true, endpoint: ep, user: payload };
      }
    } catch { /* try next */ }
  }

  return { success: false, user: payload };
}

async function login(baseUrl, credentials) {
  const payload = {
    username: credentials.username || credentials.email,
    password: credentials.password,
  };

  // Try common login endpoints
  const endpoints = ['/token/password', '/auth/login', '/login', '/auth/token'];

  for (const ep of endpoints) {
    try {
      const res = await request('POST', `${baseUrl}${ep}`, payload);
      if (res.status >= 200 && res.status < 300 && res.body) {
        const token = res.body.accessToken || res.body.access_token || res.body.token;
        if (token) {
          return { success: true, endpoint: ep, token };
        }
      }
    } catch { /* try next */ }
  }

  return { success: false, token: null };
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
async function testModule(baseUrl, mod, token) {
  const results = [];
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = `${baseUrl}${mod.apiPath}`;

  let createdId = null;

  // 1. CREATE — POST /resource
  if (mod.operations.includes('createOne')) {
    const payload = Object.keys(mod.createFields).length > 0
      ? mod.createFields
      : { name: `smoke-${Date.now()}` };

    try {
      const res = await request('POST', url, payload, headers);
      const ok = res.status === 201 || res.status === 200;
      createdId = res.body?.id || res.body?.data?.id;
      results.push({
        operation: 'createOne',
        method: 'POST',
        url: mod.apiPath,
        status: res.status,
        passed: ok,
        error: ok ? null : (res.body?.message || res.raw?.slice(0, 200)),
      });
    } catch (err) {
      results.push({
        operation: 'createOne',
        method: 'POST',
        url: mod.apiPath,
        status: null,
        passed: false,
        error: err.message,
      });
    }
  }

  // 2. READ MANY — GET /resource
  if (mod.operations.includes('readMany')) {
    try {
      const res = await request('GET', url, null, headers);
      const ok = res.status === 200;
      // If we didn't create one yet, try to grab an ID from the list
      if (!createdId && res.body) {
        const items = Array.isArray(res.body) ? res.body : (res.body.data || res.body.items || []);
        if (items.length > 0) createdId = items[0].id;
      }
      results.push({
        operation: 'readMany',
        method: 'GET',
        url: mod.apiPath,
        status: res.status,
        passed: ok,
        error: ok ? null : (res.body?.message || res.raw?.slice(0, 200)),
      });
    } catch (err) {
      results.push({
        operation: 'readMany',
        method: 'GET',
        url: mod.apiPath,
        status: null,
        passed: false,
        error: err.message,
      });
    }
  }

  // 3. READ ONE — GET /resource/:id
  if (mod.operations.includes('readOne') && createdId) {
    try {
      const res = await request('GET', `${url}/${createdId}`, null, headers);
      const ok = res.status === 200;
      results.push({
        operation: 'readOne',
        method: 'GET',
        url: `${mod.apiPath}/${createdId}`,
        status: res.status,
        passed: ok,
        error: ok ? null : (res.body?.message || res.raw?.slice(0, 200)),
      });
    } catch (err) {
      results.push({
        operation: 'readOne',
        method: 'GET',
        url: `${mod.apiPath}/:id`,
        status: null,
        passed: false,
        error: err.message,
      });
    }
  }

  // 4. UPDATE — PATCH /resource/:id
  if (mod.operations.includes('updateOne') && createdId) {
    // Use first field from createFields or a generic update
    const updatePayload = {};
    const firstField = Object.keys(mod.createFields)[0];
    if (firstField) {
      updatePayload[firstField] = typeof mod.createFields[firstField] === 'string'
        ? `updated-${Date.now()}`
        : mod.createFields[firstField];
    }

    try {
      const res = await request('PATCH', `${url}/${createdId}`, updatePayload, headers);
      const ok = res.status === 200;
      results.push({
        operation: 'updateOne',
        method: 'PATCH',
        url: `${mod.apiPath}/${createdId}`,
        status: res.status,
        passed: ok,
        error: ok ? null : (res.body?.message || res.raw?.slice(0, 200)),
      });
    } catch (err) {
      results.push({
        operation: 'updateOne',
        method: 'PATCH',
        url: `${mod.apiPath}/:id`,
        status: null,
        passed: false,
        error: err.message,
      });
    }
  }

  // 5. DELETE — DELETE /resource/:id
  if (mod.operations.includes('deleteOne') && createdId) {
    try {
      const res = await request('DELETE', `${url}/${createdId}`, null, headers);
      const ok = res.status === 200 || res.status === 204;
      results.push({
        operation: 'deleteOne',
        method: 'DELETE',
        url: `${mod.apiPath}/${createdId}`,
        status: res.status,
        passed: ok,
        error: ok ? null : (res.body?.message || res.raw?.slice(0, 200)),
      });
    } catch (err) {
      results.push({
        operation: 'deleteOne',
        method: 'DELETE',
        url: `${mod.apiPath}/:id`,
        status: null,
        passed: false,
        error: err.message,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Start app process
// ---------------------------------------------------------------------------
function startApp(projectPath, port) {
  const env = { ...process.env, PORT: String(port) };

  // Detect start command
  const pkgPath = path.join(projectPath, 'package.json');
  let startCmd = 'start';
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    // Prefer compiled `start` over `start:dev` (faster startup, no watch overhead)
    if (pkg.scripts?.start) startCmd = 'start';
    else if (pkg.scripts?.['start:dev']) startCmd = 'start:dev';
  }

  const hasYarnLock = fs.existsSync(path.join(projectPath, 'yarn.lock'));
  const cmd = hasYarnLock ? 'yarn' : 'npm';
  const args = hasYarnLock ? [startCmd] : ['run', startCmd];

  const child = spawn(cmd, args, {
    cwd: projectPath,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
  });

  child.on('error', (err) => {
    console.error(`[spawn error] ${err.message}`);
  });

  // Collect stderr for diagnostics
  let stderr = '';
  child.stderr.on('data', (data) => { stderr += data.toString(); });
  let stdout = '';
  child.stdout.on('data', (data) => { stdout += data.toString(); });

  return { child, getStderr: () => stderr, getStdout: () => stdout };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { projectPath, port, timeout, noAuth, keep } = parseArgs();
  const resolvedPath = path.resolve(projectPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(JSON.stringify({ error: `Project path not found: ${resolvedPath}` }));
    process.exit(1);
  }

  const baseUrl = `http://localhost:${port}`;

  // Discover modules
  const modules = discoverModules(resolvedPath);
  if (modules.length === 0) {
    console.error(JSON.stringify({
      error: 'No CRUD modules found in src/modules/',
      hint: 'Ensure modules have *.crud.controller.ts files',
    }));
    process.exit(1);
  }

  console.error(`Discovered ${modules.length} CRUD module(s): ${modules.map(m => m.name).join(', ')}`);

  // Start the app
  console.error(`Starting app on port ${port}...`);
  const { child, getStderr, getStdout } = startApp(resolvedPath, port);

  const cleanup = () => {
    if (!keep) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        try { child.kill('SIGTERM'); } catch { /* already dead */ }
      }
    }
  };

  process.on('SIGINT', () => { cleanup(); process.exit(1); });
  process.on('SIGTERM', () => { cleanup(); process.exit(1); });

  try {
    // Wait for server
    console.error(`Waiting for server at ${baseUrl} (timeout: ${timeout}ms)...`);
    await waitForServer(baseUrl, timeout);
    console.error('Server is ready.');

    // Auth flow
    let token = null;
    const authResults = [];

    if (!noAuth) {
      console.error('Running auth flow...');

      // Signup
      const signupResult = signup(baseUrl);
      const signupRes = await signupResult;

      if (signupRes.success) {
        console.error(`Signup OK via ${signupRes.endpoint}`);
        authResults.push({ step: 'signup', passed: true, endpoint: signupRes.endpoint });
      } else {
        console.error('Signup failed (may already exist) — trying login anyway');
        authResults.push({ step: 'signup', passed: false, note: 'signup failed or not available' });
      }

      // Login
      const loginRes = await login(baseUrl, signupRes.user);
      if (loginRes.success) {
        token = loginRes.token;
        console.error(`Login OK via ${loginRes.endpoint}`);
        authResults.push({ step: 'login', passed: true, endpoint: loginRes.endpoint });
      } else {
        console.error('Login failed — proceeding without auth');
        authResults.push({ step: 'login', passed: false, note: 'login failed, testing without JWT' });
      }
    }

    // Test each module
    const allResults = [];

    for (const mod of modules) {
      console.error(`Testing module: ${mod.name} (${mod.apiPath})...`);
      const results = await testModule(baseUrl, mod, token);
      allResults.push({
        module: mod.name,
        apiPath: mod.apiPath,
        results,
      });

      const passCount = results.filter(r => r.passed).length;
      console.error(`  ${passCount}/${results.length} passed`);
    }

    // Build report
    const flatResults = allResults.flatMap(m => m.results);
    const totalPassed = flatResults.filter(r => r.passed).length;
    const totalFailed = flatResults.filter(r => !r.passed).length;

    const report = {
      passed: totalFailed === 0,
      summary: {
        total: flatResults.length,
        passed: totalPassed,
        failed: totalFailed,
        modules: modules.length,
      },
      auth: authResults,
      modules: allResults,
    };

    // Output JSON report
    console.log(JSON.stringify(report, null, 2));

    // Cleanup
    cleanup();

    process.exit(report.passed ? 0 : 1);
  } catch (err) {
    const report = {
      passed: false,
      error: err.message,
      serverStderr: getStderr().slice(-2000),
      serverStdout: getStdout().slice(-2000),
    };

    console.log(JSON.stringify(report, null, 2));
    cleanup();
    process.exit(1);
  }
}

main();
