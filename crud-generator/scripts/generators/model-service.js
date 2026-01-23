/**
 * Model Service Generator
 * @module generators/model-service
 */

/**
 * Generate ModelService file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated model service file content
 */
function generateModelService(config) {
  const { entityName, kebabName, upperSnakeName, sharedPackage } = config;

  // Import from shared package or relative path
  const sharedImportPath = sharedPackage || `../../shared/${kebabName}`;

  return `import { Injectable } from '@nestjs/common';
import {
  RepositoryInterface,
  ModelService,
  InjectDynamicRepository,
} from '@concepta/nestjs-common';
import {
  ${entityName}Interface,
  ${entityName}CreatableInterface,
  ${entityName}UpdatableInterface,
  ${entityName}CreateDto,
  ${entityName}UpdateDto,
} from '${sharedImportPath}';
import { ${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY } from './constants/${kebabName}.constants';

@Injectable()
export class ${entityName}ModelService extends ModelService<
  ${entityName}Interface,
  ${entityName}CreateDto,
  ${entityName}UpdateDto
> {
  public readonly createDto = ${entityName}CreateDto;
  public readonly updateDto = ${entityName}UpdateDto;

  constructor(
    @InjectDynamicRepository(${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY)
    public readonly repo: RepositoryInterface<${entityName}Interface>,
  ) {
    super(repo);
  }

  /**
   * Create a new ${entityName.toLowerCase()}
   */
  async create(data: ${entityName}CreatableInterface): Promise<${entityName}Interface> {
    // Add custom validation or business logic here
    return super.create(data as ${entityName}CreateDto);
  }

  /**
   * Update an existing ${entityName.toLowerCase()}
   */
  async update(data: ${entityName}UpdatableInterface): Promise<${entityName}Interface> {
    // Add custom validation or business logic here
    return super.update(data as ${entityName}UpdateDto);
  }
}
`;
}

module.exports = { generateModelService };
