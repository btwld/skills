/**
 * Name utility functions for converting between naming conventions.
 * @module name-utils
 */

/**
 * Convert PascalCase or camelCase to kebab-case
 * @param {string} str - Input string
 * @returns {string} kebab-case string
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert any case to PascalCase
 * @param {string} str - Input string
 * @returns {string} PascalCase string
 */
function toPascalCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Convert any case to camelCase
 * @param {string} str - Input string
 * @returns {string} camelCase string
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert any case to snake_case
 * @param {string} str - Input string
 * @returns {string} snake_case string
 */
function toSnakeCase(str) {
  return toKebabCase(str).replace(/-/g, '_');
}

/**
 * Convert any case to UPPER_SNAKE_CASE
 * @param {string} str - Input string
 * @returns {string} UPPER_SNAKE_CASE string
 */
function toUpperSnakeCase(str) {
  return toSnakeCase(str).toUpperCase();
}

/**
 * Simple pluralization (handles common cases)
 * @param {string} str - Singular form
 * @returns {string} Plural form
 */
function pluralize(str) {
  if (str.endsWith('y') && !['ay', 'ey', 'oy', 'uy'].some(suffix => str.endsWith(suffix))) {
    return str.slice(0, -1) + 'ies';
  }
  if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
    return str + 'es';
  }
  return str + 's';
}

module.exports = {
  toKebabCase,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  toUpperSnakeCase,
  pluralize,
};
