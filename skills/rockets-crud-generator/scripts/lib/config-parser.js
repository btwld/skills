/**
 * Configuration parsing and validation utilities.
 * @module config-parser
 */

const { toKebabCase, toPascalCase, toCamelCase, toUpperSnakeCase, pluralize } = require('./name-utils');

/**
 * Parse and normalize configuration from JSON input
 * @param {string|Object} input - JSON string or object
 * @returns {Object} Normalized configuration
 */
function parseConfig(input) {
  const config = typeof input === 'string' ? JSON.parse(input) : input;

  // Derive naming variations
  const entityName = toPascalCase(config.entityName);
  const kebabName = toKebabCase(entityName);
  const camelName = toCamelCase(entityName);
  const upperSnakeName = toUpperSnakeCase(entityName);

  // Derive plural forms
  const pluralName = config.pluralName || pluralize(kebabName);
  const pluralCamel = toCamelCase(pluralName);
  const pluralPascal = toPascalCase(pluralName);

  // Normalize fields
  const fields = (config.fields || []).map(normalizeField);

  // Normalize relations
  const relations = (config.relations || []).map(normalizeRelation);

  // Default operations
  const operations = config.operations || [
    'readMany',
    'readOne',
    'createOne',
    'updateOne',
    'deleteOne',
    'recoverOne',
  ];

  return {
    // Original config
    ...config,

    // Naming variations
    entityName,
    kebabName,
    camelName,
    upperSnakeName,
    pluralName,
    pluralCamel,
    pluralPascal,

    // Table name defaults to kebab-case singular
    tableName: config.tableName || kebabName.replace(/-/g, '_'),

    // Normalized collections
    fields,
    relations,
    operations,

    // Flags
    hasRelations: relations.length > 0,
    generateModelService: config.generateModelService ?? false,
    isJunction: config.isJunction ?? false,
    uniqueConstraint: config.uniqueConstraint || null,

    // Shared package import path (e.g., '@my-org/shared' or relative path)
    sharedPackage: config.sharedPackage || null,
  };
}

/**
 * Normalize a field configuration with defaults
 * @param {Object} field - Raw field configuration
 * @returns {Object} Normalized field
 */
function normalizeField(field) {
  return {
    name: field.name,
    type: field.type || 'string',
    required: field.required ?? true,
    unique: field.unique ?? false,
    nullable: !field.required,
    maxLength: field.maxLength,
    minLength: field.minLength,
    min: field.min,
    max: field.max,
    precision: field.precision,
    scale: field.scale,
    default: field.default,
    enumValues: field.enumValues,
    enumName: field.enumName,
    isUrl: field.isUrl ?? false,
    isEmail: field.isEmail ?? false,
    pattern: field.pattern,
    apiDescription: field.apiDescription || `${toPascalCase(field.name)} field`,
    apiExample: field.apiExample,
    // Determine if field is creatable (default true unless explicitly false)
    creatable: field.creatable ?? true,
    // Determine if field is updatable (default true unless explicitly false)
    updatable: field.updatable ?? true,
    // Expose in DTO (default true)
    expose: field.expose ?? true,
  };
}

/**
 * Normalize a relation configuration with defaults
 * @param {Object} relation - Raw relation configuration
 * @returns {Object} Normalized relation
 */
function normalizeRelation(relation) {
  const targetEntity = toPascalCase(relation.targetEntity);
  const targetKebab = toKebabCase(targetEntity);
  const targetCamel = toCamelCase(targetEntity);

  return {
    name: relation.name || targetCamel,
    type: relation.type || 'manyToOne',
    targetEntity,
    targetKebab,
    targetCamel,
    foreignKey: relation.foreignKey || `${targetCamel}Id`,
    inverseSide: relation.inverseSide,
    joinType: relation.joinType || 'LEFT',
    owner: relation.owner ?? true,
    onDelete: relation.onDelete,
    nullable: relation.nullable ?? true,
    eager: relation.eager ?? false,
    // For oneToMany relations
    mappedBy: relation.mappedBy,
    // Cardinality for CrudRelations
    cardinality: relation.type === 'oneToMany' || relation.type === 'manyToMany' ? 'many' : 'one',
  };
}

/**
 * Validate configuration
 * @param {Object} config - Parsed configuration
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateConfig(config) {
  const errors = [];

  if (!config.entityName) {
    errors.push('entityName is required');
  }

  if (config.fields) {
    for (const field of config.fields) {
      if (!field.name) {
        errors.push('Each field must have a name');
      }
      if (field.type === 'enum' && (!field.enumValues || field.enumValues.length === 0)) {
        errors.push(`Enum field "${field.name}" must have enumValues`);
      }
    }
  }

  if (config.relations) {
    for (const relation of config.relations) {
      if (!relation.targetEntity) {
        errors.push(`Relation "${relation.name}" must have a targetEntity`);
      }
    }
  }

  if (config.isJunction && config.relations.length < 2) {
    errors.push('Junction tables must have at least 2 relations');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get fields that are creatable
 * @param {Object} config - Parsed configuration
 * @returns {Object[]} Creatable fields
 */
function getCreatableFields(config) {
  return config.fields.filter(f => f.creatable);
}

/**
 * Get fields that are updatable
 * @param {Object} config - Parsed configuration
 * @returns {Object[]} Updatable fields
 */
function getUpdatableFields(config) {
  return config.fields.filter(f => f.updatable);
}

/**
 * Get required fields (for Create DTO required extends)
 * @param {Object} config - Parsed configuration
 * @returns {Object[]} Required fields
 */
function getRequiredFields(config) {
  return config.fields.filter(f => f.required && f.creatable);
}

/**
 * Get optional fields (for Create DTO partial extends)
 * @param {Object} config - Parsed configuration
 * @returns {Object[]} Optional creatable fields
 */
function getOptionalCreatableFields(config) {
  return config.fields.filter(f => !f.required && f.creatable);
}

module.exports = {
  parseConfig,
  normalizeField,
  normalizeRelation,
  validateConfig,
  getCreatableFields,
  getUpdatableFields,
  getRequiredFields,
  getOptionalCreatableFields,
};
