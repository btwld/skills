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

  return `import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ${entityName}Dto } from './${kebabName}.dto';

/**
 * DTO for paginated ${entityName.toLowerCase()} responses.
 */
@Exclude()
export class ${entityName}PaginatedDto {
  @Expose()
  @ApiProperty({ type: [${entityName}Dto] })
  @Type(() => ${entityName}Dto)
  data!: ${entityName}Dto[];

  @Expose()
  @ApiProperty({ description: 'Total count of records' })
  count!: number;

  @Expose()
  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @Expose()
  @ApiProperty({ description: 'Number of records per page' })
  pageCount!: number;
}
`;
}

module.exports = { generatePaginatedDto };
