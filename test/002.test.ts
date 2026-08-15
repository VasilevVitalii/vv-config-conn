import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EProvider, GetFromText } from '../src/index'

const PG_FULL = `{ "kind": "pg", "host": "db.local", "database": "test", "user": "postgres", "password": "123" }`
const PG_NO_KIND = `{ "host": "db.local", "database": "test", "user": "postgres", "password": "123" }`

describe('GetFromText, choice of provider', () => {
	it('takes provider from "kind" when argument is not set', () => {
		assert.equal(GetFromText(PG_FULL).kind, EProvider.pg)
	})

	it('takes provider from argument when "kind" is not inside', () => {
		assert.equal(GetFromText(PG_NO_KIND, EProvider.pg).kind, EProvider.pg)
	})

	it('allows equal "kind" and argument', () => {
		assert.equal(GetFromText(PG_FULL, EProvider.pg).kind, EProvider.pg)
	})

	it('throws when "kind" and argument are not equal', () => {
		assert.throws(() => GetFromText(PG_FULL, EProvider.fb), /"kind" = "pg", but provider "fb" expected/)
	})

	it('throws when "kind" and argument are both absent', () => {
		assert.throws(() => GetFromText(PG_NO_KIND), /property "kind" not found/)
	})

	it('throws on unknown "kind"', () => {
		assert.throws(() => GetFromText(`{ "kind": "mysql" }`), /unknown "kind" = "mysql"/)
	})

	it('throws when text is not an object', () => {
		assert.throws(() => GetFromText(`[]`, EProvider.pg), /expected object with database connection/)
		assert.throws(() => GetFromText(``, EProvider.pg), /expected object with database connection/)
	})
})

describe('GetFromText, jsonc', () => {
	it('reads comments and trailing comma', () => {
		const connection = GetFromText(
			`{
			//my database
			"kind": "pg",
			"host": "db.local",
			"database": "test",
			"user": "postgres",
			"password": "123", //filled by admin
		}`,
			EProvider.pg,
		)
		assert.equal(connection.host, 'db.local')
	})

	it('adds missing fields with default values', () => {
		const connection = GetFromText(PG_FULL, EProvider.pg)
		assert.equal(connection.port, 5432)
		assert.equal(connection.ssl, false)
	})

	it('keeps values from text', () => {
		const connection = GetFromText(`{ "kind": "pg", "host": "db.local", "port": 6432, "database": "test", "user": "postgres", "password": "123", "ssl": true }`)
		assert.deepEqual(connection, { kind: 'pg', host: 'db.local', port: 6432, database: 'test', user: 'postgres', password: '123', ssl: true })
	})
})

describe('GetFromText, validation', () => {
	it('throws when required field is not filled', () => {
		assert.throws(() => GetFromText(`{ "kind": "pg", "host": "db.local" }`), /path=\/database message=Expected string/)
	})

	it('throws when value has wrong type', () => {
		assert.throws(() => GetFromText(`{ "kind": "pg", "host": "db.local", "port": "6432", "database": "d", "user": "u", "password": "p" }`), /path=\/port/)
	})

	it('collects all errors in one message', () => {
		assert.throws(() => GetFromText(`{ "kind": "pg", "host": "db.local" }`), /database.+user.+password/s)
	})

	it('throws on value outside of allowed list', () => {
		assert.throws(() => GetFromText(`{ "kind": "fb", "host": "h", "database": "d", "user": "u", "password": "p", "charset": "KOI8" }`), /path=\/charset/)
	})
})

describe('GetFromText, providers', () => {
	it('reads mssql with sql authentication', () => {
		const connection = GetFromText(`{ "kind": "mssql", "server": "srv", "auth": { "kind": "mssql", "user": "sa", "password": "123" } }`)
		assert.equal(connection.kind, EProvider.mssql)
		assert.equal(connection.kind === EProvider.mssql && connection.auth.kind, 'mssql')
	})

	it('reads mssql with ntlm authentication', () => {
		const connection = GetFromText(`{ "server": "srv", "auth": { "kind": "ntlm", "domain": "CORP", "user": "u", "password": "p" } }`, EProvider.mssql)
		assert.equal(connection.auth.kind, 'ntlm')
		assert.equal(connection.auth.kind === 'ntlm' && connection.auth.domain, 'CORP')
	})

	it('throws on unknown kind of mssql authentication', () => {
		assert.throws(() => GetFromText(`{ "server": "srv", "auth": { "kind": "kerberos", "user": "u", "password": "p" } }`, EProvider.mssql), /path=\/auth/)
	})

	it('reads ora with privilege', () => {
		const connection = GetFromText(`{ "host": "h", "service": "ORCL", "user": "sys", "password": "p", "privilege": "SYSDBA" }`, EProvider.ora)
		assert.equal(connection.privilege, 'SYSDBA')
	})

	it('reads fb with charset', () => {
		const connection = GetFromText(`{ "host": "h", "database": "/data/my.fdb", "user": "SYSDBA", "password": "p", "charset": "WIN1251" }`, EProvider.fb)
		assert.equal(connection.charset, 'WIN1251')
	})
})
