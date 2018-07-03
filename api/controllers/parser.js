'use strict';

/**
 * @todo Fix the fixUrl function and in the process the detectURL function as it incorrectly identifies example.org/script.js as a resource and returns an incorrect answer because of that.
 */

/**
 * @file This file deals with parsing URLs and parsing them into a single, resources-less HTML string.
 * @summary Parses URLs to HTML.
 * @author Olly Britton
 * @
 */

/* Import various libraries that will be used for manipulationg the document. */
const request = require('request')
const DOMParser = require('xmldom').DOMParser;
const xmlserializer = require('xmlserializer');
const debug = require('debug')('app:parser')


/**
 * @description This is a useful constant which contains regex patterns which match to different types of URL.
 * @example
 * // Returns "true"
 * "https://google.com".match(url_types.full_url)
 */
const url_types = {
    /* https://google.com, http://www.example.org/awesome */
    full_url: /^(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$/gm,
    /* //code.jquery.com, //google.com/awesome */
    double_slash_url: /^(\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$/gm,
    /* google.com, example.org/awesomer */
    httpless_url: /^((?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$/gm,
    /* /script.js, /css.css */
    slash_resource_name: /^((?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$/gm,
    /* script.js, css.css */
    just_resource: /^([-a-zA-Z0-9@:%._\+~#=]{2,256}\.(?:js|css|html|xml|xhtml){1,6})$/gm
}

/**
 * @description Detects the type of a URL and returns a string containing that information.
 * @param {string} url The URL which needs to be detected.
 * @param {function} callback
 * @example
 * // Logs "full_url"
 * detectURL("https://google.com", (err, res) => {console.log(res)} )
 * @todo Come up with a smarter way of detecting resource names -- it's synymous with a httpless URL.
 */
exports.detectURL = function(url, callback) {
    if (url.match(url_types.full_url)) {
        /* Url is fine, no manipulation is required. */
        callback(null, "full_url")
    } else if (url.match(url_types.double_slash_url)) {
        /* The URL lacks a HTTP/HTTPS prefix, yet still has two slashes. For example: "//code.jquery.com". */
        callback(null, "double_slash_url")
    } else if (url.match(url_types.httpless_url)) {
        /* The URL lacks a HTTP/HTTPS prefix and doesn't have two slashes. For example: "code.jquery.com". However this is ambigous with a resource name, so we need to do some futher testing: */
        url = url.split(".")[url.split(".").length - 1] // Just the ending, "js" or "html", etc.

        if (["js", "css"].indexOf(url) >= 0) {
            callback(null, "resource_name")
        } else {
            callback(null, "httpless_url")
        }

    } else if (url.match(url_types.slash_resource_name)) {
        /* The URL is just the name of a resource with a slash, and nothing else. For example: "/script.js"  */
        callback(null, "slash_resource_name")
    } else {
        callback(Error(`Strange URL: ${url}`), null)
    }
}

/**
 * @description Takes a given resource URL and a requested base URL and will return a resource URL that is a full URL.
 * @example
 * // Returns "https://example.com/script.js"
 * fixUrl("script.js", "https://example.com")
 * 
 * @param {string} resource_url The URL of the resource, ie "script.js".
 * @param {string} base_url The base url, ie "https://example.com".
 * @param {function} callback The callback.
 * 
 * @todo Add in IP support.
 */
exports.fixUrl = function(resource_url, base_url, callback) {
    if (base_url[base_url.length - 1] != "/") {
        base_url += "/"
    }

    exports.detectURL(resource_url, function(err, res) {
        if (err) {
            callback(err, null)
        }

        let url_type = res

        if (url_type === "full_url") {
            // Resource URL is fine, no fixing needed.
            callback(null, resource_url)

        } else if (url_type === "double_slash_url") {
            // Missing the "http:" or "https:".
            resource_url = "http:" + resource_url
            callback(null, resource_url)

        } else if (url_type === "httpless_url") {
            // Missing the "http://" or "https://".
            resource_url = "http://" + resource_url
            callback(null, resource_url)

        } else if (url_type == "slash_resource_name") {
            // A resource name, but with a slash. "/script.js" or "/css.css".
            resource_url = base_url + resource_url.slice(1, resource_url.length)
            callback(null, resource_url)

        } else if (url_type == "resource_name") {
            // A resource name, like "script.js" or "styles.css".
            console.log("meeee" + resource_url)
            resource_url = base_url + resource_url
            callback(null, resource_url)

        } else {
            // Hmmm... The resource is of a URL we do not recognise.
            callback(
                Error(`Strange Resource URL: '${resource_url}'`), null
            )

        }

    })
}

/**
 * @description This function gets the HTML from a URL and returns a document.
 * @param {string} url The url where the resource is located.
 * @param {function} callback The callback function.
 */
function getDocument(url, callback) {
    if (url[url.length - 1] !== "/") {
        /* Check if the URL given doesn't end in a slash, and add one if not. */
        url += "/"
    }

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
 * @description Gets the raw string that is a resource.
 * @param {string} url The location of the resource.
 * @param {function} callback The callback function
 */
function getResource(url, callback) {
    request(url, function(err, res, body) {
        if (err) {
            callback(err, null)
        }

        callback(null, body)
    })
}

/**
 * @description This function takes a node list/array and document object and returns one with all the "resources flattened", which basically means that the resources are stored in page, not at some external location.
 * @param document A document object.
 * @param {array} elements A list of the elements to flatten.
 * @param {string} url The requested url. Used for the `fixUrl` function.
 * @param {function} callback 
 */
function flattenElements() {}

/**
 * @description The function which returns the HTML file string given a URL.
 * @param {string} url The url which has been requested.
 * @param {function} callback
 */
function parser(url, callback) {
    getDocument(url, function(documentErr, document) {
        if (documentErr) {
            callback(documentErr, null)
        }

        let scripts = document.getElementsByTagName("script")
        let links = document.getElementsByTagName("link")

        flattenElements(document, scripts, url, function(flattenScriptErr, flattenScriptRes) {
            if (flattenScriptErr) {
                callback(flattenScriptErr, null)
            }

            flattenElements(document, links, url, function(flattenLinksErr, flattenLinksRes) {
                if (flattenLinksErr) {
                    callback(flattenScriptErr, null)
                }

                callback(null, xmlserializer.serializeToString(document))
            })
        })
    })
}