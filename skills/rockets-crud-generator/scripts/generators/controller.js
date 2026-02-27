/**
 * CRUD Controller Generator
 * @module generators/controller
 */

const { toPascalCase, toCamelCase } = require('../lib/name-utils');
const { isVersionAtLeast } = require('../lib/config-parser');

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
    sdkVersion,
    acl,
    ownerField,
  } = config;

  // SDK version gate: ACL decorators only available in alpha.7+
  const hasAcl = isVersionAtLeast(sdkVersion, 'alpha.7');

  // Detect if any role uses "own" possession — need ownership filtering on readMany
  const hasOwnScope = hasAcl && acl && Object.values(acl).some(r => r.possession === 'own');
  const effectiveOwnerField = ownerField || 'userId';

  // Filter out sdkManaged relations for CrudRelations and module/service imports
  // CrudRelations requires alpha.11+; disable for earlier versions
  const hasCrudRelations = isVersionAtLeast(sdkVersion, 'alpha.11');
  const ownedRelations = relations.filter(r => !r.sdkManaged);
  const hasOwnedRelations = hasCrudRelations && ownedRelations.length > 0;

  // Determine which operations to include
  const hasReadMany = operations.includes('readMany');
  const hasReadOne = operations.includes('readOne');
  const hasCreateOne = operations.includes('createOne');
  const hasUpdateOne = operations.includes('updateOne');
  const hasDeleteOne = operations.includes('deleteOne');
  const hasRecoverOne = operations.includes('recoverOne');

  // Collect imports
  const nestImports = [];
  const accessControlImports = [];
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

  if (hasAcl) {
    nestImports.push('UseGuards');
    accessControlImports.push('AccessControlGuard', 'AccessControlQuery');
  }

  // Req decorator needed when readMany applies ownership filter
  if (hasOwnScope && hasReadMany) {
    nestImports.push('Req');
  }

  // Add operation-specific imports
  if (hasReadMany) {
    crudImports.push('CrudReadMany');
    if (hasAcl) accessControlImports.push('AccessControlReadMany');
  }
  if (hasReadOne) {
    crudImports.push('CrudReadOne');
    if (hasAcl) accessControlImports.push('AccessControlReadOne');
  }
  if (hasCreateOne) {
    crudImports.push('CrudCreateOne', 'CrudBody');
    if (hasAcl) accessControlImports.push('AccessControlCreateOne');
    sharedDtoImports.push(`${entityName}CreateDto`);
  }
  if (hasUpdateOne) {
    crudImports.push('CrudUpdateOne');
    if (!hasCreateOne) crudImports.push('CrudBody');
    if (hasAcl) accessControlImports.push('AccessControlUpdateOne');
    sharedDtoImports.push(`${entityName}UpdateDto`);
  }
  if (hasDeleteOne) {
    crudImports.push('CrudDeleteOne');
    if (hasAcl) accessControlImports.push('AccessControlDeleteOne');
  }
  if (hasRecoverOne) {
    crudImports.push('CrudRecoverOne');
    if (hasAcl) accessControlImports.push('AccessControlRecoverOne');
  }

  // Build imports
  const imports = [];

  if (nestImports.length > 0) {
    imports.push(`import { ${nestImports.join(', ')} } from '@nestjs/common';`);
  }
  imports.push(`import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';`);
  if (accessControlImports.length > 0) {
    imports.push(`import {\n  ${accessControlImports.join(',\n  ')},\n} from '@concepta/nestjs-access-control';`);
  }
  imports.push(`import {\n  ${crudImports.join(',\n  ')},\n} from '@concepta/nestjs-crud';`);

  // Add CrudRelations import if has owned relations
  if (hasOwnedRelations) {
    imports.push(`import { CrudRelations } from '@concepta/nestjs-crud';`);
  }

  // Import from shared package or relative path
  const sharedImportPath = sharedPackage || `../../shared/${kebabName}`;
  imports.push(`import {\n  ${sharedDtoImports.join(',\n  ')},\n} from '${sharedImportPath}';`);
  imports.push(`import { ${entityName}Resource } from './constants/${kebabName}.constants';`);
  if (hasAcl) {
    imports.push(`import { ${entityName}AccessQueryService } from './${kebabName}-access-query.service';`);
  }
  imports.push(`import { ${entityName}CrudService } from './${kebabName}.crud.service';`);
  imports.push(`import { ${entityName}Entity } from './entities/${kebabName}.entity';`);

  // Add relation imports — only for ownedRelations (non-sdkManaged).
  // SDK entity imports are NOT needed in controllers (only in entity.js for TypeORM decorators).
  for (const rel of ownedRelations) {
    imports.push(`import { ${rel.targetEntity}Entity } from '../${rel.targetKebab}/entities/${rel.targetKebab}.entity';`);
    imports.push(`import { ${rel.targetEntity}CrudService } from '../${rel.targetKebab}/${rel.targetKebab}.crud.service';`);
  }

  // Build CrudRelations decorator (only for owned relations)
  let crudRelationsDecorator = '';
  if (hasOwnedRelations) {
    const entityTypes = ownedRelations.map(r => `${r.targetEntity}Entity`);
    const relationConfigs = ownedRelations.map(rel => {
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

  // Build class-level decorators
  let classDecorators = '';
  if (hasAcl) {
    classDecorators = `
@UseGuards(AccessControlGuard)
@ApiBearerAuth()
@AccessControlQuery({ service: ${entityName}AccessQueryService })`;
  } else {
    classDecorators = `
@ApiBearerAuth()`;
  }

  // Build methods
  const methods = [];

  if (hasReadMany) {
    const aclDecorator = hasAcl ? `\n  @AccessControlReadMany(${entityName}Resource.Many)` : '';

    if (hasOwnScope) {
      // Ownership-filtered readMany: inject user context and apply owner FK filter
      methods.push(`  @CrudReadMany()${aclDecorator}
  async getMany(
    @CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>,
    @Req() req: { user?: { id?: string } },
  ) {
    // Rule #6: enforce ownership in query for own-scope roles
    if (req.user?.id) {
      const where = crudRequest.parsed?.search?.$and || [];
      where.push({ '${effectiveOwnerField}': req.user.id });
      if (!crudRequest.parsed.search) crudRequest.parsed.search = {};
      crudRequest.parsed.search.$and = where;
    }
    return this.${camelName}CrudService.getMany(crudRequest);
  }`);
    } else {
      methods.push(`  @CrudReadMany()${aclDecorator}
  async getMany(@CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>) {
    return this.${camelName}CrudService.getMany(crudRequest);
  }`);
    }
  }

  if (hasReadOne) {
    const aclDecorator = hasAcl ? `\n  @AccessControlReadOne(${entityName}Resource.One)` : '';
    methods.push(`  @CrudReadOne()${aclDecorator}
  async getOne(@CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>) {
    return this.${camelName}CrudService.getOne(crudRequest);
  }`);
  }

  if (hasCreateOne) {
    const aclDecorator = hasAcl ? `\n  @AccessControlCreateOne(${entityName}Resource.One)` : '';
    methods.push(`  @CrudCreateOne({ dto: ${entityName}CreateDto })${aclDecorator}
  async createOne(
    @CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>,
    @CrudBody() dto: ${entityName}CreateDto,
  ) {
    return this.${camelName}CrudService.createOne(crudRequest, dto);
  }`);
  }

  if (hasUpdateOne) {
    const aclDecorator = hasAcl ? `\n  @AccessControlUpdateOne(${entityName}Resource.One)` : '';
    methods.push(`  @CrudUpdateOne({ dto: ${entityName}UpdateDto })${aclDecorator}
  async updateOne(
    @CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>,
    @CrudBody() dto: ${entityName}UpdateDto,
  ) {
    return this.${camelName}CrudService.updateOne(crudRequest, dto);
  }`);
  }

  if (hasDeleteOne) {
    const aclDecorator = hasAcl ? `\n  @AccessControlDeleteOne(${entityName}Resource.One)` : '';
    methods.push(`  @CrudDeleteOne()${aclDecorator}
  async deleteOne(@CrudRequest() crudRequest: CrudRequestInterface<${entityName}Entity>) {
    return this.${camelName}CrudService.deleteOne(crudRequest);
  }`);
  }

  if (hasRecoverOne) {
    const aclDecorator = hasAcl ? `\n  @AccessControlRecoverOne(${entityName}Resource.One)` : '';
    methods.push(`  @CrudRecoverOne()${aclDecorator}
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
})${crudRelationsDecorator}${classDecorators}
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
