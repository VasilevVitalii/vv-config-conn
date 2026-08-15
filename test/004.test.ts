import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EProvider, GetDefault, GetFromText, SetToText, type TConnectionByProvider } from '../src/index'

const FILLED: { [P in EProvider]: TConnectionByProvider[P] } = {
	[EProvider.mssql]: { kind: EProvider.mssql, server: 'srv', port: 1433, database: 'test', auth: { kind: 'ntlm', domain: 'CORP', user: 'u', password: 'p' }, trustServerCertificate: true, encrypt: false },
	[EProvider.ora]: { kind: EProvider.ora, host: 'ora.local', port: 1521, service: 'ORCL', user: 'sys', password: 'p', privilege: 'SYSDBA' },
	[EProvider.pg]: { kind: EProvider.pg, host: 'pg.local', port: 6432, database: 'test', user: 'postgres', password: 'p', ssl: true },
	[EProvider.fb]: { kind: EProvider.fb, host: 'fb.local', port: 3050, database: '/data/my.fdb', user: 'SYSDBA', password: 'p', charset: 'WIN1251' },
}

describe('round trip, object -> text -> object', () => {
	it('keeps connection of every provider', () => {
		for (const provider of Object.values(EProvider)) {
			const connection = FILLED[provider]
			assert.deepEqual(GetFromText(SetToText(connection)), connection, provider)
		}
	})

	it('keeps connection when "kind" is not written', () => {
		for (const provider of Object.values(EProvider)) {
			const connection = FILLED[provider]
			const text = SetToText(connection, { hasKind: 'deny' })
			assert.deepEqual(GetFromText(text, provider), connection, provider)
		}
	})

	it('keeps connection when provider is set instead of "kind"', () => {
		const { kind, ...connection } = FILLED[EProvider.pg]
		assert.deepEqual(GetFromText(SetToText(connection, { provider: EProvider.pg })), FILLED[EProvider.pg])
	})
})

describe('round trip, text -> object -> text', () => {
	it('does not change generated text of every provider', () => {
		for (const provider of Object.values(EProvider)) {
			const text = SetToText(FILLED[provider])
			assert.equal(SetToText(GetFromText(text)), text, provider)
		}
	})

	it('does not change generated text of default connection', () => {
		for (const provider of Object.values(EProvider)) {
			const text = SetToText(GetDefault(provider))
			assert.equal(SetToText(GetDefault(provider)), text, provider)
		}
	})

	it('completes text of user, keeping his values', () => {
		const text = SetToText(GetFromText(`{ "kind": "pg", "host": "db.local", "database": "test", "user": "postgres", "password": "123" }`))
		assert.equal(SetToText(GetFromText(text)), text)
		assert.ok(text.includes('"host": "db.local"'))
		assert.ok(text.includes('"port": 5432'))
	})
})

describe('example config for service', () => {
	it('service with one database writes and reads config without "kind"', () => {
		const example = SetToText(GetDefault(EProvider.fb), { provider: EProvider.fb, hasKind: 'deny' })
		assert.ok(!example.includes('"kind"'))

		const edited = example.replace('/var/lib/firebird/data/employee.fdb', '/data/my.fdb').replace('"password": "123456"', '"password": "p"')
		const connection = GetFromText(edited, EProvider.fb)

		assert.equal(connection.kind, EProvider.fb)
		assert.equal(connection.database, '/data/my.fdb')
		assert.equal(connection.user, 'SYSDBA')
	})

	it('service with any database writes and reads config with "kind"', () => {
		const example = SetToText(GetDefault(EProvider.ora), { provider: EProvider.ora })
		const edited = example.replace('"user": "system"', '"user": "scott"').replace('"password": "123456"', '"password": "tiger"')
		const connection = GetFromText(edited)

		assert.equal(connection.kind, EProvider.ora)
		assert.equal(connection.kind === EProvider.ora && connection.user, 'scott')
	})

	it('default connection is valid and can be read back', () => {
		for (const provider of Object.values(EProvider)) {
			const connection = GetDefault(provider)
			assert.deepEqual(GetFromText(SetToText(connection)), connection, provider)
		}
	})
})
