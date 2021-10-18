const express = require("express");
const app = express();

// セキュリティ
const helmet = require("helmet");

const path = require("path");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));

app.use(
  helmet({
    frameguard: false,
  })
);
// セキュリティ helmet.jsの仕様を確認のこと
// https://github.com/helmetjs/helmet

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'"],
      "form-action": ["'self'"], // form-actionは自己ドメインに制限
      // bulma-toast、fontawasom、googlefontsを使うためstyle-srcを一部許可
      // prettier-ignore
      'style-src': [
        "'self' https://use.fontawesome.com https://fonts.googleapis.com"
      ],
      "script-src": ["'self'"],
      "object-src": ["'self'"],
      "frame-ancestors": [`'self' https://${process.env.TS_HOST}`],
    },
  })
);

app.use("/service/bconnection", require("./routes/info").router);

//Listen
console.log("test");
app.listen(3000, function () {
  console.log("Start Express on port 3000.");
});

app.set("port", process.env.PORT || 3000);

module.exports = app;
