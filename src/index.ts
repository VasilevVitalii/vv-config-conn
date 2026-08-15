import { parse as jsoncParse } from 'jsonc-parser'
import { vvConfigJsonc, Type } from 'vv-config-jsonc'
import { SConnMssql, type TConnMssql } from './conn/mssql'
import { SConnOra, type TConnOra } from './conn/ora'
import { SConnPg, type TConnPg } from './conn/pg'
import { SConnFb, type TConnFb } from './conn/fb'

export { SConnMssql, type TConnMssql } from './conn/mssql'
export { SConnOra, type TConnOra } from './conn/ora'
export { SConnPg, type TConnPg } from './conn/pg'
export { SConnFb, type TConnFb } from './conn/fb'

export const EProvider = {
	mssql: 'mssql',
	ora: 'ora',
	pg: 'pg',
	fb: 'fb',
} as const

export type EProvider = (typeof EProvider)[keyof typeof EProvider]

export type TConnectionByProvider = {
	[EProvider.mssql]: TConnMssql
	[EProvider.ora]: TConnOra
	[EProvider.pg]: TConnPg
	[EProvider.fb]: TConnFb
}

export type TConnection = TConnectionByProvider[EProvider]

export type TConnectionInput<P extends EProvider> = TConnectionByProvider[P] | Omit<TConnectionByProvider[P], 'kind'>

export const SConnection = Type.Union([SConnMssql, SConnOra, SConnPg, SConnFb], {
	description: 'Database connection. Set "kind" to one of: mssql | ora | pg | fb',
})

const SByProvider = {
	[EProvider.mssql]: SConnMssql,
	[EProvider.ora]: SConnOra,
	[EProvider.pg]: SConnPg,
	[EProvider.fb]: SConnFb,
}

//NOTE used for write config without "kind" - property is dropped from schema, not from ready text,
//because removing it from text kills line comment of next property
const SByProviderWithoutKind = {
	[EProvider.mssql]: Type.Omit(SConnMssql, ['kind']),
	[EProvider.ora]: Type.Omit(SConnOra, ['kind']),
	[EProvider.pg]: Type.Omit(SConnPg, ['kind']),
	[EProvider.fb]: Type.Omit(SConnFb, ['kind']),
}

function isProvider(value: unknown): value is EProvider {
	return typeof value === 'string' && Object.values(EProvider).includes(value as EProvider)
}

/**
 * find out what provider the raw (parsed, not validated) connection belongs to
 * - kind inside + provider not set  -> kind
 * - kind inside + provider set      -> must be equal, otherwise error
 * - no kind + provider set          -> provider
 * - no kind + provider not set      -> undefined
 */
function findProvider(raw: unknown, provider: EProvider | undefined, source: string): EProvider | undefined {
	if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
		throw new Error(`${source}: expected object with database connection`)
	}

	const kind = (raw as Record<string, unknown>)['kind']

	if (kind === undefined || kind === null) {
		return provider
	}

	if (!isProvider(kind)) {
		throw new Error(`${source}: unknown "kind" = ${JSON.stringify(kind)}, allowed values: ${Object.values(EProvider).join(' | ')}`)
	}

	if (provider !== undefined && kind !== provider) {
		throw new Error(`${source}: "kind" = "${kind}", but provider "${provider}" expected`)
	}

	return kind
}

/** same as findProvider, but provider must be found */
function resolveProvider(raw: unknown, provider: EProvider | undefined, source: string): EProvider {
	const result = findProvider(raw, provider, source)
	if (result === undefined) {
		throw new Error(`${source}: property "kind" not found, allowed values: ${Object.values(EProvider).join(' | ')}`)
	}
	return result
}

const DEFAULT_PASSWORD = '123456'

/**
 * state of database server after clean install - used only in GetDefault
 * NOTE these values are not defaults of schema on purpose: on read a forgotten field must raise error,
 * not silently turn into "postgres" with password "123456"
 */
const DEFAULT_AFTER_INSTALL: { [P in EProvider]: Partial<TConnectionByProvider[P]> } = {
	[EProvider.mssql]: { database: 'master', auth: { kind: 'mssql', user: 'sa', password: DEFAULT_PASSWORD } },
	[EProvider.ora]: { user: 'system', password: DEFAULT_PASSWORD },
	[EProvider.pg]: { database: 'postgres', user: 'postgres', password: DEFAULT_PASSWORD },
	[EProvider.fb]: { database: '/var/lib/firebird/data/employee.fdb', user: 'SYSDBA', password: DEFAULT_PASSWORD },
}

/** returns default connection to database as typed object, filled like database server after clean install */
export function GetDefault<P extends EProvider>(provider: P): TConnectionByProvider[P] {
	const connection = new vvConfigJsonc(SByProvider[provider]).getDefault().object as TConnectionByProvider[P]
	return { ...connection, ...DEFAULT_AFTER_INSTALL[provider] }
}

/**
 * returns connection to database as typed object
 * @param text JSONC string
 * @param provider if set - "kind" inside text is optional, but must be equal to provider when present
 * @throws when text is not a valid connection
 */
export function GetFromText<P extends EProvider>(text: string, provider: P): TConnectionByProvider[P]
export function GetFromText(text: string, provider?: undefined): TConnection
export function GetFromText(text: string, provider?: EProvider): TConnection {
	const raw = text && text.trim().length > 0 ? jsoncParse(text) : undefined
	const kind = resolveProvider(raw, provider, 'on read connection')

	const res = new vvConfigJsonc(SByProvider[kind]).getConfig(text)
	if (res.errors.length > 0) {
		throw new Error(`on read connection "${kind}": ${res.errors.join('; ')}`)
	}

	return res.config as TConnection
}

/**
 * how to write property "kind" in result of SetToText
 * - allow    - always write, error when provider is unknown
 * - deny     - never write, for service that works with only one database - such config can be read back by GetFromText(text, provider)
 * - optional - write when provider is known, i.e. "kind" is inside connection or provider is set in options (default)
 */
export type THasKind = 'allow' | 'deny' | 'optional'

export type TSetToTextOptions<P extends EProvider = EProvider> = {
	/**
	 * if set - "kind" inside connection is optional, but must be equal to provider when present
	 * also makes type of connection precise
	 */
	provider?: P
	/** how to write property "kind", default "optional" */
	hasKind?: THasKind
}

/**
 * returns connection to database as JSONC string (with comments and missing fields)
 * values are not validated - not filled (null) fields are allowed, so result of GetDefault can be written as example config
 * @param options set { provider } when connection has no "kind", set { hasKind: 'deny' } to write config without "kind"
 * @throws when connection has wrong "kind", or when provider is unknown and hasKind is "allow"
 */
export function SetToText<P extends EProvider>(connection: TConnectionInput<P>, options: TSetToTextOptions<P> & { provider: P }): string
export function SetToText(connection: TConnection, options?: { hasKind?: THasKind }): string
export function SetToText(connection: object, options?: TSetToTextOptions): string {
	const hasKind = options?.hasKind ?? 'optional'
	const source = 'on write connection'
	const provider = hasKind === 'allow' ? resolveProvider(connection, options?.provider, source) : findProvider(connection, options?.provider, source)

	const { kind: kindInside, ...rest } = connection as Record<string, unknown>

	//NOTE provider unknown - there is no schema, so write connection as is, without comments and default values
	if (provider === undefined) {
		return `${JSON.stringify(rest, null, 4)}\n`
	}

	const writeKind = hasKind !== 'deny'
	const connectionText = JSON.stringify(writeKind ? { kind: provider, ...rest } : rest, null, 4)
	const schema = writeKind ? SByProvider[provider] : SByProviderWithoutKind[provider]

	//NOTE json must be multiline - vv-config-jsonc places comments by line start, on one-line json all comments move before "{"
	return new vvConfigJsonc(schema).getConfig(connectionText).text
}
