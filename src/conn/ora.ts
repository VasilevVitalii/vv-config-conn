import { Type, type Static } from 'vv-config-jsonc'

export const SConnOra = Type.Object({
	kind:      Type.Literal('ora'),
	host:      Type.String({ description: 'Oracle host', default: 'localhost' }),
	port:      Type.Optional(Type.Integer({ description: 'Oracle port', default: 1521 })),
	service:   Type.String({ description: 'Oracle service name, e.g. XEPDB1 or ORCL', default: 'XEPDB1' }),
	user:      Type.String({ description: 'Login' }),
	password:  Type.String({ description: 'Password' }),
	privilege: Type.Optional(
		Type.Union(
			[Type.Literal('SYSDBA'), Type.Literal('SYSOPER'), Type.Literal('SYSASM'), Type.Literal('SYSBACKUP'), Type.Literal('SYSDG'), Type.Literal('SYSKM'), Type.Literal('SYSRAC')],
			{ description: 'Connection privilege. Required when connecting as SYS. Allowed values: SYSDBA | SYSOPER | SYSASM | SYSBACKUP | SYSDG | SYSKM | SYSRAC', default: null },
		),
	),
})

export type TConnOra = Static<typeof SConnOra>
