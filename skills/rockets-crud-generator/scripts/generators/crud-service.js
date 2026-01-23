/**
 * CrudService Generator
 * @module generators/crud-service
 */

const { toPascalCase } = require('../lib/name-utils');

/**
 * Generate CrudService file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated CrudService file content
 */
function generateCrudService(config) {
  const {
    entityName,
    kebabName,
    upperSnakeName,
    relations,
    hasRelations,
  } = config;

  const adapterClass = `${entityName}TypeOrmCrudAdapter`;

  if (!hasRelations) {
    // Simple service without relations
    return `import { Inject, Injectable } from '@nestjs/common';
import { CrudService } from '@concepta/nestjs-crud';
import { ${entityName}Entity } from '../../entities/${kebabName}.entity';
import { ${adapterClass} } from './${kebabName}-typeorm-crud.adapter';

@Injectable()
export class ${entityName}CrudService extends CrudService<${entityName}Entity> {
  constructor(
    @Inject(${adapterClass})
    protected readonly crudAdapter: ${adapterClass},
  ) {
    super(crudAdapter);
  }
}
`;
  }

  // Service with relations
  const entityTypes = relations.map(r => `${r.targetEntity}Entity`);
  const entityImports = relations.map(r =>
    `import { ${r.targetEntity}Entity } from '../../entities/${r.targetKebab}.entity';`
  );

  return `import { Inject, Injectable } from '@nestjs/common';
import { CrudService, CrudRelationRegistry } from '@concepta/nestjs-crud';
import { ${entityName}Entity } from '../../entities/${kebabName}.entity';
${entityImports.join('\n')}
import { ${adapterClass} } from './${kebabName}-typeorm-crud.adapter';

@Injectable()
export class ${entityName}CrudService extends CrudService<
  ${entityName}Entity,
  [${entityTypes.join(', ')}]
> {
  constructor(
    @Inject(${adapterClass})
    protected readonly crudAdapter: ${adapterClass},
    @Inject('${upperSnakeName}_RELATION_REGISTRY')
    protected readonly relationRegistry: CrudRelationRegistry<
      ${entityName}Entity,
      [${entityTypes.join(', ')}]
    >,
  ) {
    super(crudAdapter, relationRegistry);
  }
}
`;
}

module.exports = { generateCrudService };
