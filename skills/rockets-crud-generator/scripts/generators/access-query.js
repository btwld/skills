/**
 * Access Query Service Generator
 * @module generators/access-query
 */

/**
 * Generate AccessQueryService file content
 *
 * When `config.acl` is provided, generates ownership checks using
 * `@InjectDynamicRepository` for "own" possession roles.
 * The service MUST be registered as a provider in the feature module
 * (AccessControlGuard.moduleRef.resolve() scopes to the controller's host module).
 *
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated access query service file content
 */
function generateAccessQueryService(config) {
  const { entityName, kebabName, upperSnakeName, acl, ownerField } = config;

  const hasOwn = acl && Object.values(acl).some(r => r.possession === 'own');
  const effectiveOwnerField = ownerField || 'userId';

  // Build imports
  const imports = [
    `import { Injectable } from '@nestjs/common';`,
    `import {`,
    `  AccessControlContextInterface,`,
    `  CanAccess,`,
    `} from '@concepta/nestjs-access-control';`,
  ];

  // If any role has "own" possession, inject dynamic repository for ownership check
  if (hasOwn) {
    imports.push(
      `import { InjectDynamicRepository } from '@concepta/nestjs-common';`,
      `import { RepositoryInterface } from '@concepta/nestjs-common';`,
      `import { ${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY } from './constants/${kebabName}.constants';`,
      `import { ${entityName}Entity } from './entities/${kebabName}.entity';`,
    );
  }

  // Build constructor
  let constructorBody = '';
  if (hasOwn) {
    constructorBody = `
  constructor(
    @InjectDynamicRepository(${upperSnakeName}_MODULE_${upperSnakeName}_ENTITY_KEY)
    private ${entityName.charAt(0).toLowerCase() + entityName.slice(1)}Repo: RepositoryInterface<${entityName}Entity>,
  ) {}
`;
  }

  // Build canAccess method body
  let ownCheck = `      // TODO: load entity and compare owner FK to user.id
      return false;`;

  if (hasOwn) {
    const repoVar = `${entityName.charAt(0).toLowerCase() + entityName.slice(1)}Repo`;
    ownCheck = `      const request = context.getRequest() as { params?: { id?: string } } | undefined;
      const entityId = request?.params?.id;

      // readMany (no entityId): allow access — controller applies ownership filter
      if (!entityId) return true;

      // readOne/update/delete: verify entity ownership via DB lookup
      const entity = await this.${repoVar}.findOne({ where: { id: entityId } } as any);
      return (entity as any)?.${effectiveOwnerField} === user.id;`;
  }

  return `${imports.join('\n')}

@Injectable()
export class ${entityName}AccessQueryService implements CanAccess {${constructorBody}
  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const query = context.getQuery();
    const user = context.getUser() as { id?: string } | undefined;
    if (!query || !user?.id) return false;

    // Any possession: allow (admin/manager roles)
    if (query.possession === 'any') return true;

    // Own possession: verify entity ownership
    if (query.possession === 'own') {
${ownCheck}
    }

    return false;
  }
}
`;
}

module.exports = { generateAccessQueryService };
