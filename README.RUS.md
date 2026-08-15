<div id="badges">
  <a href="https://www.linkedin.com/in/vasilev-vitalii/">
    <img src="https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
  </a>
  <a href="https://www.youtube.com/@user-gj9vk5ln5c/featured">
    <img src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Youtube Badge"/>
  </a>
</div>

[English](README.md)

# vv-config-conn

Хранение настроек подключения к БД - MS SQL Server, PostgreSQL, Oracle, Firebird.

-   Генерирует удобный для человека JSONC-конфиг (значения по умолчанию проставлены, описания полей выводятся комментариями).
-   Читает JSONC обратно в типизированный объект, проверяет его и дописывает недостающие поля.
-   Тип подключения определяется свойством `kind` либо провайдером, указанным в коде - поэтому сервис, работающий только с одной БД, может вообще не хранить `kind`.
-   Драйверов БД внутри нет - пакет только хранит и проверяет настройки.

### Основан на:

-   vv-config-jsonc
-   @sinclair/typebox
-   jsonc-parser

## Установка

```
npm i vv-config-conn
```

## Быстрый старт

Создать пример конфига для нового сервиса и прочитать его:

```TypeScript
import { readFileSync, writeFileSync } from 'fs'
import { EProvider, GetDefault, GetFromText, SetToText } from 'vv-config-conn'

// 1) генерируем файл с примером конфига
writeFileSync('./connection.example.jsonc', SetToText(GetDefault(EProvider.pg), { provider: EProvider.pg }), 'utf8')

// 2) читаем конфиг, заполненный пользователем
const connection = GetFromText(readFileSync('./connection.jsonc', 'utf8'), EProvider.pg)

// connection имеет тип TConnPg, intellisense знает все поля
console.log(connection.host, connection.port, connection.database)
```

Сгенерированный `connection.example.jsonc`:

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

`GetDefault` заполняет логин, пароль и базу так, как выглядит сервер БД сразу после чистой установки - `postgres` / `postgres` для PostgreSQL, `sa` / `master` для MS SQL Server, `system` для Oracle, `SYSDBA` и демо-база `employee.fdb` для Firebird. Пароль всегда `123456` - это заглушка для пользователя, а не рабочий секрет.

## Api

| Функция                                      | Возвращает             | Описание                                                                             |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `GetDefault(provider)`                       | типизированный объект  | Подключение по умолчанию, заполненное как сервер БД после чистой установки.           |
| `GetFromText(text, provider?)`               | типизированный объект  | Разбирает JSONC, дописывает недостающие поля, проверяет. Кидает ошибку, если конфиг неверный. |
| `SetToText(connection, options?)`            | строка JSONC           | Сериализует подключение с комментариями. Значения не проверяются.                     |

Типы: `EProvider`, `TConnection` (объединение всех), `TConnMssql`, `TConnPg`, `TConnOra`, `TConnFb`, `TConnectionByProvider`.
Схемы typebox, если нужно встроить подключение в свой конфиг: `SConnection`, `SConnMssql`, `SConnPg`, `SConnOra`, `SConnFb`.

### Как связаны "kind" и "provider"

Свойство `kind` говорит, какая БД описана, провайдер - какая БД ожидается: `GetFromText` принимает его вторым аргументом, `SetToText` - как `options.provider`. Правила одинаковые:

| kind внутри | провайдер | результат                                    |
| ----------- | --------- | -------------------------------------------- |
| есть        | не указан | используется `kind`                          |
| есть        | указан    | должен совпадать с `kind`, иначе ошибка       |
| нет         | указан    | используется провайдер                       |
| нет         | не указан | ошибка                                       |

Провайдер заодно уточняет generic, то есть даёт точный intellisense - `GetFromText(text, EProvider.fb)` вернёт `TConnFb`, а `GetFromText(text)` вернёт объединение `TConnection`. То же и в `SetToText`: с `{ provider: EProvider.fb }` аргумент connection проверяется как `TConnFb`.

Попадёт ли свойство `kind` в результат `SetToText`, решает `options.hasKind`:

| hasKind                     | провайдер известен       | провайдер неизвестен                                       |
| --------------------------- | ------------------------ | ---------------------------------------------------------- |
| `allow`                     | `kind` пишется           | ошибка                                                     |
| `optional` (по умолчанию)   | `kind` пишется           | подключение пишется как есть, без комментариев и умолчаний |
| `deny`                      | `kind` не пишется        | подключение пишется как есть, без комментариев и умолчаний |

Провайдер неизвестен только тогда, когда `kind` нет внутри подключения и не указан `options.provider`. TypeScript до этого не доведёт - перегрузка без `provider` ждёт `TConnection`, где `kind` обязателен, так что случай возможен только из нетипизированного javascript.

## Сервис только с одной БД

Если сервис всегда работает, например, с Firebird, свойство `kind` в файле конфига только мешает. Записываем с `{ hasKind: 'deny' }`, читаем с указанием провайдера:

```TypeScript
import { EProvider, GetDefault, GetFromText, SetToText } from 'vv-config-conn'

const text = SetToText(GetDefault(EProvider.pg), { provider: EProvider.pg, hasKind: 'deny' })

const connection = GetFromText(text, EProvider.pg) // TConnPg, в объекте "kind" восстановлен
```

Текст без `kind`:

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

## Сервис с любой БД

Не указываем `provider` - БД определяется по `kind` внутри конфига, а `switch` сужает тип:

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

## Ошибки

`GetFromText` кидает ошибку на неизвестный или неожиданный `kind` и на любую ошибку проверки, все сообщения собраны в один текст:

```TypeScript
GetFromText(`{ "kind": "pg", "host": "localhost" }`)
// Error: on read connection "pg": path=/database message=Expected string; path=/user message=Expected string; path=/password message=Expected string

GetFromText(`{ "kind": "pg", "host": "localhost" }`, EProvider.fb)
// Error: on read connection: "kind" = "pg", but provider "fb" expected

GetFromText(`{ "host": "localhost" }`)
// Error: on read connection: property "kind" not found, allowed values: mssql | ora | pg | fb
```

`SetToText` проверяет только `kind` - подключение с незаполненными (`null`) полями это нормальный пример конфига, а типы значений уже проверил TypeScript.

## Подключения

<details>
<summary>mssql - Microsoft SQL Server</summary>

`GetDefault(EProvider.mssql)` использует авторизацию SQL Server:

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

Для доменной авторизации Windows укажите в `auth.kind` значение `ntlm`:

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

## Лицензия

_MIT_
