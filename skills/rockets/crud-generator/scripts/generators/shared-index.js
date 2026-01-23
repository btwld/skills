/**
 * Shared Index (Barrel Exports) Generator
 * @module generators/shared-index
 */

/**
 * Generate shared index file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated index file content
 */
function generateSharedIndex(config) {
  const { kebabName } = config;

  return `// Interfaces
export * from './interfaces/${kebabName}.interface';
export * from './interfaces/${kebabName}-creatable.interface';
export * from './interfaces/${kebabName}-updatable.interface';

// DTOs
export * from './dtos/${kebabName}.dto';
export * from './dtos/${kebabName}-create.dto';
export * from './dtos/${kebabName}-update.dto';
export * from './dtos/${kebabName}-paginated.dto';
`;
}

module.exports = { generateSharedIndex };
