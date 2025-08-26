# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

- **Build**: `npm run build` - Compiles TypeScript to JavaScript in the `dist/` directory
- **Development**: `npm run dev` - Runs the server directly with ts-node for development
- **Production**: `npm run start` - Runs the compiled JavaScript from `dist/`

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides SQL Server database introspection tools. The architecture follows these key patterns:

### Single-Class Architecture
The entire server is implemented as a single `SQLMCPServer` class in `src/index.ts` that:
- Manages database connections using the `mssql` package with connection pooling
- Implements the MCP server protocol using `@modelcontextprotocol/sdk`
- Uses stdio transport for communication with MCP clients

### Database Connection Management
- Connection configuration is environment-variable driven (see `.env.example`)
- Uses connection pooling with the `mssql` package for efficient resource management
- Implements proper connection validation and error handling
- Connection details are validated on each database operation

### Tool Implementation Pattern
Each database operation is implemented as:
1. A tool definition in `ListToolsRequestSchema` handler with JSON schema validation
2. Input validation using `validateIdentifier()` for SQL injection prevention  
3. A private method that executes parameterized SQL queries
4. Consistent JSON response format wrapping database results

### Available MCP Tools
- `list_tables` - Lists tables in a schema using INFORMATION_SCHEMA.TABLES
- `list_procedures` - Lists stored procedures using INFORMATION_SCHEMA.ROUTINES
- `list_functions` - Lists functions using INFORMATION_SCHEMA.ROUTINES  
- `list_indexes` - Lists indexes using sys catalog views with optional table filtering
- `get_table_details` - Comprehensive table information including columns, indexes, and foreign keys

### Security Considerations
- All user inputs are validated using regex patterns in `validateIdentifier()`
- SQL queries use parameterized inputs to prevent injection attacks
- Environment variables are required for database credentials
- No raw SQL execution - only predefined, parameterized queries

### TypeScript Configuration
- Targets ES2020 with CommonJS modules
- Strict type checking enabled
- Outputs to `dist/` with source maps and declarations
- Uses `ts-node` for development execution

## Environment Configuration

Copy `.env.example` to `.env` and configure:
- `MSSQL_SERVER` - SQL Server hostname
- `MSSQL_DATABASE` - Database name  
- `MSSQL_USER` / `MSSQL_PASSWORD` - Authentication credentials
- `MSSQL_ENCRYPT` / `MSSQL_TRUST_CERT` - SSL configuration