/**
 * Creatable Interface Generator
 * @module generators/creatable-interface
 */

const { getRequiredFields, getOptionalCreatableFields } = require('../lib/config-parser');

/**
 * Generate creatable interface file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated creatable interface file content
 */
function generateCreatableInterface(config) {
  const { entityName, kebabName, relations } = config;

  // Get required and optional creatable fields
  const requiredFields = getRequiredFields(config);
  const optionalFields = getOptionalCreatableFields(config);

  // Build required field picks
  const requiredPicks = requiredFields.map(f => `'${f.name}'`);

  // Build optional field picks
  const optionalPicks = optionalFields.map(f => `'${f.name}'`);

  // Add foreign key fields for owner relations
  for (const rel of relations) {
    if (rel.owner && rel.type === 'manyToOne') {
      if (rel.nullable) {
        optionalPicks.push(`'${rel.foreignKey}'`);
      } else {
        requiredPicks.push(`'${rel.foreignKey}'`);
      }
    }
  }

  // Build the interface extends clause
  let extendsClause = '';

  if (requiredPicks.length > 0 && optionalPicks.length > 0) {
    extendsClause = `
  extends Pick<${entityName}Interface, ${requiredPicks.join(' | ')}>,
    Partial<
      Pick<
        ${entityName}Interface,
        ${optionalPicks.join('\n        | ')}
      >
    >`;
  } else if (requiredPicks.length > 0) {
    extendsClause = `
  extends Pick<${entityName}Interface, ${requiredPicks.join(' | ')}>`;
  } else if (optionalPicks.length > 0) {
    extendsClause = `
  extends Partial<
    Pick<
      ${entityName}Interface,
      ${optionalPicks.join('\n      | ')}
    >
  >`;
  }

  return `import { ${entityName}Interface } from './${kebabName}.interface';

/**
 * Interface for creating a new ${entityName.toLowerCase()}.
 * Requires: ${requiredPicks.length > 0 ? requiredPicks.join(', ') : 'none'}
 * Optional: ${optionalPicks.length > 0 ? optionalPicks.join(', ') : 'none'}
 */
export interface ${entityName}CreatableInterface${extendsClause} {}
`;
}

module.exports = { generateCreatableInterface };
