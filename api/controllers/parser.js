'use strict';

const request = require('request')
const DOMParser = require('xmldom').DOMParser;

/**
 * @fileOverview This file deals with parsing URLs and parsing them into a single, resources-less HTML string.
 * @summary Parses URLs to HTML.
 * @author Olly Britton
 * @
 */


/**
 * @description This function gets the HTML from a URL and returns a document.
 * @param {string} url The url where the resource is located.
 * @param {function} callback The callback function.
 */
function getDocument(url, callback) {
    request(url, function(err, res, body) {
        if (err) {
            callback(err, null)
        }

        let parser = new DOMParser()
        let document = parser.parseFromString(body, "text/html")
        callback(null, document)
    })
}

/**
 * @description The function which returns the HTML file string given a URL.
 * @param {string} url The url which has been requested.
 * @param {function} callback
 */
function parser(url, callback) {

}

getDocument("https://ollybritton.com", (err, res) => {
    console.log(res.getElementsByTagName("p")[0]);
})

module.exports = parser