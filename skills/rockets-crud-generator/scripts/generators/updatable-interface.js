/**
 * Updatable Interface Generator
 * @module generators/updatable-interface
 */

const { getUpdatableFields } = require('../lib/config-parser');

/**
 * Generate updatable interface file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated updatable interface file content
 */
function generateUpdatableInterface(config) {
  const { entityName, kebabName, relations } = config;

  // Get updatable fields (all are optional in updates except id)
  const updatableFields = getUpdatableFields(config);

  // Build optional field picks
  const optionalPicks = updatableFields.map(f => `'${f.name}'`);

  // Add foreign key fields for owner relations (can be updated)
  for (const rel of relations) {
    if (rel.owner && rel.type === 'manyToOne') {
      optionalPicks.push(`'${rel.foreignKey}'`);
    }
  }

  // Build the interface extends clause
  let partialPart = '';
  if (optionalPicks.length > 0) {
    partialPart = `,
    Partial<
      Pick<
        ${entityName}Interface,
        ${optionalPicks.join('\n        | ')}
      >
    >`;
  }

  return `import { ${entityName}Interface } from './${kebabName}.interface';

/**
 * Interface for updating an existing ${entityName.toLowerCase()}.
 * Requires id, all other fields are optional.
 */
export interface ${entityName}UpdatableInterface
  extends Pick<${entityName}Interface, 'id'>${partialPart} {}
`;
}

module.exports = { generateUpdatableInterface };
