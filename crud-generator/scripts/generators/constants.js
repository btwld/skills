/**
 * Constants File Generator
 * @module generators/constants
 */

/**
 * Generate constants file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated constants file content
 */
function generateConstants(config) {
  const { entityName, upperSnakeName, kebabName } = config;

  return `export const ${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY = '${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY';

export const ${entityName}Resource = {
  One: '${kebabName}',
  Many: '${kebabName}',
} as const;
`;
}

module.exports = { generateConstants };
