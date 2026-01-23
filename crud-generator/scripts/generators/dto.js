/**
 * Main DTO Generator
 * @module generators/dto
 */

const { getValidators, getValidatorImports, mapTypeToTs } = require('../lib/type-mappings');
const { toPascalCase, toCamelCase } = require('../lib/name-utils');

/**
 * Generate main DTO file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated DTO file content
 */
function generateDto(config) {
  const { entityName, fields, relations } = config;

  // Collect validator imports
  const validatorNames = new Set(['IsUUID', 'IsDate', 'IsNumber', 'IsOptional']);
  for (const field of fields) {
    const validators = getValidators(field);
    for (const v of validators) {
      const name = v.match(/^(\w+)/)[1];
      validatorNames.add(name);
    }
  }

  // Check if we need Type decorator for relations
  const hasRelations = relations.length > 0;

  // Build imports
  const imports = [];

  // class-transformer imports
  const transformerImports = ['Exclude', 'Expose'];
  if (hasRelations) {
    transformerImports.push('Type');
  }
  imports.push(`import { ${transformerImports.join(', ')} } from 'class-transformer';`);

  // class-validator imports
  imports.push(`import {\n  ${Array.from(validatorNames).sort().join(',\n  ')},\n} from 'class-validator';`);

  // swagger imports
  imports.push(`import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';`);

  // interface import
  imports.push(`import { ${entityName}Interface } from '../interfaces/${config.kebabName}.interface';`);

  // relation DTO imports
  for (const rel of relations) {
    imports.push(`import { ${rel.targetEntity}Dto } from '../../${rel.targetKebab}/dtos/${rel.targetKebab}.dto';`);
    imports.push(`import { ${rel.targetEntity}Interface } from '../../${rel.targetKebab}/interfaces/${rel.targetKebab}.interface';`);
  }

  // Build field definitions
  const fieldDefs = [];

  // ID field (always first)
  fieldDefs.push(`  @Expose()
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  id!: string;`);

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

  // Relation fields
  for (const rel of relations) {
    fieldDefs.push(generateRelationFieldDefinition(rel));
  }

  // Base entity fields
  fieldDefs.push(`  @Expose()
  @ApiProperty({ description: 'Date created' })
  @IsDate()
  dateCreated!: Date;`);

  fieldDefs.push(`  @Expose()
  @ApiProperty({ description: 'Date updated' })
  @IsDate()
  dateUpdated!: Date;`);

  fieldDefs.push(`  @Expose()
  @ApiPropertyOptional({ description: 'Date deleted' })
  @IsOptional()
  @IsDate()
  dateDeleted?: Date | null;`);

  fieldDefs.push(`  @Expose()
  @ApiProperty({ description: 'Version number' })
  @IsNumber()
  version!: number;`);

  return `${imports.join('\n')}

/**
 * ${entityName} DTO for API responses and requests.
 */
@Exclude()
export class ${entityName}Dto implements ${entityName}Interface {
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
  if (apiDescription) apiOptions.push(`description: '${apiDescription}'`);
  if (apiExample !== undefined) {
    const exampleVal = typeof apiExample === 'string' ? `'${apiExample}'` : apiExample;
    apiOptions.push(`example: ${exampleVal}`);
  }
  if (maxLength) apiOptions.push(`maxLength: ${maxLength}`);
  if (minLength) apiOptions.push(`minLength: ${minLength}`);
  if (enumValues && enumValues.length > 0) {
    // If there's an enum name, reference it; otherwise use inline array
    if (enumName) {
      apiOptions.push(`enum: ${enumName}`);
    }
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
  lines.push('  @IsOptional()');

  const tsType = isArray ? `${targetEntity}Interface[]` : `${targetEntity}Interface`;
  lines.push(`  ${name}?: ${tsType};`);

  return lines.join('\n');
}

module.exports = { generateDto };
