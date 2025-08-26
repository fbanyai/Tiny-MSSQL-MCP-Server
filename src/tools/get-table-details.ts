import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import { ToolDefinition, validateIdentifier } from '../types.js';
import { BaseSQLTool } from './base-tool.js';

export class GetTableDetailsTool extends BaseSQLTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'get_table_details',
      description: 'Get detailed information about a table including columns, indexes, and relationships',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'Name of the table'
          },
          schema: {
            type: 'string',
            description: 'Schema name (optional, defaults to dbo)'
          }
        },
        required: ['table_name']
      }
    };
  }

  async execute(pool: sql.ConnectionPool, args?: Record<string, any>): Promise<CallToolResult> {
    if (!args?.table_name) {
      throw new McpError(ErrorCode.InvalidParams, 'Table name is required');
    }

    const tableName = args.table_name as string;
    const schema = (args?.schema as string) || 'dbo';

    if (!validateIdentifier(schema) || !validateIdentifier(tableName)) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid schema or table name');
    }

    const columnsRequest = pool.request();
    columnsRequest.input('schema', sql.NVarChar, schema);
    columnsRequest.input('tableName', sql.NVarChar, tableName);
    const columnsResult = await columnsRequest.query(`
      SELECT
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.NUMERIC_PRECISION,
        c.NUMERIC_SCALE,
        c.ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS c
      WHERE c.TABLE_SCHEMA = @schema AND c.TABLE_NAME = @tableName
      ORDER BY c.ORDINAL_POSITION
    `);

    const fkRequest = pool.request();
    fkRequest.input('schema', sql.NVarChar, schema);
    fkRequest.input('tableName', sql.NVarChar, tableName);
    const fkResult = await fkRequest.query(`
      SELECT
        fk.name AS FK_NAME,
        tp.name AS PARENT_TABLE,
        cp.name AS PARENT_COLUMN,
        tr.name AS REFERENCED_TABLE,
        cr.name AS REFERENCED_COLUMN
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
      INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
      INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
      INNER JOIN sys.schemas s ON tp.schema_id = s.schema_id
      WHERE s.name = @schema AND tp.name = @tableName
    `);

    const indexRequest = pool.request();
    indexRequest.input('schema', sql.NVarChar, schema);
    indexRequest.input('tableName', sql.NVarChar, tableName);
    const indexResult = await indexRequest.query(`
      SELECT
        i.name AS INDEX_NAME,
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
      WHERE s.name = @schema AND t.name = @tableName
      ORDER BY i.name, ic.key_ordinal
    `);

    const tableDetails = {
      table: {
        schema,
        name: tableName
      },
      columns: columnsResult.recordset,
      indexes: indexResult.recordset,
      foreign_keys: fkResult.recordset
    };

    return this.formatResponse(tableDetails);
  }
}
