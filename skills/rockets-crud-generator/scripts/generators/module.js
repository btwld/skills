/**
 * NestJS Module Generator
 * @module generators/module
 */

const { toPascalCase, toCamelCase } = require('../lib/name-utils');

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
  } = config;

  // Collect imports
  const nestImports = ['Module'];
  const imports = [];
  const moduleImports = [];
  const providers = [];
  const exports = [];

  // Basic provider classes
  const adapterClass = `${entityName}TypeOrmCrudAdapter`;
  const serviceClass = `${entityName}CrudService`;
  const accessQueryClass = `${entityName}AccessQueryService`;
  const controllerClass = `${entityName}CrudController`;

  providers.push(adapterClass, serviceClass, accessQueryClass);
  exports.push(serviceClass, adapterClass);

  // Add model service if configured
  if (generateModelService) {
    providers.push(`${entityName}ModelService`);
    exports.push(`${entityName}ModelService`);
  }

  // Build imports section
  imports.push(`import { Module } from '@nestjs/common';`);
  imports.push(`import { TypeOrmExtModule } from '@concepta/nestjs-typeorm-ext';`);

  if (hasRelations || generateModelService) {
    imports.push(`import { CrudRelationRegistry } from '@concepta/nestjs-crud';`);
  }

  // Add constant import
  imports.push(`import { ${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY } from './constants/${kebabName}.constants';`);

  // Add entity import
  imports.push(`import { ${entityName}Entity } from '../../entities/${kebabName}.entity';`);

  // Add controller import
  imports.push(`import { ${controllerClass} } from './${kebabName}.crud.controller';`);

  // Add service imports
  imports.push(`import { ${serviceClass} } from './${kebabName}.crud.service';`);
  imports.push(`import { ${adapterClass} } from './${kebabName}-typeorm-crud.adapter';`);
  imports.push(`import { ${accessQueryClass} } from './${kebabName}-access-query.service';`);

  if (generateModelService) {
    imports.push(`import { ${entityName}ModelService } from './${kebabName}-model.service';`);
  }

  // Process relations
  const relationServices = [];
  if (hasRelations) {
    for (const rel of relations) {
      const relEntityName = toPascalCase(rel.targetEntity);
      const relKebab = rel.targetKebab;
      const relServiceClass = `${relEntityName}CrudService`;

      // Import related entity
      imports.push(`import { ${relEntityName}Entity } from '../../entities/${relKebab}.entity';`);

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

  // Build module imports array with TypeOrmExtModule for Rockets SDK
  const moduleImportsCode = [
    `TypeOrmExtModule.forFeature({
      [${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY]: { entity: ${entityName}Entity },
    })`,
    ...moduleImports,
  ];

  // Build providers array
  let providersCode = providers.map(p => `    ${p},`);

  // Add relation registry provider if has relations
  if (hasRelations) {
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
