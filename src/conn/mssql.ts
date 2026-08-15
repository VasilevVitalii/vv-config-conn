import { Type, type Static } from 'vv-config-jsonc'

const SAuthSql = Type.Object({
	kind:     Type.Literal('mssql'),
	user:     Type.String({ description: 'SQL Server login' }),
	password: Type.String({ description: 'Password' }),
})

const SAuthNtlm = Type.Object({
	kind:     Type.Literal('ntlm'),
	domain:   Type.String({ description: 'Windows domain (e.g. CORP)' }),
	user:     Type.String({ description: 'Windows username' }),
	password: Type.String({ description: 'Windows password' }),
})

export const SConnMssql = Type.Object({
	kind:                   Type.Literal('mssql'),
	server:                 Type.String({ description: 'MSSQL server host', default: 'localhost' }),
	port:                   Type.Optional(Type.Integer({ description: 'MSSQL port', default: 1433 })),
	database:               Type.Optional(Type.String({ description: 'Database name. Omit or leave null to use the default database for the login.' })),
	auth:                   Type.Union([SAuthSql, SAuthNtlm], { description: 'Authentication. kind: mssql = SQL Server auth, kind: ntlm = Windows domain (NTLM)' }),
	trustServerCertificate: Type.Optional(Type.Boolean({ description: 'Trust self-signed certificate', default: true })),
	encrypt:                Type.Optional(Type.Boolean({ description: 'Encrypt connection', default: false })),
})

export type TConnMssql = Static<typeof SConnMssql>
