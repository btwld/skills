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
 *   JSON object with files array containing { path, content } objects
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
  entity: 'src/entities',
  module: 'src/modules',
  shared: 'src/shared',
};

/**
 * Generate all files for a CRUD module
 * @param {Object} config - Parsed configuration
 * @returns {Object} Result with files array
 */
function generateAll(config) {
  const { kebabName, generateModelService: hasModelService } = config;

  // Merge paths with defaults
  const paths = {
    ...DEFAULT_PATHS,
    ...(config.paths || {}),
  };

  const files = [];

  // API Module files
  const apiModulePath = `${paths.module}/${kebabName}`;
  const entityPath = paths.entity;
  const sharedPath = paths.shared ? `${paths.shared}/${kebabName}` : null;

  // Entity
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

  return { files };
}

/**
 * Main function
 */
async function main() {
  let input = '';

  // Get input from CLI argument or stdin
  if (process.argv[2]) {
    input = process.argv[2];
  } else {
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
