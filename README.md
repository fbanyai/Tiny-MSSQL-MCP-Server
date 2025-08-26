# Simple MSSQL MCP Server

A Model Context Protocol (MCP) server for Microsoft SQL Server that provides tools to interact with MSSQL databases. Provides basic connection for MCP clients retrieving schemas, tables, indexes and procedures structures.

## Features

- **List Schemas**: Get all schemas in the database
- **List Tables**: Get all tables in a specific schema
- **List Stored Procedures**: Get all stored procedures in a schema
- **List Functions**: Get all functions in a schema
- **List Indexes**: Get all indexes, optionally filtered by table
- **Get Table Details**: Get comprehensive table information including columns, indexes, and foreign key relationships

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your database connection by copying `.env.example` to `.env` and updating the values:
```bash
cp .env.example .env
```

3. Build the project:
```bash
npm run build
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run start
```

## Configuration

Set the following environment variables:

- `MSSQL_SERVER`: SQL Server hostname (default: localhost)
- `MSSQL_DATABASE`: Database name (default: master)
- `MSSQL_USER`: Username for authentication
- `MSSQL_PASSWORD`: Password for authentication
- `MSSQL_ENCRYPT`: Enable encryption (true/false)
- `MSSQL_TRUST_CERT`: Trust server certificate (true/false)
- `MSSQL_TRUSTED_CONNECTION`: Use Windows Authentication (true/false)
- `MSSQL_INSTANCE`: SQL Server instance name (optional)

## Testing

You can test the MCP server using the MCP inspector:

```powershell
$env:MSSQL_SERVER="localhost\SQLEXPRESS"
$env:MSSQL_DATABASE="YourDatabase"
$env:MSSQL_USER="sa"
$env:MSSQL_PASSWORD="YourPassword"
$env:MSSQL_ENCRYPT="false"
$env:MSSQL_TRUST_CERT="true"
Remove-Item Env:MSSQL_TRUSTED_CONNECTION -ErrorAction SilentlyContinue

npx @modelcontextprotocol/inspector node D:/Tools/MCP/SQL_MCP/dist/index.js
```

## Adding to Claude Desktop

To add this MCP server to Claude Desktop:

```powershell
claude mcp add sql-mcp node "D:/Tools/MCP/SQL_MCP/dist/index.js" `
  --env MSSQL_SERVER="localhost\SQLEXPRESS" `
  --env MSSQL_DATABASE="YourDatabase" `
  --env MSSQL_USER="sa" `
  --env MSSQL_PASSWORD="YourPassword" `
  --env MSSQL_ENCRYPT="false" `
  --env MSSQL_TRUST_CERT="true"
```

## Tools Available

### list_schemas
Lists all schemas in the database.

**Parameters:** None

### list_tables
Lists all tables in the specified schema.

**Parameters:**
- `schema` (optional): Schema name, defaults to 'dbo'

### list_procedures
Lists all stored procedures in the specified schema.

**Parameters:**
- `schema` (optional): Schema name, defaults to 'dbo'

### list_functions
Lists all functions in the specified schema.

**Parameters:**
- `schema` (optional): Schema name, defaults to 'dbo'

### list_indexes
Lists all indexes, optionally filtered by table.

**Parameters:**
- `table_name` (optional): Filter by specific table
- `schema` (optional): Schema name, defaults to 'dbo'

### get_table_details
Gets comprehensive information about a table.

**Parameters:**
- `table_name` (required): Name of the table
- `schema` (optional): Schema name, defaults to 'dbo'

Returns detailed information including:
- Column definitions with data types, nullability, defaults
- All indexes on the table
- Foreign key relationships