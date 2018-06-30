'use strict';

/**
 *  @fileOverview This file handles all of the routing in express, calling functions in the modules in `api/controllers/*`.
 *  @author Charlie Britton
 */

/* Include controller files */
const renderer = require('./controllers/renderer.js')

/* Exposes internal express routing to server.js */
module.exports = (app) => {

  app.route("/")
    .get(renderer.baseUrl)

  app.route("/site/:siteUrl(.+)")
    .get(renderer.renderSite)

}