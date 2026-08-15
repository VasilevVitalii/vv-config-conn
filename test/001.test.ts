import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EProvider, GetDefault } from '../src/index'

describe('GetDefault', () => {
	it('sets "kind" of asked provider', () => {
		for (const provider of Object.values(EProvider)) {
			assert.equal(GetDefault(provider).kind, provider)
		}
	})

	it('fills all fields like database server after clean install', () => {
		assert.deepEqual(GetDefault(EProvider.pg), {
			kind: 'pg',
			host: 'localhost',
			port: 5432,
			database: 'postgres',
			user: 'postgres',
			password: '123456',
			ssl: false,
		})
	})

	it('fills login and password of every provider', () => {
		assert.equal(GetDefault(EProvider.mssql).auth.user, 'sa')
		assert.equal(GetDefault(EProvider.mssql).database, 'master')
		assert.equal(GetDefault(EProvider.ora).user, 'system')
		assert.equal(GetDefault(EProvider.fb).user, 'SYSDBA')
		assert.equal(GetDefault(EProvider.fb).database, '/var/lib/firebird/data/employee.fdb')

		for (const provider of Object.values(EProvider)) {
			const connection = GetDefault(provider)
			const password = connection.kind === EProvider.mssql ? connection.auth.password : connection.password
			assert.equal(password, '123456', provider)
		}
	})

	it('fills default values of all providers', () => {
		const mssql = GetDefault(EProvider.mssql)
		assert.equal(mssql.server, 'localhost')
		assert.equal(mssql.port, 1433)
		assert.equal(mssql.trustServerCertificate, true)
		assert.equal(mssql.encrypt, false)

		const ora = GetDefault(EProvider.ora)
		assert.equal(ora.host, 'localhost')
		assert.equal(ora.port, 1521)
		assert.equal(ora.service, 'XEPDB1')

		const fb = GetDefault(EProvider.fb)
		assert.equal(fb.host, 'localhost')
		assert.equal(fb.port, 3050)
		assert.equal(fb.user, 'SYSDBA')
		assert.equal(fb.charset, 'UTF8')
	})

	it('uses sql authentication for mssql', () => {
		assert.equal(GetDefault(EProvider.mssql).auth.kind, 'mssql')
	})

	it('returns new object on every call', () => {
		const first = GetDefault(EProvider.pg)
		const second = GetDefault(EProvider.pg)
		assert.notEqual(first, second)

		first.host = 'changed'
		assert.equal(second.host, 'localhost')
	})
})
