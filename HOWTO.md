# MCP Server

## Testar

```ps
$env:MSSQL_SERVER="localhost\SQLEXPRESS"
$env:MSSQL_DATABASE="SociaSOURCE"
$env:MSSQL_USER="sa"
$env:MSSQL_PASSWORD="..."
$env:MSSQL_ENCRYPT="false"
$env:MSSQL_TRUST_CERT="true"
Remove-Item Env:MSSQL_TRUSTED_CONNECTION -ErrorAction SilentlyContinue

npx @modelcontextprotocol/inspector node D:/Tools/MCP/SQL_MCP/dist/index.js
```

## Instalar em um projeto

```ps
claude mcp add sql-mcp node "D:/Tools/MCP/SQL_MCP/dist/index.js" `
  --env MSSQL_SERVER="localhost\SQLEXPRESS" `
  --env MSSQL_DATABASE="SociaSOURCE" `
  --env MSSQL_USER="sa" `
  --env MSSQL_PASSWORD="..." `
  --env MSSQL_ENCRYPT="false" `
  --env MSSQL_TRUST_CERT="true"
```
