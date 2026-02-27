/**
 * NestJS Module Generator
 * @module generators/module
 *
 * Feature modules include: entity registration, adapter, CRUD service,
 * optionally model service, and access query service (when ACL is enabled).
 *
 * Access query services MUST be in feature modules because
 * AccessControlGuard.moduleRef.resolve() scopes to the controller's host module.
 */

const { toPascalCase, toCamelCase } = require('../lib/name-utils');
const { isVersionAtLeast } = require('../lib/config-parser');

/**
 * Generate NestJS module file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated module file content
 */
function generateModule(config) {
  const {
    entityName,
    kebabName,
    camelName,
    upperSnakeName,
    relations,
    hasRelations,
    generateModelService,
    sdkVersion,
  } = config;

  // SDK version gate: ACL requires alpha.7+
  const hasAcl = isVersionAtLeast(sdkVersion, 'alpha.7');

  // CrudRelationRegistry requires alpha.11+; filter out sdkManaged relations
  const hasCrudRelations = isVersionAtLeast(sdkVersion, 'alpha.11');
  const ownedRelations = relations.filter(r => !r.sdkManaged);
  const hasOwnedRelations = hasCrudRelations && ownedRelations.length > 0;

  // Collect imports
  const imports = [];
  const moduleImports = [];
  const providers = [];
  const exports = [];

  // Basic provider classes
  const adapterClass = `${entityName}TypeOrmCrudAdapter`;
  const serviceClass = `${entityName}CrudService`;
  const controllerClass = `${entityName}CrudController`;

  providers.push(adapterClass, serviceClass);
  exports.push(serviceClass, adapterClass);

  // Add model service if configured
  if (generateModelService) {
    providers.push(`${entityName}ModelService`);
    exports.push(`${entityName}ModelService`);
  }

  // Add access query service when ACL is enabled
  // Must be in feature module: AccessControlGuard.moduleRef.resolve() scopes to controller's module
  if (hasAcl) {
    providers.push(`${entityName}AccessQueryService`);
  }

  // Build imports section
  imports.push(`import { Module } from '@nestjs/common';`);
  imports.push(`import { TypeOrmModule } from '@nestjs/typeorm';`);
  imports.push(`import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';`);

  if (hasOwnedRelations || generateModelService) {
    imports.push(`import { CrudRelationRegistry } from '@concepta/nestjs-crud';`);
  }

  // Add constant import
  imports.push(`import { ${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY } from './constants/${kebabName}.constants';`);

  // Add entity import
  imports.push(`import { ${entityName}Entity } from './entities/${kebabName}.entity';`);

  // Add controller import
  imports.push(`import { ${controllerClass} } from './${kebabName}.crud.controller';`);

  // Add service imports
  imports.push(`import { ${serviceClass} } from './${kebabName}.crud.service';`);
  imports.push(`import { ${adapterClass} } from './${kebabName}-typeorm-crud.adapter';`);

  if (generateModelService) {
    imports.push(`import { ${entityName}ModelService } from './${kebabName}-model.service';`);
  }

  // Add access query service import when ACL is enabled
  if (hasAcl) {
    imports.push(`import { ${entityName}AccessQueryService } from './${kebabName}-access-query.service';`);
  }

  // Process owned relations for module/service imports
  const relationServices = [];

  if (hasOwnedRelations) {
    for (const rel of ownedRelations) {
      const relEntityName = toPascalCase(rel.targetEntity);
      const relKebab = rel.targetKebab;
      const relServiceClass = `${relEntityName}CrudService`;

      // Import related entity
      imports.push(`import { ${relEntityName}Entity } from '../${relKebab}/entities/${relKebab}.entity';`);

      // Import related module and service
      imports.push(`import { ${relEntityName}Module } from '../${relKebab}/${relKebab}.module';`);
      imports.push(`import { ${relServiceClass} } from '../${relKebab}/${relKebab}.crud.service';`);

      moduleImports.push(`${relEntityName}Module`);
      relationServices.push({
        name: relServiceClass,
        varName: `${toCamelCase(relEntityName)}Service`,
        entity: `${relEntityName}Entity`,
      });
    }
  }

  // Build module imports array
  const moduleImportsCode = [
    `TypeOrmModule.forFeature([${entityName}Entity])`,
    `TypeOrmExtModule.forFeature({
      [${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY]: { entity: ${entityName}Entity },
    })`,
    ...moduleImports,
  ];

  // Build providers array — clean, no ACL workaround providers
  let providersCode = providers.map(p => `    ${p},`);

  // Add relation registry provider if has owned (non-sdkManaged) relations
  if (hasOwnedRelations) {
    const registryName = `'${upperSnakeName}_RELATION_REGISTRY'`;
    const injectServices = relationServices.map(s => s.name);
    const factoryParams = relationServices.map(s => `${s.varName}: ${s.name}`);
    const registerCalls = relationServices.map(s => `        registry.register(${s.varName});`);
    const entityTypes = relationServices.map(s => s.entity);

    providersCode.push(`    {
      provide: ${registryName},
      inject: [${injectServices.join(', ')}],
      useFactory: (${factoryParams.join(', ')}) => {
        const registry = new CrudRelationRegistry<${entityName}Entity, [${entityTypes.join(', ')}]>();
${registerCalls.join('\n')}
        return registry;
      },
    },`);
  }

  // Build module decorator
  return `${imports.join('\n')}

@Module({
  imports: [
    ${moduleImportsCode.join(',\n    ')},
  ],
  controllers: [${controllerClass}],
  providers: [
${providersCode.join('\n')}
  ],
  exports: [${exports.join(', ')}],
})
export class ${entityName}Module {}
`;
}

module.exports = { generateModule };
