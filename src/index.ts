#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';

class SQLMCPServer {
  private server: Server;
  private pool: sql.ConnectionPool | null = null;

  private validateIdentifier(identifier: string): boolean {
    // Allow alphanumeric, underscore, and basic schema/table names
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
  }

  constructor() {
    this.server = new Server(
      {
        name: 'sql-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private async connectToDatabase() {
    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    const useTrustedConnection = process.env.MSSQL_TRUSTED_CONNECTION === 'true';
    if (!useTrustedConnection && (!process.env.MSSQL_USER || !process.env.MSSQL_PASSWORD)) {
      throw new Error('Database credentials not provided. Set MSSQL_USER and MSSQL_PASSWORD environment variables, or set MSSQL_TRUSTED_CONNECTION=true for Windows Authentication.');
    }

    const config: sql.config = {
      server: process.env.MSSQL_SERVER || 'localhost',
      database: process.env.MSSQL_DATABASE || 'master',
      options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
        connectTimeout: 30000,
        requestTimeout: 30000,
        instanceName: process.env.MSSQL_INSTANCE || undefined,
      },
    };

    if (useTrustedConnection) {
      config.authentication = {
        type: 'default',
        options: {}
      };
    } else {
      config.user = process.env.MSSQL_USER;
      config.password = process.env.MSSQL_PASSWORD;
    }

    try {
      this.pool = new sql.ConnectionPool(config);
      await this.pool.connect();
      return this.pool;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_schemas',
            description: 'List all schemas in the database',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'list_tables',
            description: 'List all tables in the database',
            inputSchema: {
              type: 'object',
              properties: {
                schema: {
                  type: 'string',
                  description: 'Schema name (optional, defaults to dbo)',
                },
              },
            },
          },
          {
            name: 'list_procedures',
            description: 'List all stored procedures in the database',
            inputSchema: {
              type: 'object',
              properties: {
                schema: {
                  type: 'string',
                  description: 'Schema name (optional, defaults to dbo)',
                },
              },
            },
          },
          {
            name: 'list_functions',
            description: 'List all functions in the database',
            inputSchema: {
              type: 'object',
              properties: {
                schema: {
                  type: 'string',
                  description: 'Schema name (optional, defaults to dbo)',
                },
              },
            },
          },
          {
            name: 'list_indexes',
            description: 'List all indexes in the database',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Table name to filter indexes (optional)',
                },
                schema: {
                  type: 'string',
                  description: 'Schema name (optional, defaults to dbo)',
                },
              },
            },
          },
          {
            name: 'get_table_details',
            description: 'Get detailed information about a table including columns, indexes, and relationships',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Name of the table',
                },
                schema: {
                  type: 'string',
                  description: 'Schema name (optional, defaults to dbo)',
                },
              },
              required: ['table_name'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const pool = await this.connectToDatabase();

        switch (name) {
          case 'list_schemas':
            return await this.listSchemas(pool);
          case 'list_tables':
            const tablesSchema = (args?.schema as string) || 'dbo';
            if (!this.validateIdentifier(tablesSchema)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid schema name');
            }
            return await this.listTables(pool, tablesSchema);
          case 'list_procedures':
            const procSchema = (args?.schema as string) || 'dbo';
            if (!this.validateIdentifier(procSchema)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid schema name');
            }
            return await this.listProcedures(pool, procSchema);
          case 'list_functions':
            const funcSchema = (args?.schema as string) || 'dbo';
            if (!this.validateIdentifier(funcSchema)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid schema name');
            }
            return await this.listFunctions(pool, funcSchema);
          case 'list_indexes':
            const indexSchema = (args?.schema as string) || 'dbo';
            if (!this.validateIdentifier(indexSchema)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid schema name');
            }
            if (args?.table_name && !this.validateIdentifier(args.table_name as string)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid table name');
            }
            return await this.listIndexes(pool, args?.table_name as string, indexSchema);
          case 'get_table_details':
            if (!args?.table_name) {
              throw new McpError(ErrorCode.InvalidParams, 'Table name is required');
            }
            const detailsSchema = (args?.schema as string) || 'dbo';
            if (!this.validateIdentifier(detailsSchema) || !this.validateIdentifier(args.table_name as string)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid schema or table name');
            }
            return await this.getTableDetails(pool, args.table_name as string, detailsSchema);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Database operation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async listSchemas(pool: sql.ConnectionPool) {
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        SCHEMA_NAME
      FROM INFORMATION_SCHEMA.SCHEMATA
      ORDER BY SCHEMA_NAME
    `);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.recordset, null, 2),
        },
      ],
    };
  }

  private async listTables(pool: sql.ConnectionPool, schema: string) {
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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.recordset, null, 2),
        },
      ],
    };
  }

  private async listProcedures(pool: sql.ConnectionPool, schema: string) {
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

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.recordset, null, 2),
        },
      ],
    };
  }

  private async listFunctions(pool: sql.ConnectionPool, schema: string) {
    const request = pool.request();
    request.input('schema', sql.NVarChar, schema);
    const result = await request.query(`
      SELECT 
        r.ROUTINE_SCHEMA,
        r.ROUTINE_NAME,
        r.ROUTINE_TYPE,
        r.DATA_TYPE,
        r.CREATED,
        r.LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES r
      WHERE r.ROUTINE_TYPE = 'FUNCTION'
        AND r.ROUTINE_SCHEMA = @schema
      ORDER BY r.ROUTINE_NAME
    `);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.recordset, null, 2),
        },
      ],
    };
  }

  private async listIndexes(pool: sql.ConnectionPool, tableName?: string, schema: string = 'dbo') {
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

    if (tableName) {
      request.input('tableName', sql.NVarChar, tableName);
      query += ` AND t.name = @tableName`;
    }

    query += ` ORDER BY t.name, i.name, ic.key_ordinal`;

    const result = await request.query(query);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.recordset, null, 2),
        },
      ],
    };
  }

  private async getTableDetails(pool: sql.ConnectionPool, tableName: string, schema: string) {
    // Get table columns
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

    // Get foreign keys
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

    // Get indexes for this table
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
        name: tableName,
      },
      columns: columnsResult.recordset,
      indexes: indexResult.recordset,
      foreign_keys: fkResult.recordset,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(tableDetails, null, 2),
        },
      ],
    };
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      if (this.pool) {
        await this.pool.close();
      }
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SQL MCP server running on stdio');
  }
}

const server = new SQLMCPServer();
server.run().catch(console.error);