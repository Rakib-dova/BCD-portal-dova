const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const authToken = Buffer.from('BCDdev.PortalAppL' + ':' + '40ff49b9-ce2a-4db6-ae73-e118d4a96833').toString('base64');
const jwt = require('jwt-simple');

const parseIdToken = (token) => {
    const decoded = Buffer.from(token.split('.')[1], 'base64').toString();
	const { companyId, sub: email, userId } = JSON.parse(decoded);
	return { companyId, email, userId };
};

const oauthStrategy = new OAuth2Strategy({
    authorizationURL: 'https://api-sandbox.tradeshift.com/tradeshift/auth/login',
    tokenURL: 'https://api-sandbox.tradeshift.com/tradeshift/auth/token',
    clientID: 'BCDdev.PortalAppL',
    clientSecret: '40ff49b9-ce2a-4db6-ae73-e118d4a96833',
    callbackURL: "https://localhost:3000/auth/callback/"
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
    console.log("serialize")
    done(null, jwt.encode(user, '40ff49b9-ce2a-4db6-ae73-e118d4a96833'));
});
  
passport.deserializeUser(function(user, done){
    console.log("deserialize")
    done(null, jwt.decode(user, '40ff49b9-ce2a-4db6-ae73-e118d4a96833'));
});

/* Setting custom Authorization header */
oauthStrategy._oauth2.setAuthMethod('Basic');
oauthStrategy._oauth2._customHeaders = { Authorization: oauthStrategy._oauth2.buildAuthHeader(authToken)};
passport.use('tradeshift', oauthStrategy);

module.exports = passport;