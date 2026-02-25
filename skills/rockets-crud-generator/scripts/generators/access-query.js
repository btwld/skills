/**
 * Access Query Service Generator
 * @module generators/access-query
 */

/**
 * Generate AccessQueryService file content
 * @param {Object} config - Parsed configuration
 * @returns {string} Generated access query service file content
 */
function generateAccessQueryService(config) {
  const { entityName } = config;

  return `import { Injectable } from '@nestjs/common';
import {
  AccessControlContextInterface,
  CanAccess,
} from '@concepta/nestjs-access-control';

@Injectable()
export class ${entityName}AccessQueryService implements CanAccess {
  async canAccess(context: AccessControlContextInterface): Promise<boolean> {
    const query = context.getQuery();
    const user = context.getUser() as { id?: string } | undefined;
    if (!query || !user?.id) return false;
    // Admin/Any: possession === 'any' => allow
    if (query.possession === 'any') return true;
    // Own: implement ownership check. Get entity id from request, not from query:
    // IQueryInfo does not have subjectId — use context.getRequest()?.params?.id
    if (query.possession === 'own') {
      const request = context.getRequest() as { params?: { id?: string } } | undefined;
      const entityId = request?.params?.id;
      // TODO: load entity and compare owner FK (e.g. userId) to user.id; return true only if match
      return false;
    }
    return false;
  }
}
`;
}

module.exports = { generateAccessQueryService };
