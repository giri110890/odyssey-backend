// Load config values that are derived from other config values.

// Note: there should be NO simple key:value items here - we only want items
//	that are _derived_ from simple key:value items.
//	I.e. my_path: '/here'	<-- bad, this should be in common or env specific config.
//	E.g. my_path: `/here/${AppConfig.my_variable}`	<-- good, this belongs here.

 function deriveConfig(config) {
    config.landing_page = `${config.odyssey_host}/home/`;
    config.redirectUrl = `${config.odyssey_host}/users-dashboard/user-dashboard`;
    config.aws.cognito.cognito_app_redirect_path = `${config.odyssey_host}/login`;

    config.aws.cognito.cognito_sign_up_path = `/signup?client_id=${config.aws.cognito.cognito_app_client_id}&response_type=token&scope=email+openid+phone&redirect_uri=`;
    config.aws.cognito.cognito_sign_up_url = `${config.aws.cognito.host.cognito_host}${config.aws.cognito.cognito_sign_up_path}`+ 
        encodeURIComponent(config.aws.cognito.cognito_app_redirect_path);

}

module.exports = deriveConfig;