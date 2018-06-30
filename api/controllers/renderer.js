'use strict';

/**
 * @fileOverview This file handles the rendering of the parsed HTML.
 * @author Charlie Britton
 */

/**
 * Renders the homepage stored at `public/pages/homepage.pug` if the URL of the request is `/`.
 */
exports.baseUrl = (req, res) => {
  res.render('homepage', {})
}

/**
 * Calls the parser for the rendered HTML of the url supplied (encoded) at endpoint `/site/http`
 */
exports.renderSite = (req, res) => {
  parser((decodeURI(req.params.siteUrl)), (err, result) => {
    if (err) {
      console.log(err)
    }
    res.render(result)
  })
}