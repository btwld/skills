/**
 * Create DTO Generator
 * @module generators/create-dto
 */

const { getCreatableFields } = require('../lib/config-parser');

/**
 * Generate Create DTO file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated Create DTO file content
 */
function generateCreateDto(config) {
  const { entityName, kebabName, relations } = config;

  // Get creatable fields
  const creatableFields = getCreatableFields(config);

  // Build field names for PickType
  const fieldNames = creatableFields.map(f => `'${f.name}'`);

  // Add foreign key fields for owner relations
  for (const rel of relations) {
    if (rel.owner && rel.type === 'manyToOne') {
      fieldNames.push(`'${rel.foreignKey}'`);
    }
  }

  return `import { PickType } from '@nestjs/swagger';
import { ${entityName}Dto } from './${kebabName}.dto';
import { ${entityName}CreatableInterface } from '../interfaces/${kebabName}-creatable.interface';

/**
 * DTO for creating a new ${entityName.toLowerCase()}.
 */
export class ${entityName}CreateDto
  extends PickType(${entityName}Dto, [
    ${fieldNames.join(',\n    ')},
  ] as const)
  implements ${entityName}CreatableInterface {}
`;
}

module.exports = { generateCreateDto };
