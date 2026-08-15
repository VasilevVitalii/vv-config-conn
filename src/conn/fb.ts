import { Type, type Static } from 'vv-config-jsonc'

export const SConnFb = Type.Object({
	kind:     Type.Literal('fb'),
	host:     Type.String({ description: 'Firebird host', default: 'localhost' }),
	port:     Type.Optional(Type.Integer({ description: 'Firebird port', default: 3050 })),
	database: Type.String({ description: 'Path to .fdb file on the server, e.g. /var/lib/firebird/data/mydb.fdb' }),
	user:     Type.String({ description: 'Login', default: 'SYSDBA' }),
	password: Type.String({ description: 'Password' }),
	charset:  Type.Optional(
		Type.Union([Type.Literal('UTF8'), Type.Literal('WIN1251')], {
			description: 'Connection charset. Set WIN1251 for legacy Firebird databases where text columns have no explicit charset (NONE) and data is stored in Windows-1251 encoding.',
			default: 'UTF8',
		}),
	),
})

export type TConnFb = Static<typeof SConnFb>
