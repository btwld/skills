#!/usr/bin/env node

/**
 * Rockets SDK CRUD Integrator
 *
 * Takes the JSON output from generate.js and wires everything into the project:
 * 1. Writes all generated files to disk (entities live inside their module)
 * 2. Updates typeorm.settings.ts — adds entity import + entity to array
 * 3. Updates app.module.ts — adds module import + CrudModule.forRoot({})
 * 4. Updates app.acl.ts — adds resource + grants (with dedup)
 *
 * Note: Access query services are registered in feature modules by module.js
 * (AccessControlGuard.moduleRef.resolve() scopes to the controller's host module).
 *
 * Template files (main.ts, typeorm.settings, auth config) are NOT touched here —
 * they must be correct in the starter template from day one. Use validate.js to detect issues.
 *
 * Usage:
 *   node integrate.js --input <generate-output.json> --project <project-path>
 *   cat generate-output.json | node integrate.js --project <project-path>
 *
 * Output:
 *   JSON { success: boolean, actions: string[], warnings: string[] }
 */

const fs = require('fs');
const path = require('path');
const { toKebabCase } = require('./lib/name-utils');
/**
 * Read input from file, CLI arg, or stdin
 */
async function readInput() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let projectPath = '.';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--project' && args[i + 1]) {
      projectPath = args[i + 1];
      i++;
    }
  }

  let data;
  if (inputPath) {
    data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  } else {
    // Try stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim()) {
      throw new Error('No input. Use --input <file> or pipe JSON from generate.js');
    }
    data = JSON.parse(raw);
  }

  return { data, projectPath };
}

/**
 * Ensure directory exists
 */
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write generated files to disk
 */
function writeFiles(files, projectPath, actions) {
  const resolvedRoot = path.resolve(projectPath);
  for (const file of files) {
    const fullPath = path.resolve(projectPath, file.path);
    // Path traversal guard: ensure resolved path stays within project root
    if (!fullPath.startsWith(resolvedRoot + path.sep) && fullPath !== resolvedRoot) {
      throw new Error(`Path traversal detected: ${file.path} resolves outside project root`);
    }
    ensureDir(fullPath);
    fs.writeFileSync(fullPath, file.content, 'utf8');
    actions.push(`Created ${file.path}`);
  }
}

/**
 * Add entity to typeorm.settings.ts entities array
 */
function updateTypeOrmSettings(wiring, projectPath, actions, warnings) {
  // Try common file names
  const candidates = [
    'src/typeorm.settings.ts',
    'src/config/typeorm.settings.ts',
    'src/ormconfig.ts',
  ];

  let settingsPath = null;
  for (const candidate of candidates) {
    const full = path.join(projectPath, candidate);
    if (fs.existsSync(full)) {
      settingsPath = full;
      break;
    }
  }

  if (!settingsPath) {
    warnings.push('Could not find typeorm.settings.ts — add entity manually');
    return;
  }

  let content = fs.readFileSync(settingsPath, 'utf8');
  if (content.includes(wiring.entityClass)) {
    warnings.push(`Entity ${wiring.entityClass} already in typeorm settings`);
    return;
  }

  // Find the entities array and add our entity
  if (!content.match(/entities:\s*\[/)) {
    warnings.push(`Could not find entities array in ${path.basename(settingsPath)} — add manually`);
    return;
  }

  // Add import for entity from its module directory
  const settingsDir = path.dirname(settingsPath);
  const srcDir = path.join(projectPath, 'src');
  let relPrefix = path.relative(settingsDir, srcDir);
  if (!relPrefix.startsWith('.')) relPrefix = './' + relPrefix;
  // wiring.entityImportPath is relative from src/ (e.g., ./modules/task/entities/task.entity)
  const entityRelPath = wiring.entityImportPath.replace(/^\.\//, '');
  const importLine = `import { ${wiring.entityClass} } from '${relPrefix}/${entityRelPath}';`;

  const lastImportIdx = content.lastIndexOf('import ');
  const lineEnd = content.indexOf('\n', lastImportIdx);
  content = content.slice(0, lineEnd + 1) + importLine + '\n' + content.slice(lineEnd + 1);

  // Add to entities array
  content = content.replace(
    /(entities:\s*\[)/,
    `$1\n    ${wiring.entityClass},`
  );

  fs.writeFileSync(settingsPath, content, 'utf8');
  actions.push(`Added ${wiring.entityClass} to ${path.basename(settingsPath)}`);
}

/**
 * Add module import to app.module.ts
 */
function updateAppModule(wiring, projectPath, actions, warnings) {
  const modulePath = path.join(projectPath, 'src/app.module.ts');

  if (!fs.existsSync(modulePath)) {
    warnings.push('Could not find src/app.module.ts — add module import manually');
    return;
  }

  let content = fs.readFileSync(modulePath, 'utf8');
  if (content.includes(wiring.moduleClass)) {
    warnings.push(`Module ${wiring.moduleClass} already imported in app.module.ts`);
    return;
  }

  // Add import statement after last import
  const lastImportIdx = content.lastIndexOf('import ');
  const lineEnd = content.indexOf('\n', lastImportIdx);
  const moduleKebab = toKebabCase(wiring.moduleClass.replace('Module', ''));
  const importLine = `import { ${wiring.moduleClass} } from './modules/${moduleKebab}/${moduleKebab}.module';`;
  content = content.slice(0, lineEnd + 1) + importLine + '\n' + content.slice(lineEnd + 1);

  // Add to imports array — scoped to @Module() decorator, using bracket-depth counting
  // to correctly find the closing ] of the imports array (not nested arrays like load:[])
  const moduleIdx = content.indexOf('@Module(');
  if (moduleIdx === -1) {
    warnings.push('Could not find @Module() decorator in app.module.ts — add module manually');
  } else {
    const moduleSection = content.slice(moduleIdx);
    const importsStart = moduleSection.match(/imports:\s*\[/);
    if (importsStart) {
      const bracketOpenIdx = moduleIdx + importsStart.index + importsStart[0].length;
      // Count bracket depth to find the matching ]
      let depth = 1;
      let pos = bracketOpenIdx;
      while (pos < content.length && depth > 0) {
        if (content[pos] === '[') depth++;
        if (content[pos] === ']') depth--;
        if (depth > 0) pos++;
      }
      // pos now points to the closing ] of the imports array
      const insertion = `,\n    ${wiring.moduleClass}`;
      // Find the last non-whitespace before ] to insert after it
      let insertPos = pos;
      // Walk back past whitespace/newlines to find insertion point
      let beforeClose = content.slice(bracketOpenIdx, pos).trimEnd();
      // Remove trailing comma if present (we'll add our own)
      if (beforeClose.endsWith(',')) {
        beforeClose = beforeClose.slice(0, -1);
      }
      content = content.slice(0, bracketOpenIdx) + beforeClose + insertion + ',\n  ' + content.slice(pos);
    } else {
      warnings.push('Could not find imports array in @Module() decorator — add module manually');
    }
  }

  fs.writeFileSync(modulePath, content, 'utf8');
  actions.push(`Added ${wiring.moduleClass} to app.module.ts imports`);
}

/**
 * Add resource enum + grants to app.acl.ts
 */
function updateAppAcl(aclSnippet, projectPath, actions, warnings) {
  if (!aclSnippet) return;

  const aclPath = path.join(projectPath, 'src/app.acl.ts');

  if (!fs.existsSync(aclPath)) {
    warnings.push('Could not find src/app.acl.ts — add ACL rules manually');
    return;
  }

  let content = fs.readFileSync(aclPath, 'utf8');

  // Add resource to AppResource enum
  if (content.includes('AppResource')) {
    if (content.includes(aclSnippet.resourceEnum.split(' ')[0])) {
      warnings.push(`Resource ${aclSnippet.resourceEnum.split(' ')[0]} already in AppResource enum`);
    } else {
      // Insert before the closing brace of the enum
      content = content.replace(
        /(export\s+enum\s+AppResource\s*\{[\s\S]*?)(}\s*)/,
        (match, before, after) => {
          const trimmed = before.trimEnd();
          const needsComma = !trimmed.endsWith(',') && !trimmed.endsWith('{');
          return trimmed + (needsComma ? ',' : '') + `\n  ${aclSnippet.resourceEnum},\n${after}`;
        }
      );
      actions.push(`Added resource to AppResource enum in app.acl.ts`);
    }
  }

  // Detect if a blanket "allResources" grant already exists for each role
  // If so, skip per-entity grants for that role (they're redundant)
  for (const grant of aclSnippet.grants) {
    const resourceStr = grant.split('.resource(')[1]?.split(')')[0] || '___never___';
    // Use regex with word boundaries for exact resource match to avoid substring collisions
    const resourceRe = new RegExp(`\\.resource\\(\\s*${resourceStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)`);
    if (resourceRe.test(content)) continue; // already has this exact grant

    // Extract the role from the grant (e.g., "AppRole.Admin")
    const roleMatch = grant.match(/\.grant\(\[([^\]]+)\]\)/);
    if (roleMatch) {
      const roleName = roleMatch[1].trim();
      // Check if this role already has a blanket grant on allResources / Object.values(AppResource)
      // Pattern: .grant([AppRole.Admin]).resource(allResources) or .resource(Object.values(AppResource))
      const blanketRe = new RegExp(
        `\\.grant\\(\\[\\s*${roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]\\)` +
        `[\\s\\S]*?\\.resource\\(\\s*(?:allResources|Object\\.values\\(AppResource\\))\\s*\\)`
      );
      if (blanketRe.test(content)) {
        // Extract methods from the existing blanket grant to check coverage
        // Use [\s\S]*? between .grant() and .resource() to handle multiline formatting
        const blanketMethodsMatch = content.match(new RegExp(
          `\\.grant\\(\\[\\s*${roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\]\\)` +
          `[\\s\\S]*?\\.resource\\(\\s*(?:allResources|Object\\.values\\(AppResource\\))\\s*\\)([^;]+);`
        ));
        if (blanketMethodsMatch) {
          // Skip this grant — role already has blanket access
          continue;
        }
      }
    }

    content = content.trimEnd() + '\n\n' + grant + '\n';
    actions.push(`Added ACL grant to app.acl.ts`);
  }

  fs.writeFileSync(aclPath, content, 'utf8');
}

/**
 * Ensure CrudModule.forRoot({}) exists in app.module.ts (required before CrudModule.forFeature)
 */
function ensureCrudModuleRoot(projectPath, actions, warnings) {
  const modulePath = path.join(projectPath, 'src/app.module.ts');

  if (!fs.existsSync(modulePath)) return;

  let content = fs.readFileSync(modulePath, 'utf8');

  // Check if CrudModule.forRoot already exists
  if (/CrudModule\.forRoot\s*\(/.test(content)) return;

  // Add import if CrudModule is not imported yet
  if (!content.includes("from '@concepta/nestjs-crud'")) {
    const lastImportIdx = content.lastIndexOf('import ');
    const lineEnd = content.indexOf('\n', lastImportIdx);
    const importLine = `import { CrudModule } from '@concepta/nestjs-crud';`;
    content = content.slice(0, lineEnd + 1) + importLine + '\n' + content.slice(lineEnd + 1);
  } else if (!content.includes('CrudModule')) {
    // CrudModule not in existing @concepta/nestjs-crud import — add it
    content = content.replace(
      /(import\s*\{)([^}]*)(}\s*from\s*['"]@concepta\/nestjs-crud['"])/,
      (match, before, names, after) => {
        return `${before}${names.trimEnd()}, CrudModule,\n${after}`;
      }
    );
  }

  // Add CrudModule.forRoot({}) to imports array
  const moduleIdx = content.indexOf('@Module(');
  if (moduleIdx === -1) {
    warnings.push('Could not find @Module() decorator — add CrudModule.forRoot({}) manually');
    return;
  }

  const moduleSection = content.slice(moduleIdx);
  const importsStart = moduleSection.match(/imports:\s*\[/);
  if (importsStart) {
    const insertIdx = moduleIdx + importsStart.index + importsStart[0].length;
    content = content.slice(0, insertIdx) + '\n    CrudModule.forRoot({}),' + content.slice(insertIdx);
  }

  fs.writeFileSync(modulePath, content, 'utf8');
  actions.push('Added CrudModule.forRoot({}) to app.module.ts');
}

/**
 * Main integration function
 */
async function main() {
  const actions = [];
  const warnings = [];

  try {
    const { data, projectPath } = await readInput();
    const { files, wiring } = data;

    if (!files || !wiring) {
      throw new Error('Invalid input: expected { files, wiring } from generate.js output');
    }

    const resolvedPath = path.resolve(projectPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Project path does not exist: ${resolvedPath}`);
    }

    // 1. Write all generated files
    writeFiles(files, resolvedPath, actions);

    // 2. Update typeorm.settings.ts
    updateTypeOrmSettings(wiring, resolvedPath, actions, warnings);

    // 3. Update app.module.ts
    updateAppModule(wiring, resolvedPath, actions, warnings);

    // 3b. Ensure CrudModule.forRoot({}) is present
    ensureCrudModuleRoot(resolvedPath, actions, warnings);

    // 4. Update app.acl.ts (if acl config present)
    updateAppAcl(wiring.aclSnippet, resolvedPath, actions, warnings);

    const result = {
      success: true,
      actions,
      warnings,
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({
      success: false,
      error: err.message,
      actions,
      warnings,
    }));
    process.exit(1);
  }
}

main();
