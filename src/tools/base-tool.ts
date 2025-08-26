import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import { BaseTool, ToolDefinition } from '../types.js';

export abstract class BaseSQLTool implements BaseTool {
  abstract getDefinition(): ToolDefinition;
  abstract execute(pool: sql.ConnectionPool, args?: Record<string, any>): Promise<CallToolResult>;

  protected formatResponse(data: any): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }
}
