import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import { ToolDefinition, validateIdentifier } from '../types.js';
import { BaseSQLTool } from './base-tool.js';

export class ListProceduresTool extends BaseSQLTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'list_procedures',
      description: 'List all stored procedures in the database',
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
        r.ROUTINE_SCHEMA,
        r.ROUTINE_NAME,
        r.ROUTINE_TYPE,
        r.CREATED,
        r.LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES r
      WHERE r.ROUTINE_TYPE = 'PROCEDURE'
        AND r.ROUTINE_SCHEMA = @schema
      ORDER BY r.ROUTINE_NAME
    `);

    return this.formatResponse(result.recordset);
  }
}
