/**
 * Paginated DTO Generator
 * @module generators/paginated-dto
 */

/**
 * Generate Paginated DTO file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated Paginated DTO file content
 */
function generatePaginatedDto(config) {
  const { entityName, kebabName } = config;

  return `import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CrudResponsePaginatedDto } from '@concepta/nestjs-crud';
import { ${entityName}Dto } from './${kebabName}.dto';

/**
 * DTO for paginated ${entityName.toLowerCase()} responses.
 * Extends CrudResponsePaginatedDto which provides: count, limit, total, page, pageCount.
 */
export class ${entityName}PaginatedDto extends CrudResponsePaginatedDto<${entityName}Dto> {
  @ApiProperty({ type: ${entityName}Dto, isArray: true })
  @Type(() => ${entityName}Dto)
  declare data: ${entityName}Dto[]; // 'declare' avoids TS2612 — base class defines 'data'
}
`;
}

module.exports = { generatePaginatedDto };
