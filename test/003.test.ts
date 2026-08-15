import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EProvider, GetDefault, SetToText, type TConnPg } from '../src/index'

const PG: TConnPg = { kind: EProvider.pg, host: 'db.local', port: 5432, database: 'test', user: 'postgres', password: '123', ssl: false }
const PG_NO_KIND = { host: 'db.local', port: 5432, database: 'test', user: 'postgres', password: '123', ssl: false }

/** all root properties of jsonc text, in order of appearance */
function properties(text: string): string[] {
	return [...text.matchAll(/^ {4}"([^"]+)"\s*:/gm)].map(m => m[1] as string)
}

describe('SetToText, text', () => {
	it('writes comment before every described property', () => {
		const text = SetToText(PG)
		for (const line of ['// PostgreSQL host', '// PostgreSQL port', '// Database name', '// Login', '// Password', '// Enable SSL']) {
			assert.ok(text.includes(line), `no comment ${line}`)
		}
	})

	it('writes "kind" as first property and without comment', () => {
		const text = SetToText(PG)
		assert.deepEqual(properties(text), ['kind', 'host', 'port', 'database', 'user', 'password', 'ssl'])
		assert.ok(text.startsWith('{\n    "kind": "pg",'))
	})

	it('adds missing fields with default values', () => {
		const text = SetToText({ host: 'db.local', database: 'test', user: 'postgres', password: '123' }, { provider: EProvider.pg })
		assert.ok(text.includes('"port": 5432'))
		assert.ok(text.includes('"ssl": false'))
	})

	it('writes not filled fields as null', () => {
		assert.ok(SetToText(GetDefault(EProvider.ora)).includes('"privilege": null'))
		assert.ok(SetToText({ server: 'srv', auth: { kind: 'mssql', user: 'sa', password: '123456' } }, { provider: EProvider.mssql }).includes('"database": null'))
	})

	it('ends with line break', () => {
		assert.ok(SetToText(PG).endsWith('\n'))
	})

	it('writes every provider', () => {
		for (const provider of Object.values(EProvider)) {
			const text = SetToText(GetDefault(provider))
			assert.ok(text.includes(`"kind": "${provider}"`), `no kind of ${provider}`)
		}
	})

	it('keeps nested "kind" of mssql authentication', () => {
		const text = SetToText({ server: 'srv', auth: { kind: 'ntlm', domain: 'CORP', user: 'u', password: 'p' } }, { provider: EProvider.mssql })
		assert.ok(text.includes('"kind": "ntlm"'))
		assert.ok(text.includes('// Windows domain (e.g. CORP)'))
	})
})

describe('SetToText, option hasKind', () => {
	it('writes "kind" when provider is known', () => {
		for (const hasKind of ['allow', 'optional'] as const) {
			assert.ok(SetToText(PG_NO_KIND, { provider: EProvider.pg, hasKind }).includes('"kind"'), `by provider, ${hasKind}`)
			assert.ok(SetToText(PG, { hasKind }).includes('"kind"'), `by kind inside, ${hasKind}`)
		}
	})

	it('writes "kind" by default', () => {
		assert.ok(SetToText(PG_NO_KIND, { provider: EProvider.pg }).includes('"kind"'))
		assert.ok(SetToText(PG).includes('"kind"'))
	})

	it('does not write "kind" on deny', () => {
		assert.ok(!SetToText(PG_NO_KIND, { provider: EProvider.pg, hasKind: 'deny' }).includes('"kind"'))
		assert.ok(!SetToText(PG, { hasKind: 'deny' }).includes('"kind"'))
	})

	it('keeps comments and default values on deny', () => {
		const text = SetToText({ host: 'db.local', database: 'test', user: 'postgres', password: '123' }, { provider: EProvider.pg, hasKind: 'deny' })
		assert.deepEqual(properties(text), ['host', 'database', 'user', 'password', 'port', 'ssl'])
		assert.ok(text.includes('// PostgreSQL host'))
		assert.ok(text.includes('"port": 5432'))
	})

	it('keeps nested "kind" of mssql authentication on deny', () => {
		const text = SetToText({ server: 'srv', auth: { kind: 'ntlm', domain: 'CORP', user: 'u', password: 'p' } }, { provider: EProvider.mssql, hasKind: 'deny' })
		assert.ok(!text.includes('"kind": "mssql"'))
		assert.ok(text.includes('"kind": "ntlm"'))
	})
})

describe('SetToText, unknown provider', () => {
	//NOTE typescript does not allow such calls, they are possible only from javascript
	const noKind = PG_NO_KIND as never

	it('throws on allow', () => {
		assert.throws(() => SetToText(noKind, { hasKind: 'allow' }), /property "kind" not found/)
	})

	it('writes connection as is on optional and deny', () => {
		for (const hasKind of ['optional', 'deny'] as const) {
			const text = SetToText(noKind, { hasKind })
			assert.deepEqual(JSON.parse(text), PG_NO_KIND)
			assert.ok(!text.includes('//'), `comments on ${hasKind}`)
		}
	})

	it('writes connection as is by default', () => {
		assert.deepEqual(JSON.parse(SetToText(noKind)), PG_NO_KIND)
	})
})

describe('SetToText, errors', () => {
	it('throws when "kind" and provider are not equal', () => {
		assert.throws(() => SetToText(PG as never, { provider: EProvider.fb }), /"kind" = "pg", but provider "fb" expected/)
	})

	it('throws on unknown "kind"', () => {
		assert.throws(() => SetToText({ kind: 'mysql' } as never), /unknown "kind" = "mysql"/)
	})

	it('throws when connection is not an object', () => {
		assert.throws(() => SetToText([] as never, { provider: EProvider.pg }), /expected object with database connection/)
	})

	it('does not check values', () => {
		assert.doesNotThrow(() => SetToText(GetDefault(EProvider.mssql)))
		assert.doesNotThrow(() => SetToText({ host: 'db.local' } as never, { provider: EProvider.pg }))
	})
})
