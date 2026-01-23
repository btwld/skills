/**
 * Type mappings for converting field types to TypeORM, TypeScript, and validators.
 * @module type-mappings
 */

/**
 * Map field type to TypeORM column type and options
 * @param {Object} field - Field configuration
 * @returns {Object} TypeORM column configuration
 */
function mapTypeToColumn(field) {
  const { type, maxLength, enumValues, precision, scale } = field;

  const mappings = {
    string: { type: 'varchar', length: maxLength || 255 },
    text: { type: 'text' },
    number: { type: 'int' },
    float: { type: 'decimal', precision: precision || 10, scale: scale || 2 },
    boolean: { type: 'boolean' },
    date: { type: 'timestamp' },
    uuid: { type: 'uuid' },
    json: { type: 'jsonb' },
    enum: { type: 'varchar', length: maxLength || 50 },
  };

  return mappings[type] || { type: 'varchar', length: 255 };
}

/**
 * Map field type to TypeScript type
 * @param {Object} field - Field configuration
 * @returns {string} TypeScript type
 */
function mapTypeToTs(field) {
  const { type, enumValues, enumName } = field;

  if (type === 'enum' && enumName) {
    return enumName;
  }

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
 * Get class-validator decorators for a field
 * @param {Object} field - Field configuration
 * @returns {string[]} Array of decorator strings (without @)
 */
function getValidators(field) {
  const validators = [];
  const { type, required, minLength, maxLength, min, max, enumValues, pattern } = field;

  // Required/Optional
  if (!required) {
    validators.push('IsOptional()');
  }

  // Type-specific validators
  switch (type) {
    case 'string':
    case 'text':
      validators.push('IsString()');
      if (required) validators.push('IsNotEmpty()');
      if (minLength) validators.push(`MinLength(${minLength})`);
      if (maxLength) validators.push(`MaxLength(${maxLength})`);
      if (pattern) validators.push(`Matches(/${pattern}/)`);
      break;

    case 'number':
      validators.push('IsNumber()');
      if (min !== undefined) validators.push(`Min(${min})`);
      if (max !== undefined) validators.push(`Max(${max})`);
      break;

    case 'float':
      validators.push('IsNumber()');
      if (min !== undefined) validators.push(`Min(${min})`);
      if (max !== undefined) validators.push(`Max(${max})`);
      break;

    case 'boolean':
      validators.push('IsBoolean()');
      break;

    case 'date':
      validators.push('IsDate()');
      break;

    case 'uuid':
      validators.push('IsUUID()');
      break;

    case 'json':
      validators.push('IsObject()');
      break;

    case 'enum':
      validators.push('IsString()');
      if (enumValues && enumValues.length > 0) {
        validators.push(`IsIn([${enumValues.map(v => `'${v}'`).join(', ')}])`);
      }
      break;

    default:
      validators.push('IsString()');
  }

  // URL validation
  if (field.isUrl) {
    validators.push('IsUrl()');
  }

  // Email validation
  if (field.isEmail) {
    validators.push('IsEmail()');
  }

  return validators;
}

/**
 * Get required imports for validators
 * @param {Object[]} fields - Array of field configurations
 * @returns {string[]} Array of validator names to import
 */
function getValidatorImports(fields) {
  const imports = new Set();

  for (const field of fields) {
    const validators = getValidators(field);
    for (const v of validators) {
      // Extract decorator name without parentheses and arguments
      const name = v.match(/^(\w+)/)[1];
      imports.add(name);
    }
  }

  return Array.from(imports).sort();
}

/**
 * Get TypeORM decorators for a relation
 * @param {Object} relation - Relation configuration
 * @returns {Object} TypeORM relation configuration
 */
function getRelationDecorators(relation) {
  const { type, targetEntity, foreignKey, onDelete } = relation;

  const decorators = {
    manyToOne: 'ManyToOne',
    oneToMany: 'OneToMany',
    oneToOne: 'OneToOne',
    manyToMany: 'ManyToMany',
  };

  return {
    decorator: decorators[type] || 'ManyToOne',
    joinColumn: type === 'manyToOne' || type === 'oneToOne',
    onDelete: onDelete || (type === 'manyToOne' ? undefined : 'CASCADE'),
  };
}

module.exports = {
  mapTypeToColumn,
  mapTypeToTs,
  getValidators,
  getValidatorImports,
  getRelationDecorators,
};
