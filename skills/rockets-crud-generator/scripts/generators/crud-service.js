/**
 * CrudService Generator
 * @module generators/crud-service
 */

const { toPascalCase } = require('../lib/name-utils');
const { isVersionAtLeast } = require('../lib/config-parser');

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
    sdkVersion,
  } = config;

  // CrudRelationRegistry requires alpha.11+
  const hasCrudRelations = isVersionAtLeast(sdkVersion, 'alpha.11');
  const ownedRelations = relations.filter(r => !r.sdkManaged);
  const hasOwnedRelations = hasCrudRelations && ownedRelations.length > 0;

  const adapterClass = `${entityName}TypeOrmCrudAdapter`;

  if (!hasOwnedRelations) {
    // Simple service without relations (or all relations are sdkManaged)
    return `import { Inject, Injectable } from '@nestjs/common';
import { CrudService } from '@concepta/nestjs-crud';
import { ${entityName}Entity } from './entities/${kebabName}.entity';
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

  // Service with owned (non-sdkManaged) relations
  const entityTypes = ownedRelations.map(r => `${r.targetEntity}Entity`);
  const entityImports = ownedRelations.map(r =>
    `import { ${r.targetEntity}Entity } from '../${r.targetKebab}/entities/${r.targetKebab}.entity';`
  );

  return `import { Inject, Injectable } from '@nestjs/common';
import { CrudService, CrudRelationRegistry } from '@concepta/nestjs-crud';
import { ${entityName}Entity } from './entities/${kebabName}.entity';
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
