<div id="badges">
  <a href="https://www.linkedin.com/in/vasilev-vitalii/">
    <img src="https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
  </a>
  <a href="https://www.youtube.com/@user-gj9vk5ln5c/featured">
    <img src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Youtube Badge"/>
  </a>
</div>

[Русский](README.RUS.md)

# vv-config-conn

Storage of database connection settings for MS SQL Server, PostgreSQL, Oracle and Firebird.

-   Generates a human-friendly JSONC config (defaults inserted, field descriptions rendered as comments).
-   Reads JSONC back into a typed object, validates it and adds missing fields.
-   Connection type is chosen by property `kind`, or by provider passed in code - so a service that works with only one database may drop `kind` at all.
-   No database drivers inside - this package only keeps and checks settings.

### Based on:

-   vv-config-jsonc
-   @sinclair/typebox
-   jsonc-parser

## Install

```
npm i vv-config-conn
```

## Quick start

Create an example config for a new service and read it back:

```TypeScript
import { readFileSync, writeFileSync } from 'fs'
import { EProvider, GetDefault, GetFromText, SetToText } from 'vv-config-conn'

// 1) generate example config file
writeFileSync('./connection.example.jsonc', SetToText(GetDefault(EProvider.pg), { provider: EProvider.pg }), 'utf8')

// 2) read config file, filled by user
const connection = GetFromText(readFileSync('./connection.jsonc', 'utf8'), EProvider.pg)

// connection is TConnPg, intellisense knows all fields
console.log(connection.host, connection.port, connection.database)
```

Generated `connection.example.jsonc`:

```JSONC
{
    "kind": "pg",
    // PostgreSQL host
    "host": "localhost",
    // PostgreSQL port
    "port": 5432,
    // Database name
    "database": "postgres",
    // Login
    "user": "postgres",
    // Password
    "password": "123456",
    // Enable SSL
    "ssl": false
}
```

`GetDefault` fills login, password and database like a database server right after clean install - `postgres` / `postgres` for PostgreSQL, `sa` / `master` for MS SQL Server, `system` for Oracle, `SYSDBA` and sample `employee.fdb` for Firebird. Password is always `123456`, it is a placeholder for user, not a working secret.

## Api

| Function                                      | Returns                | Description                                                                    |
| --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `GetDefault(provider)`                        | typed connection       | Default connection, filled like database server after clean install.           |
| `GetFromText(text, provider?)`                | typed connection       | Parse JSONC, add missing fields, validate. Throws when config is wrong.        |
| `SetToText(connection, options?)`             | JSONC string           | Serialize connection with comments. Values are not validated.                  |

Types: `EProvider`, `TConnection` (union of all), `TConnMssql`, `TConnPg`, `TConnOra`, `TConnFb`, `TConnectionByProvider`.
Typebox schemas, if you need them in your own config: `SConnection`, `SConnMssql`, `SConnPg`, `SConnOra`, `SConnFb`.

### How "kind" and "provider" work together

Property `kind` says what database is described, provider says what database is expected - `GetFromText` takes it as second argument, `SetToText` as `options.provider`. Rules are the same:

| kind inside | provider | result                                       |
| ----------- | -------- | -------------------------------------------- |
| yes         | not set  | `kind` is used                               |
| yes         | set      | must be equal to `kind`, otherwise error     |
| no          | set      | `provider` is used                           |
| no          | not set  | error                                        |

Because provider narrows the generic, it also makes intellisense precise - `GetFromText(text, EProvider.fb)` returns `TConnFb`, while `GetFromText(text)` returns the union `TConnection`. Same for `SetToText`: with `{ provider: EProvider.fb }` the connection argument is checked as `TConnFb`.

`SetToText` also decides, whether property `kind` goes to result text - `options.hasKind`:

| hasKind              | provider is known                | provider is unknown                                       |
| -------------------- | -------------------------------- | --------------------------------------------------------- |
| `allow`              | `kind` is written                | error                                                     |
| `optional` (default) | `kind` is written                | connection is written as is, without comments and defaults |
| `deny`               | `kind` is not written            | connection is written as is, without comments and defaults |

Provider is unknown only when `kind` is not inside connection and `options.provider` is not set. TypeScript does not let it happen - overload without `provider` expects `TConnection`, where `kind` is required - so it may come only from untyped javascript.

## Service with only one database

When a service always works with, for example, Firebird, property `kind` is just noise in config file. Write it with `{ hasKind: 'deny' }` and read it with a provider:

```TypeScript
import { EProvider, GetDefault, GetFromText, SetToText } from 'vv-config-conn'

const text = SetToText(GetDefault(EProvider.pg), { provider: EProvider.pg, hasKind: 'deny' })

const connection = GetFromText(text, EProvider.pg) // TConnPg, "kind" is restored in object
```

Text without `kind`:

```JSONC
{
    // PostgreSQL host
    "host": "localhost",
    // PostgreSQL port
    "port": 5432,
    // Database name
    "database": "postgres",
    // Login
    "user": "postgres",
    // Password
    "password": "123456",
    // Enable SSL
    "ssl": false
}
```

## Service with any database

Omit `provider` - database is chosen by `kind` inside config, and `switch` narrows the type:

```TypeScript
import { EProvider, GetFromText, type TConnection } from 'vv-config-conn'

const connection: TConnection = GetFromText(text)

switch (connection.kind) {
    case EProvider.mssql:
        console.log(connection.server, connection.auth.kind)
        break
    case EProvider.pg:
    case EProvider.ora:
    case EProvider.fb:
        console.log(connection.host, connection.database)
        break
}
```

## Errors

`GetFromText` throws on unknown or unexpected `kind` and on any validation error, all messages in one text:

```TypeScript
GetFromText(`{ "kind": "pg", "host": "localhost" }`)
// Error: on read connection "pg": path=/database message=Expected string; path=/user message=Expected string; path=/password message=Expected string

GetFromText(`{ "kind": "pg", "host": "localhost" }`, EProvider.fb)
// Error: on read connection: "kind" = "pg", but provider "fb" expected

GetFromText(`{ "host": "localhost" }`)
// Error: on read connection: property "kind" not found, allowed values: mssql | ora | pg | fb
```

`SetToText` checks only `kind` - connection with not filled (`null`) fields is a valid example config, and its values are already typed by TypeScript.

## Connections

<details>
<summary>mssql - Microsoft SQL Server</summary>

`GetDefault(EProvider.mssql)` uses SQL Server authentication:

```JSONC
{
    "kind": "mssql",
    // MSSQL server host
    "server": "localhost",
    // MSSQL port
    "port": 1433,
    // Database name. Omit or leave null to use the default database for the login.
    "database": "master",
    "auth": {
        "kind": "mssql",
        // SQL Server login
        "user": "sa",
        // Password
        "password": "123456"
    },
    // Trust self-signed certificate
    "trustServerCertificate": true,
    // Encrypt connection
    "encrypt": false
}
```

For Windows domain authentication set `auth.kind` to `ntlm`:

```JSONC
{
    "kind": "mssql",
    // MSSQL server host
    "server": "srv",
    "auth": {
        "kind": "ntlm",
        // Windows domain (e.g. CORP)
        "domain": "CORP",
        // Windows username
        "user": "user",
        // Windows password
        "password": "pwd"
    },
    // MSSQL port
    "port": 1433,
    // Database name. Omit or leave null to use the default database for the login.
    "database": null,
    // Trust self-signed certificate
    "trustServerCertificate": true,
    // Encrypt connection
    "encrypt": false
}
```

</details>

<details>
<summary>pg - PostgreSQL</summary>

```JSONC
{
    "kind": "pg",
    // PostgreSQL host
    "host": "localhost",
    // PostgreSQL port
    "port": 5432,
    // Database name
    "database": "postgres",
    // Login
    "user": "postgres",
    // Password
    "password": "123456",
    // Enable SSL
    "ssl": false
}
```

</details>

<details>
<summary>ora - Oracle</summary>

```JSONC
{
    "kind": "ora",
    // Oracle host
    "host": "localhost",
    // Oracle port
    "port": 1521,
    // Oracle service name, e.g. XEPDB1 or ORCL
    "service": "XEPDB1",
    // Login
    "user": "system",
    // Password
    "password": "123456",
    // Connection privilege. Required when connecting as SYS. Allowed values: SYSDBA | SYSOPER | SYSASM | SYSBACKUP | SYSDG | SYSKM | SYSRAC
    "privilege": null
}
```

</details>

<details>
<summary>fb - Firebird</summary>

```JSONC
{
    "kind": "fb",
    // Firebird host
    "host": "localhost",
    // Firebird port
    "port": 3050,
    // Path to .fdb file on the server, e.g. /var/lib/firebird/data/mydb.fdb
    "database": "/var/lib/firebird/data/employee.fdb",
    // Login
    "user": "SYSDBA",
    // Password
    "password": "123456",
    // Connection charset. Set WIN1251 for legacy Firebird databases where text columns have no explicit charset (NONE) and data is stored in Windows-1251 encoding.
    "charset": "UTF8"
}
```

</details>

## License

_MIT_
