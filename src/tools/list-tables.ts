import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import { ToolDefinition, validateIdentifier } from '../types.js';
import { BaseSQLTool } from './base-tool.js';

export class ListTablesTool extends BaseSQLTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'list_tables',
      description: 'List all tables in the database',
      inputSchema: {
        type: 'object',
        properties: {
          schema: {
            type: 'string',
            description: 'Schema name (optional, defaults to dbo)'
          }
        }
      }
    };
  }

  async execute(pool: sql.ConnectionPool, args?: Record<string, any>): Promise<CallToolResult> {
    const schema = (args?.schema as string) || 'dbo';
    if (!validateIdentifier(schema)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid schema name');
    }

    const request = pool.request();
    request.input('schema', sql.NVarChar, schema);
    const result = await request.query(`
      SELECT
        t.TABLE_SCHEMA,
        t.TABLE_NAME,
        t.TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_SCHEMA = @schema
      ORDER BY t.TABLE_NAME
    `);

    return this.formatResponse(result.recordset);
  }
}
