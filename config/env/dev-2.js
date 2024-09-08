function env_config( config ) {


config.endpoint = 'https://orc-solution-staging-db.documents.azure.com:443/'
config.key = 'Z66pF9kWr8yySDCHx3eTQvtVM6CuAhjt5iUvuKDfSrZ4oVADOGvWR6zanKaZHtXfHpNKA28wSCiGACDbOxDBGw=='
config.BLOB_ACCOUNT='devproscanblobstorage'
config.BLOB_ACCOUNT_KEY='iFgv6jl05t/YxgSx/qA7ySszJEtD+UQvzjX+u5wB5cEv1FE6ZebLFbv2xxwWmVgHhZdlHXLVkJjU+AStd+fFfw=='
config.BLOB_CONTAINER_NAME='devproscanblobstoragecontainer'
config.database = {
  id: 'staging-orc-data'
}

config.aws = {
	options: {
		region: "us-east-1",
		accessKeyId: "AKIAVTHVJA2E32KSQ6N2",
		secretAccessKey: "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",
		apiVersion: "latest"
	},
}
config.aws.cognito = {
	cognito_app_client_id: '6p61f0nt696an3ornp7j6it7of',
	cognito_pool_id: 'us-east-1_l3Fj1sZne',
	testuser_username: 'naik899@gmail.com',
    testuser_password: 'Test@123',
}

config.aws.cognito.host = {
	cognito_host: 'https://odyssey-dev-2.auth.us-east-1.amazoncognito.com',
	cognito_host_keys: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_l3Fj1sZne/.well-known/jwks.json`,

}

// config.odyssey_host = "https://front-end.eastus.cloudapp.azure.com",

config.odyssey_host = "http://localhost:3000",
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
