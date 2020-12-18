const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const authToken = Buffer.from(process.env.TS_CLIENT_ID + ':' + process.env.TS_CLIENT_SECRET).toString('base64');
const jwt = require('jwt-simple');

const parseIdToken = (token) => {
    const decoded = Buffer.from(token.split('.')[1], 'base64').toString();
	const { companyId, sub: email, userId } = JSON.parse(decoded);
	return { companyId, email, userId };
};

const oauthStrategy = new OAuth2Strategy({
    authorizationURL: `https://${process.env.TS_API_HOST}/tradeshift/auth/login`,
    tokenURL: `https://${process.env.TS_API_HOST}/tradeshift/auth/token`,
    clientID: process.env.TS_CLIENT_ID,
    clientSecret: process.env.TS_CLIENT_SECRET,
    callbackURL: `https://${process.env.HOST}/auth/callback/`
    }, (accessToken, refreshToken, params, profile, done) => {

        const { companyId, email, userId } = parseIdToken(params.id_token);
        const user = {
            companyId,
            email,
            userId,
            accessToken,
            refreshToken,
        };
        /*
        User.findOrCreate({ exampleId: profile.id }, function (err, user) {
            return cb(err, user);
        });*/
        return done(null, user);
    }
);

passport.serializeUser(function(user, done){
    done(null, jwt.encode(user, process.env.TS_CLIENT_SECRET));
});
  
passport.deserializeUser(function(user, done){
    done(null, jwt.decode(user, process.env.TS_CLIENT_SECRET));
});

/* Setting custom Authorization header */
oauthStrategy._oauth2.setAuthMethod('Basic');
oauthStrategy._oauth2._customHeaders = { Authorization: oauthStrategy._oauth2.buildAuthHeader(authToken)};
passport.use('tradeshift', oauthStrategy);

module.exports = passport;