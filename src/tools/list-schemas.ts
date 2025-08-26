import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import { ToolDefinition } from '../types.js';
import { BaseSQLTool } from './base-tool.js';

export class ListSchemasTool extends BaseSQLTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'list_schemas',
      description: 'List all schemas in the database',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    };
  }

  async execute(pool: sql.ConnectionPool): Promise<CallToolResult> {
    const request = pool.request();
    const result = await request.query(`
      SELECT
        SCHEMA_NAME
      FROM INFORMATION_SCHEMA.SCHEMATA
      ORDER BY SCHEMA_NAME
    `);

    return this.formatResponse(result.recordset);
  }
}
