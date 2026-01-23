/**
 * Update DTO Generator
 * @module generators/update-dto
 */

const { getUpdatableFields } = require('../lib/config-parser');

/**
 * Generate Update DTO file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated Update DTO file content
 */
function generateUpdateDto(config) {
  const { entityName, kebabName, relations } = config;

  // Get updatable fields
  const updatableFields = getUpdatableFields(config);

  // Build field names for PartialType PickType
  const fieldNames = updatableFields.map(f => `'${f.name}'`);

  // Add foreign key fields for owner relations (can be updated)
  for (const rel of relations) {
    if (rel.owner && rel.type === 'manyToOne') {
      fieldNames.push(`'${rel.foreignKey}'`);
    }
  }

  return `import { PickType, PartialType, IntersectionType } from '@nestjs/swagger';
import { ${entityName}Dto } from './${kebabName}.dto';
import { ${entityName}UpdatableInterface } from '../interfaces/${kebabName}-updatable.interface';

/**
 * DTO for updating an existing ${entityName.toLowerCase()}.
 */
export class ${entityName}UpdateDto
  extends IntersectionType(
    PickType(${entityName}Dto, ['id'] as const),
    PartialType(
      PickType(${entityName}Dto, [
        ${fieldNames.join(',\n        ')},
      ] as const),
    ),
  )
  implements ${entityName}UpdatableInterface {}
`;
}

module.exports = { generateUpdateDto };
