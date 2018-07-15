'use strict';

/**
 * @file This file handles the rendering of the parsed HTML.
 * @author Charlie Britton
 */

/* Include NPM modules other than express */
const debug = require('debug')('app:renderer')

const {
    parser
} = require('parser')

/**
 * Renders the homepage stored at `public/pages/homepage.pug` if the URL of the request is `/`.
 */
exports.baseUrl = (req, res) => {
    debug('Rendering page at /')
    res.render('homepage')
}

/**
 * Calls the parser for the rendered HTML of the url supplied (encoded) at endpoint `/site/http`
 */

// TODO get this working properly
exports.renderSite = (req, res) => {
    debug(`Rendering page at /site/${req.params.siteUrl}`)
    let url = decodeURI(req.params.siteUrl)
    debug(`Decoding ${req.params.siteUrl} to ${url}`)
    console.log()
    parser(decodeURI(req.params.siteUrl), (err, result) => {
        if (err) {
            debug(err)
        }
        res.send(result)
    })
}