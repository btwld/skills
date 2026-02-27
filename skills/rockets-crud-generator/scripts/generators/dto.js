/**
 * Main DTO Generator
 * @module generators/dto
 */

const { getValidators, getValidatorImports, mapTypeToTs } = require('../lib/type-mappings');
const { toPascalCase, toCamelCase } = require('../lib/name-utils');

/**
 * Escape single quotes inside a string to prevent breaking TS string literals
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
function escapeSingleQuotes(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "\\'");
}

/**
 * Generate main DTO file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated DTO file content
 */
function generateDto(config) {
  const { entityName, fields, relations } = config;

  // Filter out sdkManaged relations for nested DTO fields (FK columns stay for ALL)
  const ownedRelations = relations.filter(r => !r.sdkManaged);

  // Collect validator imports from custom fields only
  const validatorNames = new Set();
  for (const field of fields) {
    const validators = getValidators(field);
    for (const v of validators) {
      const name = v.match(/^(\w+)/)[1];
      validatorNames.add(name);
    }
  }
  // Add IsOptional if any relation or optional FK exists
  const hasOptionalFields = fields.some(f => !f.required) || relations.length > 0;
  if (hasOptionalFields) {
    validatorNames.add('IsOptional');
  }
  // Add IsUUID if any FK fields exist
  const hasFKFields = relations.some(r => r.owner && r.type === 'manyToOne');
  if (hasFKFields) {
    validatorNames.add('IsUUID');
  }

  // Check if we need Type decorator for owned (non-sdkManaged) relations
  const hasOwnedRelations = ownedRelations.length > 0;

  // Build imports
  const imports = [];

  // class-transformer imports (Exclude at class level for safe serialization)
  const transformerImports = ['Expose', 'Exclude'];
  if (hasOwnedRelations) {
    transformerImports.push('Type');
  }
  imports.push(`import { ${transformerImports.join(', ')} } from 'class-transformer';`);

  // class-validator imports (add ValidateNested when there are owned relations)
  if (hasOwnedRelations) {
    validatorNames.add('ValidateNested');
  }
  if (validatorNames.size > 0) {
    imports.push(`import {\n  ${Array.from(validatorNames).sort().join(',\n  ')},\n} from 'class-validator';`);
  }

  // swagger imports
  imports.push(`import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';`);

  // CommonEntityDto import (provides id, dateCreated, dateUpdated, dateDeleted, version)
  imports.push(`import { CommonEntityDto } from '@concepta/nestjs-common';`);

  // interface import
  imports.push(`import { ${entityName}Interface } from '../interfaces/${config.kebabName}.interface';`);

  // relation DTO imports (only for non-sdkManaged relations)
  for (const rel of ownedRelations) {
    imports.push(`import { ${rel.targetEntity}Dto } from '../../${rel.targetKebab}/dtos/${rel.targetKebab}.dto';`);
    imports.push(`import { ${rel.targetEntity}Interface } from '../../${rel.targetKebab}/interfaces/${rel.targetKebab}.interface';`);
  }

  // Build field definitions (custom fields only — base fields come from CommonEntityDto)
  const fieldDefs = [];

  // Custom fields
  for (const field of fields) {
    fieldDefs.push(generateFieldDefinition(field));
  }

  // Foreign key fields for relations (if owner)
  for (const rel of relations) {
    if (rel.owner && rel.type === 'manyToOne') {
      const fkField = {
        name: rel.foreignKey,
        type: 'uuid',
        required: !rel.nullable,
        apiDescription: `${rel.targetEntity} ID`,
        apiExample: '550e8400-e29b-41d4-a716-446655440000',
      };
      fieldDefs.push(generateFieldDefinition(fkField));
    }
  }

  // Nested relation fields (only for non-sdkManaged relations)
  for (const rel of ownedRelations) {
    fieldDefs.push(generateRelationFieldDefinition(rel));
  }

  return `${imports.join('\n')}

/**
 * ${entityName} DTO for API responses and requests.
 * Extends CommonEntityDto which provides: id, dateCreated, dateUpdated, dateDeleted, version.
 */
@Exclude()
export class ${entityName}Dto extends CommonEntityDto implements ${entityName}Interface {
${fieldDefs.join('\n\n')}
}
`;
}

/**
 * Generate a field definition with decorators
 * @param {Object} field - Field configuration
 * @returns {string} Field definition code
 */
function generateFieldDefinition(field) {
  const { name, type, required, apiDescription, apiExample, maxLength, minLength, enumValues, enumName } = field;

  const lines = [];

  // @Expose()
  lines.push('  @Expose()');

  // @ApiProperty or @ApiPropertyOptional
  const apiOptions = [];
  if (apiDescription) apiOptions.push(`description: '${escapeSingleQuotes(apiDescription)}'`);
  if (apiExample !== undefined) {
    const exampleVal = typeof apiExample === 'string' ? `'${escapeSingleQuotes(apiExample)}'` : apiExample;
    apiOptions.push(`example: ${exampleVal}`);
  }
  if (maxLength) apiOptions.push(`maxLength: ${maxLength}`);
  if (minLength) apiOptions.push(`minLength: ${minLength}`);
  if (enumValues && enumValues.length > 0) {
    // Use inline array for Swagger enum documentation (no TS enum is generated)
    apiOptions.push(`enum: [${enumValues.map(v => `'${v}'`).join(', ')}]`);
  }

  const apiDecorator = required ? 'ApiProperty' : 'ApiPropertyOptional';
  const apiOptionsStr = apiOptions.length > 0 ? `{ ${apiOptions.join(', ')} }` : '';
  lines.push(`  @${apiDecorator}(${apiOptionsStr ? apiOptionsStr : ''})`);

  // Validators
  const validators = getValidators(field);
  for (const v of validators) {
    lines.push(`  @${v}`);
  }

  // Property declaration
  const tsType = mapTypeToTs(field);
  const optional = required ? '!' : '?';
  lines.push(`  ${name}${optional}: ${tsType};`);

  return lines.join('\n');
}

/**
 * Generate a relation field definition
 * @param {Object} relation - Relation configuration
 * @returns {string} Relation field definition code
 */
function generateRelationFieldDefinition(relation) {
  const { name, targetEntity, cardinality } = relation;
  const isArray = cardinality === 'many';

  const lines = [];
  lines.push('  @Expose()');
  lines.push(`  @ApiPropertyOptional({
    type: () => ${targetEntity}Dto,
    description: '${targetEntity}',
  })`);
  lines.push(`  @Type(() => ${targetEntity}Dto)`);
  lines.push(isArray ? '  @ValidateNested({ each: true })' : '  @ValidateNested()');
  lines.push('  @IsOptional()');

  const tsType = isArray ? `${targetEntity}Interface[]` : `${targetEntity}Interface`;
  lines.push(`  ${name}?: ${tsType};`);

  return lines.join('\n');
}

module.exports = { generateDto };
