function env_config( config ) {


config.endpoint = '@config_endpoint@'
config.key = '@config_key@'
config.BLOB_ACCOUNT='@config_BLOB_ACCOUNT@'
config.BLOB_ACCOUNT_KEY='@config_BLOB_ACCOUNT_KEY@'
config.BLOB_CONTAINER_NAME='@config_BLOB_CONTAINER_NAME@'
config.database = {
  id: 'dev-orc-data'
}

config.aws = {
	options: {
		region: "us-east-1",
		accessKeyId: "@aws_access_id@",
		secretAccessKey: "@aws_access_secret@",
		apiVersion: "latest"
	},
}
config.aws.cognito = {

	cognito_app_client_id: '@cognito_app_client_id@,
	cognito_pool_id: '@cognito_pool_id@',
	testuser_username: '@testuser_username@',
    testuser_password: '@testuser_password@',
}
config.aws.cognito.host = {
	cognito_host: 'https://odyssey-dev-2.auth.us-east-1.amazoncognito.com',
	cognito_host_keys: `https://cognito-idp.${config.aws.options.region}.amazonaws.com/${config.aws.cognito.cognito_pool_id}/.well-known/jwks.json`,

}

config.odyssey_host = '@config_frontend_service@',

// TODO: Obviously, this needs to be removed and stored in a secure vault.
config.permissions = {
	aud: 'odyssey-dev-2-clients',
	iss: 'odyssey-dev-2',
	private_key : {
		alg : 'RS256',
		pkcs8 : 
`-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7CJV3Qrgdk7te
LJzUs5Y3SlOjhwJTLi176JlF3H/cS+Dl/qbSpfvVJFAitcom/RMgrANS+dxNH/qv
ynSD4kEmujznB6hchPfsdBTyvfhyiFHUgzn2s7kRAFyrvluSU+F1AM0Ts3j0HBaa
aSwV5UwIAId5Y29zcQaw8qSCHkTUomZAb+NSEYqYiAfbNMeCl8AD7uLFCPxpk54S
NfiAW2SccD1Do5XD0a6zpoNvspsj9DQRyj5e2FhCCiAoC85XniQwbU9JTnISbL8n
0T9yzmYh+2h9x0YIZBI7bN0ByGYYfXuYK3pe7b4KANOsy+2Mn69niR7mRfy/LnS3
1b+F0O91AgMBAAECggEAZS8EpWt77cxhflZGVi/94VWdoAdHM7b0tmcknI3owkZu
mh7FI4rWjf3COLT+c09QjMliVv6Dt1nIplex5zN9KbVxg086PytUcSBvwM8TXOrw
0jZYImYihdcbS3KFWcl1XHYdfD4I/o8/jzO8vO+6zU1z/TDVN6/6/bmXVCmJ9Tol
pmEOS+7L1nXFe3+VD05n/6EjHahGpvbp8NJLALhx9WKOtNl1cpXgV665Wxtj7ZIX
lJgLQtT0q2CQBWiDfdVQJkdq/+BS9X01CuhaYhsQddT1z+vbVZZLaTaSntSAfOpx
RARmQRli/kUHw5oXELRXGOstWX6hUL3cl6sEhgUp4QKBgQDfT1lgNM8BjjHfqAf+
tePjteUrv73Ce0071XpKuGvNf15oL1+l3Jj84b/WJtr8sK05DT9p0OHrG0TnUOs5
FJ2rAUVMuX9QyqzjJABvvyWFFBE+fMiWeOicsYA2d8dYmIYiRP4rnoQSTW2qweSz
jg6p4G5uXSiP8hZlrouicKHvHQKBgQDWacH6UtH/30i0r4giEt4EtcXSuhcg9B6Q
VZWI3OaYkOrmMElhEYuUDaZKyOfMtjmQXCZ/EqhtgpOMxU2s4JE4pNDv29Z5b4wV
zmr1PqKWBxh4oL3o2BYVnnlON0sWsD4QfT0EbaBDhtrQpo5H1IiTO92RGar7kza8
YzVNj3TaOQKBgHnF8X0PDxtQCU5neQSi94TDOhdjVf1p87H/NdLtQowrOrYhr0zp
QNwV1uDXC2/kgHGuEbiIWco1cpuZeswDu/72kG3Ice8CtsieZ0aIu9MYIFctAM1d
Xauk97+8DY74jZy+dsQeivLYGkeVuDtZ6hEk+9NfJbFpWGFWj3qjZQrZAoGBAJZm
evXvsHTOmD5+PnzARVKCezB07pJkCyhtkEX/xhVQ2iT7zA019HW3GWWuBcM4M6rK
qQpL+S9P/9Yn9HOG1vcnzZPi3lAyac5GDArZk8yvT4AWKQCyytMBZc/yw0439GE2
qF151IhpiQYBPx6tu9uji6kjmyd7PVLqOFKehXYpAoGBAKXrKm/35LqzBTCvM+p4
Lzy7NR6foaJ+OocbKFlN7vwHiov0CNyvpq5AORTkd+8dLo50x18KWCfb0LhG17qw
XTa+ghZQtuYF+ihC2KJwbkfsxIkc3CdvWih6SegTd3w/42uv00kex9fPoml4EgMu
bjJk528kRZcmsgwC8Ffqx3Oj
-----END PRIVATE KEY-----`,
	},
	public_keys: {
		kid: 'adasdfasdf',
		'adasdfasdf': { 
			alg: 'RS256',
			pem: 
`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuwiVd0K4HZO7Xiyc1LOW
N0pTo4cCUy4te+iZRdx/3Evg5f6m0qX71SRQIrXKJv0TIKwDUvncTR/6r8p0g+JB
Jro85weoXIT37HQU8r34cohR1IM59rO5EQBcq75bklPhdQDNE7N49BwWmmksFeVM
CACHeWNvc3EGsPKkgh5E1KJmQG/jUhGKmIgH2zTHgpfAA+7ixQj8aZOeEjX4gFtk
nHA9Q6OVw9Gus6aDb7KbI/Q0Eco+XthYQgogKAvOV54kMG1PSU5yEmy/J9E/cs5m
IftofcdGCGQSO2zdAchmGH17mCt6Xu2+CgDTrMvtjJ+vZ4ke5kX8vy50t9W/hdDv
dQIDAQAB
-----END PUBLIC KEY-----`
		}
	}
	
}
}

module.exports = env_config
