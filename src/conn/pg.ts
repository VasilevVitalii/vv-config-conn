import { Type, type Static } from 'vv-config-jsonc'

export const SConnPg = Type.Object({
	kind:     Type.Literal('pg'),
	host:     Type.String({ description: 'PostgreSQL host', default: 'localhost' }),
	port:     Type.Optional(Type.Integer({ description: 'PostgreSQL port', default: 5432 })),
	database: Type.String({ description: 'Database name' }),
	user:     Type.String({ description: 'Login' }),
	password: Type.String({ description: 'Password' }),
	ssl:      Type.Optional(Type.Boolean({ description: 'Enable SSL', default: false })),
})

export type TConnPg = Static<typeof SConnPg>
