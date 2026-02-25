/**
 * Main Interface Generator
 * @module generators/interface
 */

const { mapTypeToTs } = require('../lib/type-mappings');

/**
 * Generate main interface file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated interface file content
 */
function generateInterface(config) {
  const { entityName, fields, relations } = config;

  // Build imports — use Concepta's base interfaces instead of local BaseEntityInterface
  const imports = [`import { ReferenceIdInterface, AuditInterface } from '@concepta/nestjs-common';`];

  // Add relation interface imports
  for (const rel of relations) {
    imports.push(`import { ${rel.targetEntity}Interface } from '../../${rel.targetKebab}/interfaces/${rel.targetKebab}.interface';`);
  }

  // Build field definitions
  const fieldDefs = [];

  for (const field of fields) {
    const tsType = mapTypeToTs(field);
    const optional = field.required ? '' : '?';
    fieldDefs.push(`  ${field.name}${optional}: ${tsType};`);
  }

  // Add foreign key fields for owner relations
  for (const rel of relations) {
    if (rel.owner && rel.type === 'manyToOne') {
      const optional = rel.nullable ? '?' : '';
      fieldDefs.push(`  ${rel.foreignKey}${optional}: string;`);
    }
  }

  // Add relation fields
  if (relations.length > 0) {
    fieldDefs.push('');
    fieldDefs.push('  // Relationships');
    for (const rel of relations) {
      const isArray = rel.cardinality === 'many';
      const tsType = isArray ? `${rel.targetEntity}Interface[]` : `${rel.targetEntity}Interface`;
      fieldDefs.push(`  ${rel.name}?: ${tsType};`);
    }
  }

  return `${imports.join('\n')}

/**
 * ${entityName} interface defining the core properties.
 * Extends ReferenceIdInterface (id) and AuditInterface (dateCreated, dateUpdated, dateDeleted, version).
 */
export interface ${entityName}Interface extends ReferenceIdInterface, AuditInterface {
${fieldDefs.join('\n')}
}
`;
}

module.exports = { generateInterface };
