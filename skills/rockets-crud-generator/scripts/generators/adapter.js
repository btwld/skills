/**
 * TypeORM Crud Adapter Generator
 * @module generators/adapter
 */

/**
 * Generate TypeOrmCrudAdapter file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated adapter file content
 */
function generateAdapter(config) {
  const { entityName, kebabName, camelName } = config;

  return `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmCrudAdapter } from '@concepta/nestjs-crud';
import { ${entityName}Entity } from './entities/${kebabName}.entity';

@Injectable()
export class ${entityName}TypeOrmCrudAdapter extends TypeOrmCrudAdapter<${entityName}Entity> {
  constructor(
    @InjectRepository(${entityName}Entity)
    ${camelName}Repository: Repository<${entityName}Entity>,
  ) {
    super(${camelName}Repository);
  }
}
`;
}

module.exports = { generateAdapter };
