#!/usr/bin/env node
/**
 * check-sbvr-coverage.js
 *
 * Reads and updates .rockets/sbvr-rules.json (business rule coverage registry).
 * Works with any spec type: SBVR, PRD, RFC, or custom requirements documents.
 *
 * Usage:
 *   # Human-readable coverage report
 *   node check-sbvr-coverage.js --project ./apps/api
 *
 *   # Pending rules as JSON array (for loop automation)
 *   node check-sbvr-coverage.js --project ./apps/api --pending
 *
 *   # Mark a rule as implemented
 *   node check-sbvr-coverage.js --project ./apps/api \
 *     --mark-implemented B7 \
 *     --files "src/modules/order/order-notification.service.ts,src/modules/order/listeners/order-shipped.listener.ts"
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

function hasFlag(flag) {
  return args.includes(flag);
}

const projectPath = getArg('--project') || '.';
const isPending = hasFlag('--pending');
const markId = getArg('--mark-implemented');
const filesArg = getArg('--files');

// ---------------------------------------------------------------------------
// File resolution
// ---------------------------------------------------------------------------

const RULES_FILE = path.resolve(projectPath, '.rockets', 'sbvr-rules.json');

function readRules() {
  if (!fs.existsSync(RULES_FILE)) {
    console.error(`Error: ${RULES_FILE} not found.`);
    console.error('Run the rockets-planner agent to generate this file from your spec.');
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
  } catch (err) {
    console.error(`Error parsing ${RULES_FILE}: ${err.message}`);
    process.exit(1);
  }
}

// Atomic write: temp file + rename to avoid partial writes
function writeRules(data) {
  const dir = path.dirname(RULES_FILE);
  const tmp = path.join(os.tmpdir(), `sbvr-rules-${Date.now()}.json`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
    // Ensure destination directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(tmp, RULES_FILE);
  } catch (err) {
    // Clean up temp file on failure
    try { fs.unlinkSync(tmp); } catch (_) {}
    console.error(`Error writing ${RULES_FILE}: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Output pending rules as JSON array (for automation loop).
 * Each item: { id, type, description, entity, pattern }
 */
function cmdPending() {
  const data = readRules();
  const pending = (data.rules || [])
    .filter(r => r.status === 'pending')
    .map(r => ({
      id: r.id,
      type: r.type,
      description: r.description,
      entity: r.entity,
      pattern: r.pattern,
    }));
  console.log(JSON.stringify(pending, null, 2));
}

/**
 * Mark a rule as implemented.
 * --mark-implemented <id> --files "file1,file2,..."
 */
function cmdMarkImplemented(id, files) {
  const data = readRules();
  const rule = (data.rules || []).find(r => r.id === id);

  if (!rule) {
    console.error(`Error: Rule "${id}" not found in ${RULES_FILE}`);
    const ids = (data.rules || []).map(r => r.id).join(', ');
    console.error(`Available rule IDs: ${ids}`);
    process.exit(1);
  }

  if (rule.status === 'implemented') {
    console.log(`Rule ${id} is already marked as implemented. No change.`);
    return;
  }

  rule.status = 'implemented';
  rule.implementedAt = new Date().toISOString();
  rule.files = files
    ? files.split(',').map(f => f.trim()).filter(Boolean)
    : [];

  writeRules(data);

  const total = (data.rules || []).length;
  const done = (data.rules || []).filter(r => r.status === 'implemented').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  console.log(`✓ Rule ${id} marked as implemented.`);
  console.log(`  Files: ${rule.files.length > 0 ? rule.files.join(', ') : '(none recorded)'}`);
  console.log(`  Coverage: ${done}/${total} rules (${pct}%)`);
}

/**
 * Print human-readable coverage report.
 */
function cmdReport() {
  const data = readRules();
  const rules = data.rules || [];
  const total = rules.length;
  const implemented = rules.filter(r => r.status === 'implemented');
  const pending = rules.filter(r => r.status === 'pending');
  const pct = total > 0 ? Math.round((implemented.length / total) * 100) : 0;

  const specType = data.specType ? ` (${data.specType.toUpperCase()})` : '';
  const specFile = data.spec ? ` — spec: ${data.spec}` : '';

  console.log('');
  console.log(`Business Rule Coverage${specType}${specFile}`);
  console.log('─'.repeat(60));
  console.log(`  Total rules:       ${total}`);
  console.log(`  Implemented:       ${implemented.length}`);
  console.log(`  Pending:           ${pending.length}`);
  console.log(`  Coverage:          ${pct}%`);
  console.log('');

  if (pending.length > 0) {
    console.log('Pending rules:');
    pending.forEach(r => {
      const pat = r.pattern ? ` [Pattern ${r.pattern}]` : '';
      const ent = r.entity ? ` (${r.entity})` : '';
      console.log(`  ${r.id}${ent}${pat}: ${r.type} — ${r.description}`);
    });
    console.log('');
  }

  if (implemented.length > 0) {
    console.log('Implemented rules:');
    implemented.forEach(r => {
      const ts = r.implementedAt
        ? ` [${new Date(r.implementedAt).toISOString().slice(0, 10)}]`
        : '';
      const fileCount = r.files && r.files.length > 0 ? ` (${r.files.length} file${r.files.length > 1 ? 's' : ''})` : '';
      console.log(`  ✓ ${r.id}${ts}${fileCount}: ${r.description}`);
    });
    console.log('');
  }

  if (pct === 100) {
    console.log('✓ 100% coverage — all rules implemented.');
  } else {
    console.log(`  Run with --pending to get machine-readable pending rules list.`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (markId) {
  cmdMarkImplemented(markId, filesArg);
} else if (isPending) {
  cmdPending();
} else {
  cmdReport();
}
