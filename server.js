'use strict';

/**
 *  @file This file gets express to listen on the port set in `settings/settings.json` and also sets up other logic.
 *  @author Charlie Britton
 */

/* Import NPM Modules */
const express = require('express')
const app = express()
const debug = require('debug')

/* Import Local Modules */
const settings = require('./settings/settings.json')
const routing = require('./api/routes.js')

/* Setup commonly used variables: */
const PORT = process.env.PORT || settings.port || 4000

/* Execute function, sending app parameters */
routing(app)

/* Setup views */
app.set('views', './public/pages')
app.set('view engine', 'pug')

/* Set the app to listen on env.PORT, settings.port or 4000 */
app.listen(PORT, console.log(`Listening at port ${PORT}`))

module.exports = app