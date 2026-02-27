/**
 * TypeORM Migration Generator (static fallback)
 *
 * Generates migration files from entity configurations without a database
 * connection. Used as a fallback when TypeORM's `migration:generate` cannot
 * run (no DB available).
 *
 * Limitation: audit columns from CommonPostgresEntity are hardcoded here.
 * If the SDK changes CommonPostgresEntity, this must be updated manually.
 * Always prefer `migration:generate` with a real DB for production use.
 *
 * @module generators/migration
 */

const { mapTypeToColumn } = require('../lib/type-mappings');
const { toSnakeCase, toPascalCase } = require('../lib/name-utils');

/**
 * SQL for columns inherited from CommonPostgresEntity.
 * Must match @concepta/nestjs-typeorm-ext exactly.
 * Source: observed from TypeORM migration:generate output.
 */
const AUDIT_COLUMNS_SQL = [
  '"dateCreated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
  '"dateUpdated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()',
  '"dateDeleted" TIMESTAMP WITH TIME ZONE',
  '"version" integer NOT NULL',
  '"id" uuid NOT NULL DEFAULT uuid_generate_v4()',
];

const SDK_TABLE_NAMES = {
  User: 'user',
  Role: 'role',
  UserRole: 'user_role',
  UserOtp: 'user_otp',
  UserMetadata: 'user_metadata',
  Federated: 'federated',
  Invitation: 'invitation',
};

/**
 * Resolve an entity name to its database table name.
 * @param {string} entityName - PascalCase entity name
 * @param {Map<string, string>} planTableMap - entityName → tableName from current plan
 * @returns {string}
 */
function resolveTableName(entityName, planTableMap) {
  if (SDK_TABLE_NAMES[entityName]) return SDK_TABLE_NAMES[entityName];
  if (planTableMap && planTableMap.has(entityName)) return planTableMap.get(entityName);
  return toSnakeCase(entityName);
}

/**
 * Convert a mapTypeToColumn result to a SQL type string.
 * @param {Object} columnConfig - from mapTypeToColumn()
 * @returns {string}
 */
function columnTypeToSql(columnConfig) {
  const { type, length, precision, scale } = columnConfig;

  switch (type) {
    case 'varchar':
      return `character varying(${length || 255})`;
    case 'text':
      return 'text';
    case 'int':
      return 'integer';
    case 'decimal':
      return `numeric(${precision || 10},${scale || 2})`;
    case 'boolean':
      return 'boolean';
    case 'timestamp':
      return 'TIMESTAMP';
    case 'uuid':
      return 'uuid';
    case 'jsonb':
      return 'jsonb';
    default:
      return `character varying(255)`;
  }
}

/**
 * Convert a field config to a SQL column definition.
 * @param {Object} field - normalizeField() output
 * @returns {string}
 */
function fieldToSql(field) {
  const columnConfig = mapTypeToColumn(field);
  const sqlType = columnTypeToSql(columnConfig);
  const nullable = field.required ? ' NOT NULL' : '';

  let defaultClause = '';
  if (field.default !== undefined) {
    const raw = typeof field.default === 'string'
      ? field.default.replace(/^'(.*)'$/, '$1')
      : field.default;
    const val = typeof raw === 'string' ? `'${raw}'` : raw;
    defaultClause = ` DEFAULT ${val}`;
  }

  return `"${field.name}" ${sqlType}${nullable}${defaultClause}`;
}

/**
 * Convert an owned relation to a FK column definition.
 * @param {Object} relation - normalizeRelation() output
 * @returns {string}
 */
function fkColumnToSql(relation) {
  const nullable = relation.nullable ? '' : ' NOT NULL';
  return `"${relation.foreignKey}" uuid${nullable}`;
}

/**
 * Generate a consolidated migration for multiple entities.
 *
 * @param {Object[]} entityConfigs - Array of parsed entity configs (from parseConfig)
 * @param {string} [migrationName='AddGeneratedEntities'] - Migration class name prefix
 * @returns {{ className: string, fileName: string, content: string, timestamp: number }}
 */
function generateMigration(entityConfigs, migrationName) {
  migrationName = migrationName || 'AddGeneratedEntities';
  const timestamp = Date.now();
  const className = `${migrationName}${timestamp}`;
  const fileName = `${timestamp}-${migrationName}.ts`;

  const planTableMap = new Map();
  for (const cfg of entityConfigs) {
    planTableMap.set(cfg.entityName, cfg.tableName);
  }

  const upQueries = [];
  const downFkQueries = [];
  const downTableQueries = [];

  for (const entity of entityConfigs) {
    const { tableName, fields, relations, uniqueConstraint, isJunction } = entity;

    const columns = [...AUDIT_COLUMNS_SQL];

    for (const field of fields || []) {
      columns.push(fieldToSql(field));
    }

    const ownedRelations = (relations || []).filter(
      r => r.owner && (r.type === 'manyToOne' || r.type === 'oneToOne'),
    );

    for (const rel of ownedRelations) {
      columns.push(fkColumnToSql(rel));
    }

    const uniqueFields = (fields || []).filter(f => f.unique);
    for (const uf of uniqueFields) {
      columns.push(`CONSTRAINT "UQ_${tableName}_${uf.name}" UNIQUE ("${uf.name}")`);
    }

    if (isJunction && ownedRelations.length >= 2) {
      const fks = ownedRelations.slice(0, 2).map(r => `"${r.foreignKey}"`);
      columns.push(`CONSTRAINT "UQ_${tableName}_composite" UNIQUE (${fks.join(', ')})`);
    }

    if (uniqueConstraint) {
      const cols = uniqueConstraint.map(f => `"${f}"`).join(', ');
      columns.push(`CONSTRAINT "UQ_${tableName}" UNIQUE (${cols})`);
    }

    columns.push(`CONSTRAINT "PK_${tableName}" PRIMARY KEY ("id")`);

    const indent = '        ';
    const createSql = [
      `CREATE TABLE "${tableName}" (`,
      columns.map(c => `${indent}${c}`).join(',\n'),
      `      )`,
    ].join('\n');

    upQueries.push(`    await queryRunner.query(\`\n      ${createSql}\n    \`);`);

    for (const rel of ownedRelations) {
      const targetTable = resolveTableName(rel.targetEntity, planTableMap);
      const constraintName = `FK_${tableName}_${rel.foreignKey}`;
      const onDeleteClause = rel.onDelete ? ` ON DELETE ${rel.onDelete}` : '';

      upQueries.push(
        `    await queryRunner.query(\`\n      ALTER TABLE "${tableName}"\n      ADD CONSTRAINT "${constraintName}"\n      FOREIGN KEY ("${rel.foreignKey}") REFERENCES "${targetTable}"("id")${onDeleteClause} ON UPDATE NO ACTION\n    \`);`,
      );

      downFkQueries.unshift(
        `    await queryRunner.query(\`ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"\`);`,
      );
    }

    downTableQueries.unshift(
      `    await queryRunner.query(\`DROP TABLE "${tableName}"\`);`,
    );
  }

  const downQueries = [...downFkQueries, ...downTableQueries];

  const content = `import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Auto-generated migration (static fallback — no DB connection).
 * Audit columns match CommonPostgresEntity from @concepta/nestjs-typeorm-ext.
 *
 * For production, prefer running: yarn migration:generate
 * with a connected database for a TypeORM-verified diff.
 */
export class ${className} implements MigrationInterface {
  name = '${className}';

  public async up(queryRunner: QueryRunner): Promise<void> {
${upQueries.join('\n\n')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
${downQueries.join('\n\n')}
  }
}
`;

  return { className, fileName, content, timestamp };
}

module.exports = { generateMigration };
