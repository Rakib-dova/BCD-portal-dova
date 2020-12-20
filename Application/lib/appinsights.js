
const appInsights = require('applicationinsights');


if(process.env.LOCALLY_HOSTED != "true"){
    appInsights.setup().setAutoCollectConsole(true,true);
    appInsights.start();
}


module.exports = appInsights;