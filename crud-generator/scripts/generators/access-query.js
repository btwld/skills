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
    // Allow all access by default - customize based on business rules
    return true;
  }
}
`;
}

module.exports = { generateAccessQueryService };
