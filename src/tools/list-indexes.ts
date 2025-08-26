import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import { ToolDefinition, validateIdentifier } from '../types.js';
import { BaseSQLTool } from './base-tool.js';

export class ListIndexesTool extends BaseSQLTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'list_indexes',
      description: 'List all indexes in the database',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'Table name to filter indexes (optional)'
          },
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

    if (args?.table_name && !validateIdentifier(args.table_name as string)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid table name');
    }

    const request = pool.request();
    request.input('schema', sql.NVarChar, schema);

    let query = `
      SELECT
        i.name AS INDEX_NAME,
        t.name AS TABLE_NAME,
        s.name AS SCHEMA_NAME,
        i.type_desc AS INDEX_TYPE,
        i.is_unique,
        i.is_primary_key,
        c.name AS COLUMN_NAME,
        ic.key_ordinal,
        ic.is_descending_key
      FROM sys.indexes i
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      LEFT JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      LEFT JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE s.name = @schema
    `;

    if (args?.table_name) {
      request.input('tableName', sql.NVarChar, args.table_name as string);
      query += ` AND t.name = @tableName`;
    }

    query += ` ORDER BY t.name, i.name, ic.key_ordinal`;

    const result = await request.query(query);
    return this.formatResponse(result.recordset);
  }
}
