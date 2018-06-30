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
    let regex = {
        full_url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\/\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gm,
        httpless_url: /^(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\/$/gm
    }

    if (url[url.length - 1] !== "/") {
        url += "/"
    }

    if (url.match(regex.full_url)) {
        // Url is fine, nothing is needed.
    } else if (url.match(regex.httpless_url)) {
        // URL has no HTTP/HTTPS prefix, which causes some problems. This should be handled, but just in case:
        url = "http://" + url
    } else {
        callback(Error(`Strange URL: ${url}`))
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
 * @description Takes a given resource URL and a requested base URL and will return a resource URL that is a full URL.
 * @example
 * // Returns "https://example.com/script.js"
 * fixUrl("script.js", "https://example.com")
 * @param {string} resource_url The URL of the resource, ie "script.js".
 * @param {string} base_url The base url, ie "https://example.com".
 * @param {function} callback The callback.
 * @todo Add in IP support.
 */
function fixUrl(resource_url, base_url, callback) {
    /*
    There are a few cases:
    1. A full URL is given, possibly with a "www" ("http://example.com/script.js").
       Solution: None, URL is already as we want it.

    2. A full URL is given but it misses the http or https, yet it still has "//". Also possible a "www". ("//example.com/script.js")

    3. A full URL is given, but it is missing the http/https and it possibly has a "www" ("example.com/script.js").
       Solution: Add the prefix of "http".

    4. A URL which is just the resource name but with a slash("/script.js").
       Solution: Add the prefix of the base url and remove the initial slash, like "http://example.com/" + "script.js"
       However, the base url may / may not be suffixed with a slash, so that needs to be checked.

    5. A URL which is just the resource name is given ("script.js").
       Solution: Add the prefix of the base url, like "http://example.com/" + "script.js".
                 However, the base url may/may not be suffixed with a slash, so that needs to be checked. 
    */

    if (base_url[base_url.length - 1] != "/") {
        base_url += "/"
    }

    let regex = {
        full_url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\/\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gm,
        half_full_url: /\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\/\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gm,
        httpless_url: /^(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\/\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gm,
        slash_resource_name: /^\/\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gm,
        just_resource: /^[-a-zA-Z0-9@:%_\+.~#?&=]+$/gm
    }

    if (resource_url.match(regex.full_url)) {
        callback(null, resource_url)
    } else if (resource_url.match(regex.half_full_url)) {
        resource_url = "http" + resource_url
        callback(null, resource_url)
    } else if (resource_url.match(regex.httpless_url)) {
        resource_url = "http://" + resource_url
        callback(null, resource_url)
    } else if (resource_url.match(regex.slash_resource_name)) {
        resource_url = resource_url.slice(1, resource_url.length)
        resource_url = base_url + resource_url
        callback(null, resource_url)
    } else if (resource_url.match(regex.just_resource)) {
        resource_url = base_url + resource_url
        callback(null, resource_url)
    } else {
        callback(Error(`We encountered a strange resource name, "${resource_url}".`), null)
    }
}

/**
 * @description The function which returns the HTML file string given a URL.
 * @param {string} url The url which has been requested.
 * @param {function} callback
 * @todo Add a better way of handeling resources we don't know.
 */
function parser(url, callback) {
    getDocument(url, function(err, res) {
        if (err) {
            callback(err, null)
        }

        let document = res

        let scripts = document.getElementsByTagName("script")
        let links = document.getElementsByTagName("link")

        /*
        The problem, so you don't forget:
        - Somehow, the size of the scripts array keeps on growing and growing.
        - When it creates the elements, it might not delete the original element.
        */

        for (var i = 0; i < scripts.length; i++) {
            console.log(i, scripts.length)
            let current_script = scripts[i]

            let resource_type = current_script.getAttribute("type")
            let resource_url;

            if (resource_type == "script/js" || resource_type == "") {
                fixUrl(current_script.getAttribute("src"), url, function(err, res) {
                    let resource_url = res
                    getResource(resource_url, function(err, res) {
                        let new_script = document.createElement("script")
                        new_script.innerHTML = res

                        current_script.parentNode.replaceChild(new_script, current_script)
                    })
                })
            } else {
                // Can't handle resource.
                continue
            }

        }

        for (var j = 0; j < links.length; j++) {
            let current_link = links[j]

            let resource_type = current_link.getAttribute("rel")
            let resource_url;

            if (resource_type == "stylesheet" || resource_type == "") {
                fixUrl(current_link.getAttribute("src"), url, function(err, res) {
                    let resource_url = res
                    getResource(resource_url, function(err, res) {
                        let new_link = document.createElement("style")
                        new_link.innerHTML = res

                        current_link.parentNode.replaceChild(new_link, current_link)
                    })
                })
            } else {
                // Can't handle resource.
                continue
            }

        }

        callback(null, document.outerHTML)
    })
}

parser("ollybritton.com/", function(err, res) {
    console.log(res)
})

module.exports = parser