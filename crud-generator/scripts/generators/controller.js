/**
 * CRUD Controller Generator
 * @module generators/controller
 */

const { toPascalCase, toCamelCase } = require('../lib/name-utils');

/**
 * Generate CRUD controller file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated controller file content
 */
function generateController(config) {
  const {
    entityName,
    kebabName,
    camelName,
    pluralName,
    relations,
    hasRelations,
    operations,
    sharedPackage,
  } = config;

  // Determine which operations to include
  const hasReadMany = operations.includes('readMany');
  const hasReadOne = operations.includes('readOne');
  const hasCreateOne = operations.includes('createOne');
  const hasUpdateOne = operations.includes('updateOne');
  const hasDeleteOne = operations.includes('deleteOne');
  const hasRecoverOne = operations.includes('recoverOne');

  // Collect imports
  const nestImports = ['UseGuards'];
  const accessControlImports = ['AccessControlGuard', 'AccessControlQuery'];
  const crudImports = [
    'CrudController',
    'CrudControllerInterface',
    'CrudRequest',
    'CrudRequestInterface',
  ];
  const sharedDtoImports = [
    `${entityName}Dto`,
    `${entityName}PaginatedDto`,
    `${entityName}CreatableInterface`,
    `${entityName}UpdatableInterface`,
  ];

  // Add operation-specific imports
  if (hasReadMany) {
    crudImports.push('CrudReadMany');
    accessControlImports.push('AccessControlReadMany');
  }
  if (hasReadOne) {
    crudImports.push('CrudReadOne');
    accessControlImports.push('AccessControlReadOne');
  }
  if (hasCreateOne) {
    crudImports.push('CrudCreateOne', 'CrudBody');
    accessControlImports.push('AccessControlCreateOne');
    sharedDtoImports.push(`${entityName}CreateDto`);
  }
  if (hasUpdateOne) {
    crudImports.push('CrudUpdateOne');
    if (!hasCreateOne) crudImports.push('CrudBody');
    accessControlImports.push('AccessControlUpdateOne');
    sharedDtoImports.push(`${entityName}UpdateDto`);
  }
  if (hasDeleteOne) {
    crudImports.push('CrudDeleteOne');
    accessControlImports.push('AccessControlDeleteOne');
  }
  if (hasRecoverOne) {
    crudImports.push('CrudRecoverOne');
    accessControlImports.push('AccessControlRecoverOne');
  }

  // Build imports
  const imports = [];

  imports.push(`import { ${nestImports.join(', ')} } from '@nestjs/common';`);
  imports.push(`import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';`);
  imports.push(`import {\n  ${accessControlImports.join(',\n  ')},\n} from '@concepta/nestjs-access-control';`);
  imports.push(`import {\n  ${crudImports.join(',\n  ')},\n} from '@concepta/nestjs-crud';`);

  // Add CrudRelations import if has relations
  if (hasRelations) {
    imports.push(`import { CrudRelations } from '@concepta/nestjs-crud/dist/crud/decorators/routes/crud-relations.decorator';`);
  }

  // Import from shared package or relative path
  const sharedImportPath = sharedPackage || `../../shared/${kebabName}`;
  imports.push(`import {\n  ${sharedDtoImports.join(',\n  ')},\n} from '${sharedImportPath}';`);
  imports.push(`import { ${entityName}Resource } from './constants/${kebabName}.constants';`);
  imports.push(`import { ${entityName}AccessQueryService } from './${kebabName}-access-query.service';`);
  imports.push(`import { ${entityName}CrudService } from './${kebabName}.crud.service';`);
  imports.push(`import { ${entityName}Entity } from '../../entities/${kebabName}.entity';`);

  // Add relation imports
  if (hasRelations) {
    for (const rel of relations) {
      imports.push(`import { ${rel.targetEntity}Entity } from '../../entities/${rel.targetKebab}.entity';`);
      imports.push(`import { ${rel.targetEntity}CrudService } from '../${rel.targetKebab}/${rel.targetKebab}.crud.service';`);
    }
  }

  // Build CrudRelations decorator
  let crudRelationsDecorator = '';
  if (hasRelations) {
    const entityTypes = relations.map(r => `${r.targetEntity}Entity`);
    const relationConfigs = relations.map(rel => {
      const cardinality = rel.cardinality;
      return `    {
      join: '${rel.joinType}',
      cardinality: '${cardinality}',
      service: ${rel.targetEntity}CrudService,
      property: '${rel.name}',
      owner: ${rel.owner},
      primaryKey: 'id',
      foreignKey: '${rel.foreignKey}',
    }`;
    });

    crudRelationsDecorator = `
@CrudRelations<${entityName}Entity, [${entityTypes.join(', ')}]>({
  rootKey: 'id',
  relations: [
${relationConfigs.join(',\n')},
  ],
})`;
  }

  // Build methods
  const methods = [];

  if (hasReadMany) {
    methods.push(`  @CrudReadMany()
  @AccessControlReadMany(${entityName}Resource.Many)
  async getMany(@CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>) {
    return this.${camelName}CrudService.getMany(crudRequest);
  }`);
  }

  if (hasReadOne) {
    methods.push(`  @CrudReadOne()
  @AccessControlReadOne(${entityName}Resource.One)
  async getOne(@CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>) {
    return this.${camelName}CrudService.getOne(crudRequest);
  }`);
  }

  if (hasCreateOne) {
    methods.push(`  @CrudCreateOne({ dto: ${entityName}CreateDto })
  @AccessControlCreateOne(${entityName}Resource.One)
  async createOne(
    @CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>,
    @CrudBody() dto: ${entityName}CreateDto,
  ) {
    return this.${camelName}CrudService.createOne(crudRequest, dto);
  }`);
  }

  if (hasUpdateOne) {
    methods.push(`  @CrudUpdateOne({ dto: ${entityName}UpdateDto })
  @AccessControlUpdateOne(${entityName}Resource.One)
  async updateOne(
    @CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>,
    @CrudBody() dto: ${entityName}UpdateDto,
  ) {
    return this.${camelName}CrudService.updateOne(crudRequest, dto);
  }`);
  }

  if (hasDeleteOne) {
    methods.push(`  @CrudDeleteOne()
  @AccessControlDeleteOne(${entityName}Resource.One)
  async deleteOne(@CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>) {
    return this.${camelName}CrudService.deleteOne(crudRequest);
  }`);
  }

  if (hasRecoverOne) {
    methods.push(`  @CrudRecoverOne()
  @AccessControlRecoverOne(${entityName}Resource.One)
  async recoverOne(@CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>) {
    return this.${camelName}CrudService.recoverOne(crudRequest);
  }`);
  }

  return `${imports.join('\n')}

@CrudController({
  path: '${pluralName}',
  model: {
    type: ${entityName}Dto,
    paginatedType: ${entityName}PaginatedDto,
  },
})${crudRelationsDecorator}
@UseGuards(AccessControlGuard)
@ApiBearerAuth()
@AccessControlQuery({ service: ${entityName}AccessQueryService })
@ApiTags('${pluralName}')
export class ${entityName}CrudController implements CrudControllerInterface<
  ${entityName}Entity,
  ${entityName}CreatableInterface,
  ${entityName}UpdatableInterface
> {
  constructor(private ${camelName}CrudService: ${entityName}CrudService) {}

${methods.join('\n\n')}
}
`;
}

module.exports = { generateController };
