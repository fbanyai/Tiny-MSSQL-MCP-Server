import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface BaseTool {
  getDefinition(): ToolDefinition;
  execute(pool: sql.ConnectionPool, args?: Record<string, any>): Promise<CallToolResult>;
}

export function validateIdentifier(identifier: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}
