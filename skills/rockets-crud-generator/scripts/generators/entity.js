/**
 * TypeORM Entity Generator
 * @module generators/entity
 */

const { mapTypeToColumn, getRelationDecorators } = require('../lib/type-mappings');
const { toPascalCase, toCamelCase } = require('../lib/name-utils');
const { SDK_ENTITY_IMPORT_PATHS } = require('../lib/config-parser');

/**
 * Generate TypeORM entity file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated entity file content
 */
function generateEntity(config) {
  const { entityName, tableName, fields, relations, uniqueConstraint, isJunction } = config;

  // Collect imports
  const typeormImports = new Set(['Entity', 'Column']);
  const entityImports = [];

  // Add relation decorators
  for (const rel of relations) {
    const { decorator, joinColumn } = getRelationDecorators(rel);
    typeormImports.add(decorator);
    if (joinColumn) {
      typeormImports.add('JoinColumn');
    }
    // Add entity import — skip self-referential relations (same entity)
    if (rel.targetEntity !== config.entityName) {
      const sdkPath = SDK_ENTITY_IMPORT_PATHS[rel.targetEntity];
      entityImports.push({
        name: `${rel.targetEntity}Entity`,
        // SDK entities: use SDK_ENTITY_IMPORT_PATHS (already relative from src/modules/<entity>/entities/)
        // Non-SDK entities: cross-module reference ../../<target>/entities/<target>.entity
        path: sdkPath || `../../${rel.targetKebab}/entities/${rel.targetKebab}.entity`,
      });
    }
  }

  // Add Unique if needed
  if (uniqueConstraint || isJunction) {
    typeormImports.add('Unique');
  }

  // Build imports section
  const imports = [
    `import { ${Array.from(typeormImports).sort().join(', ')} } from 'typeorm';`,
    `import { CommonPostgresEntity } from '@concepta/nestjs-typeorm-ext';`,
  ];

  // Add related entity imports (deduplicated)
  const seenEntities = new Set();
  for (const imp of entityImports) {
    if (!seenEntities.has(imp.name)) {
      seenEntities.add(imp.name);
      imports.push(`import { ${imp.name} } from '${imp.path}';`);
    }
  }

  // Build unique decorator
  let uniqueDecorator = '';
  if (uniqueConstraint) {
    uniqueDecorator = `\n@Unique([${uniqueConstraint.map(f => `'${f}'`).join(', ')}])`;
  } else if (isJunction && relations.length >= 2) {
    const fks = relations.slice(0, 2).map(r => `'${r.foreignKey}'`);
    uniqueDecorator = `\n@Unique([${fks.join(', ')}])`;
  }

  // Build columns
  const columns = fields.map(field => generateColumn(field)).join('\n\n');

  // Build FK columns for ManyToOne relations (owner side)
  const fkColumns = relations
    .filter(rel => rel.owner && (rel.type === 'manyToOne' || rel.type === 'oneToOne'))
    .map(rel => generateForeignKeyColumn(rel))
    .join('\n\n');

  // Build relations
  const relationCode = relations.map(rel => generateRelation(rel, config)).join('\n\n');

  // Combine all parts
  const bodyParts = [columns, fkColumns, relationCode].filter(p => p.trim()).join('\n\n');

  return `${imports.join('\n')}

@Entity('${tableName}')${uniqueDecorator}
export class ${entityName}Entity extends CommonPostgresEntity {
${bodyParts}
}
`;
}

/**
 * Generate a single column definition
 * @param {Object} field - Field configuration
 * @returns {string} Column code
 */
function generateColumn(field) {
  const { name, type, required, unique, maxLength, enumValues, precision, scale } = field;
  const columnConfig = mapTypeToColumn(field);

  const options = [];

  // Type
  options.push(`type: '${columnConfig.type}'`);

  // Length for varchar
  if (columnConfig.length && columnConfig.type === 'varchar') {
    options.push(`length: ${columnConfig.length}`);
  }

  // Precision/scale for decimal
  if (columnConfig.precision) {
    options.push(`precision: ${columnConfig.precision}`);
  }
  if (columnConfig.scale) {
    options.push(`scale: ${columnConfig.scale}`);
  }

  // Nullable
  if (!required) {
    options.push('nullable: true');
  }

  // Unique
  if (unique) {
    options.push('unique: true');
  }

  // Default value (strip existing quotes to prevent double-wrap from plan.json)
  if (field.default !== undefined) {
    let rawDefault = field.default;
    if (typeof rawDefault === 'string') {
      rawDefault = rawDefault.replace(/^'(.*)'$/, '$1');
    }
    const defaultVal = typeof rawDefault === 'string' ? `'${rawDefault}'` : rawDefault;
    options.push(`default: ${defaultVal}`);
  }

  const optionsStr = options.join(', ');
  const tsType = getFieldTsType(field);
  const optional = !required ? '?' : '!';

  return `  @Column({ ${optionsStr} })
  ${name}${optional}: ${tsType};`;
}

/**
 * Get TypeScript type for a field
 * @param {Object} field - Field configuration
 * @returns {string} TypeScript type
 */
function getFieldTsType(field) {
  const { type, required } = field;

  const mappings = {
    string: 'string',
    text: 'string',
    number: 'number',
    float: 'number',
    boolean: 'boolean',
    date: 'Date',
    uuid: 'string',
    json: 'Record<string, unknown>',
    enum: 'string',
  };

  return mappings[type] || 'string';
}

/**
 * Generate a foreign key column for a relation
 * @param {Object} relation - Relation configuration
 * @returns {string} FK column code
 */
function generateForeignKeyColumn(relation) {
  const { foreignKey, nullable } = relation;
  const optional = nullable ? '?' : '!';

  return `  @Column({ type: 'uuid'${nullable ? ', nullable: true' : ''} })
  ${foreignKey}${optional}: string;`;
}

/**
 * Generate a relation definition
 * @param {Object} relation - Relation configuration
 * @param {Object} config - Full configuration
 * @returns {string} Relation code
 */
function generateRelation(relation, config) {
  const { name, type, targetEntity, foreignKey, inverseSide, onDelete, nullable } = relation;
  const { decorator, joinColumn } = getRelationDecorators(relation);

  const targetEntityClass = `${targetEntity}Entity`;
  const lines = [];

  // Build the decorator
  if (type === 'manyToOne') {
    const options = [];
    if (nullable) options.push('nullable: true');
    if (onDelete) options.push(`onDelete: '${onDelete}'`);

    const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
    lines.push(`  @ManyToOne(() => ${targetEntityClass}${optionsStr})`);

    if (joinColumn) {
      lines.push(`  @JoinColumn({ name: '${foreignKey}' })`);
    }

    lines.push(`  ${name}?: ${targetEntityClass};`);
  } else if (type === 'oneToMany') {
    const mappedBy = inverseSide || toCamelCase(config.entityName);
    lines.push(`  @OneToMany(() => ${targetEntityClass}, (${toCamelCase(targetEntity)}) => ${toCamelCase(targetEntity)}.${mappedBy})`);
    lines.push(`  ${name}?: ${targetEntityClass}[];`);
  } else if (type === 'oneToOne') {
    const options = [];
    if (nullable) options.push('nullable: true');
    if (onDelete) options.push(`onDelete: '${onDelete}'`);

    const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
    lines.push(`  @OneToOne(() => ${targetEntityClass}${optionsStr})`);

    if (joinColumn) {
      lines.push(`  @JoinColumn({ name: '${foreignKey}' })`);
    }

    lines.push(`  ${name}?: ${targetEntityClass};`);
  }

  return lines.join('\n');
}

module.exports = { generateEntity };
