#!/usr/bin/env node

/**
 * Rockets SDK CRUD Generator
 *
 * Generates all files needed for a rockets-sdk CRUD module.
 *
 * Usage:
 *   node generate.js '<config-json>'
 *   echo '<config-json>' | node generate.js
 *
 * Output:
 *   JSON object with:
 *   - files: array of { path, content } objects
 *   - wiring: integration snippets for integrate.js
 *     - entityImportPath: relative path to entity (inside its module, e.g., ./src/modules/<name>/entities/<name>.entity)
 *     - moduleImport: import statement for app.module.ts
 *     - moduleClass: class name to add to imports array
 *     - aclSnippet: code for app.acl.ts (if acl config present)
 *     - queryServices: { imports, providers, typeOrmExtImports } for AccessControlModule
 */

const { parseConfig, validateConfig } = require('./lib/config-parser');

// Generators
const { generateEntity } = require('./generators/entity');
const { generateConstants } = require('./generators/constants');
const { generateModule } = require('./generators/module');
const { generateController } = require('./generators/controller');
const { generateCrudService } = require('./generators/crud-service');
const { generateAdapter } = require('./generators/adapter');
const { generateAccessQueryService } = require('./generators/access-query');
const { generateModelService } = require('./generators/model-service');
const { generateDto } = require('./generators/dto');
const { generateCreateDto } = require('./generators/create-dto');
const { generateUpdateDto } = require('./generators/update-dto');
const { generatePaginatedDto } = require('./generators/paginated-dto');
const { generateInterface } = require('./generators/interface');
const { generateCreatableInterface } = require('./generators/creatable-interface');
const { generateUpdatableInterface } = require('./generators/updatable-interface');
const { generateSharedIndex } = require('./generators/shared-index');

/**
 * Default paths - can be overridden via config.paths
 */
const DEFAULT_PATHS = {
  module: 'src/modules',
  shared: 'src/shared',
};

/**
 * Generate ACL wiring snippet for app.acl.ts
 * @param {Object} config - Parsed configuration
 * @returns {Object|null} ACL snippet or null
 */
function generateAclSnippet(config) {
  const { entityName, kebabName, acl } = config;
  if (!acl) return null;

  // Map operations to accesscontrol method names
  const opMap = {
    create: { own: 'createOwn', any: 'createAny' },
    read: { own: 'readOwn', any: 'readAny' },
    update: { own: 'updateOwn', any: 'updateAny' },
    delete: { own: 'deleteOwn', any: 'deleteAny' },
  };

  const resourceEnum = `${entityName} = '${kebabName}'`;

  const grants = [];
  for (const [role, roleConfig] of Object.entries(acl)) {
    const rolePascal = role.charAt(0).toUpperCase() + role.slice(1);
    const methods = roleConfig.operations
      .map(op => opMap[op]?.[roleConfig.possession])
      .filter(Boolean);

    if (methods.length > 0) {
      grants.push(
        `acRules.grant([AppRole.${rolePascal}]).resource(AppResource.${entityName})\n  .${methods.join('().')}();`
      );
    }
  }

  return {
    resourceEnum,
    grants,
  };
}

/**
 * Generate queryServices wiring for AccessControlModule
 * @param {Object} config - Parsed configuration
 * @returns {Object} Wiring info for queryServices
 */
function generateQueryServicesWiring(config) {
  const { entityName, kebabName, upperSnakeName } = config;
  const paths = { ...DEFAULT_PATHS, ...(config.paths || {}) };
  const modulePath = `${paths.module}/${kebabName}`;

  return {
    // Import statement for the access query service
    importStatement: `import { ${entityName}AccessQueryService } from './${modulePath}/${kebabName}-access-query.service';`,
    // The class to add to queryServices array
    serviceClass: `${entityName}AccessQueryService`,
    // TypeOrmExtModule.forFeature import needed in AccessControlModule scope
    typeOrmExtImport: `TypeOrmExtModule.forFeature({ [${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY]: { entity: ${entityName}Entity } })`,
    // Constant import needed
    constantImport: `import { ${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY } from './${modulePath}/constants/${kebabName}.constants';`,
    // Entity import needed (entity lives inside its module)
    entityImport: `import { ${entityName}Entity } from './${paths.module}/${kebabName}/entities/${kebabName}.entity';`,
  };
}

/**
 * Generate all files for a CRUD module
 * @param {Object} config - Parsed configuration
 * @returns {Object} Result with files array and wiring info
 */
function generateAll(config) {
  const { entityName, kebabName, upperSnakeName, generateModelService: hasModelService } = config;

  // Merge paths with defaults
  const paths = {
    ...DEFAULT_PATHS,
    ...(config.paths || {}),
  };

  const files = [];

  // API Module files
  const apiModulePath = `${paths.module}/${kebabName}`;
  const entityPath = `${apiModulePath}/entities`;
  const sharedPath = paths.shared ? `${paths.shared}/${kebabName}` : null;

  // Entity (inside its own module directory)
  files.push({
    path: `${entityPath}/${kebabName}.entity.ts`,
    content: generateEntity(config),
  });

  // Constants
  files.push({
    path: `${apiModulePath}/constants/${kebabName}.constants.ts`,
    content: generateConstants(config),
  });

  // Module
  files.push({
    path: `${apiModulePath}/${kebabName}.module.ts`,
    content: generateModule(config),
  });

  // Controller
  files.push({
    path: `${apiModulePath}/${kebabName}.crud.controller.ts`,
    content: generateController(config),
  });

  // CrudService
  files.push({
    path: `${apiModulePath}/${kebabName}.crud.service.ts`,
    content: generateCrudService(config),
  });

  // TypeORM Adapter
  files.push({
    path: `${apiModulePath}/${kebabName}-typeorm-crud.adapter.ts`,
    content: generateAdapter(config),
  });

  // Access Query Service
  files.push({
    path: `${apiModulePath}/${kebabName}-access-query.service.ts`,
    content: generateAccessQueryService(config),
  });

  // Model Service (optional)
  if (hasModelService) {
    files.push({
      path: `${apiModulePath}/${kebabName}-model.service.ts`,
      content: generateModelService(config),
    });
  }

  // Shared Package - only if sharedPath is set
  if (sharedPath) {
    // DTOs
    files.push({
      path: `${sharedPath}/dtos/${kebabName}.dto.ts`,
      content: generateDto(config),
    });

    files.push({
      path: `${sharedPath}/dtos/${kebabName}-create.dto.ts`,
      content: generateCreateDto(config),
    });

    files.push({
      path: `${sharedPath}/dtos/${kebabName}-update.dto.ts`,
      content: generateUpdateDto(config),
    });

    files.push({
      path: `${sharedPath}/dtos/${kebabName}-paginated.dto.ts`,
      content: generatePaginatedDto(config),
    });

    // Interfaces
    files.push({
      path: `${sharedPath}/interfaces/${kebabName}.interface.ts`,
      content: generateInterface(config),
    });

    files.push({
      path: `${sharedPath}/interfaces/${kebabName}-creatable.interface.ts`,
      content: generateCreatableInterface(config),
    });

    files.push({
      path: `${sharedPath}/interfaces/${kebabName}-updatable.interface.ts`,
      content: generateUpdatableInterface(config),
    });

    // Index
    files.push({
      path: `${sharedPath}/index.ts`,
      content: generateSharedIndex(config),
    });
  }

  // Build wiring info for integrate.js
  const wiring = {
    entityImportPath: `./${paths.module}/${kebabName}/entities/${kebabName}.entity`,
    moduleImport: `import { ${entityName}Module } from './${paths.module}/${kebabName}/${kebabName}.module';`,
    moduleClass: `${entityName}Module`,
    entityClass: `${entityName}Entity`,
    entityConstant: `${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY`,
    constantImport: `import { ${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY } from './${paths.module}/${kebabName}/constants/${kebabName}.constants';`,
    queryServices: generateQueryServicesWiring(config),
    aclSnippet: generateAclSnippet(config),
    sdkVersion: config.sdkVersion,
  };

  return { files, wiring, config: { entityName, kebabName, upperSnakeName, acl: config.acl, ownerField: config.ownerField, sdkVersion: config.sdkVersion } };
}

/**
 * Parse CLI for --input <file> or positional arg or stdin
 */
function getInputFromArgs() {
  const fs = require('fs');
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      return fs.readFileSync(args[i + 1], 'utf8');
    }
  }
  if (args[0] && !args[0].startsWith('-')) {
    return args[0];
  }
  return null;
}

/**
 * Main function
 */
async function main() {
  let input = getInputFromArgs();

  if (input === null) {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    input = Buffer.concat(chunks).toString('utf8');
  }

  if (!input.trim()) {
    console.error(JSON.stringify({
      error: 'No input provided. Pass JSON config as argument or via stdin.',
    }));
    process.exit(1);
  }

  try {
    // Parse configuration
    const config = parseConfig(input);

    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.error(JSON.stringify({
        error: 'Configuration validation failed',
        errors: validation.errors,
      }));
      process.exit(1);
    }

    // Generate all files
    const result = generateAll(config);

    // Output JSON result
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({
      error: err.message,
      stack: err.stack,
    }));
    process.exit(1);
  }
}

main();
