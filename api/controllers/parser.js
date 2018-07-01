'use strict';

const request = require('request')
const DOMParser = require('xmldom').DOMParser;
const xmlserializer = require('xmlserializer');
const debug = require('debug')('app:parser')

/**
 * @file This file deals with parsing URLs and parsing them into a single, resources-less HTML string.
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

    if (!base_url.startsWith("http")) {
        base_url = "http://" + base_url
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
        resource_url = "http:" + resource_url
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
 * @description This function will "flatten" a HTML/DOM object so that all &lt;link&lt; and &lt;style&lt; tags have their resources in the HTML document.
 * @param {object} document The document to flatten.
 * @param {url} string The url. This is needed for the `fixUrl` function.
 * @param {function} callback
 */
function flattenDocument(document, url, callback) {
    let scripts = document.getElementsByTagName("script")
    let links = document.getElementsByTagName("link")

    var promise = new Promise(function(resolve, reject) {
        for (var i = 0; i < scripts.length; i++) {
            let current_script = scripts[i]
            let current_type = current_script.getAttribute(`type`)
            let current_url = current_script.getAttribute(`src`)

            if (current_type == "" || current_script == "script/javascript" || current_script == "script/js" || current_script == "application/javascript") {
                // ^ Checks to see whether the script is a javascript script.

                if (current_url == "") {
                    // The script tag is source-less, which means that the JavaScript is most likely declared within the tag. Therefore, we don't need to do anything as it's just how we want it.
                    continue
                } else {
                    // The script tag links to external resource.
                    debug(`Current URL: ${current_url}`)
                    fixUrl(current_url, url, function(err, res) {
                        if (err) {
                            reject(err)
                        }

                        current_url = res

                        debug(`Fixed URL:   ${current_url}`)

                        getResource(current_url, function(resource_err, resource_res) {
                            if (resource_err) {
                                debug(resource_err)
                                callback(resource_err, null)
                            }

                            //debug(`Sample of Resource: ${resource_res}`)

                            //debug(`Current Script Tag: ${xmlserializer.serializeToString(current_script)}`)

                            let new_resource = `// ${current_url}\n` + resource_res

                            let parser = new DOMParser()
                            let new_script = parser.parseFromString(`<script>${new_resource}</script>`, "text/html")

                            //debug(`New Script Tag: ${xmlserializer.serializeToString(new_script)}`)
                            debug("")

                            current_script.parentNode.replaceChild(new_script, current_script);

                        })

                    })

                }

            } else {
                // Can't handle this script.
                continue
            }
            debug("")
        }

        for (var j = 0; j < scripts.length; j++) {
            let current_link = links[j]
            let current_type = current_link.getAttribute(`rel`)
            let current_url = current_link.getAttribute(`href`)

            if (current_type == "" || current_type == "stylesheet" || current_type == "css") {
                // ^ Checks to see whether the script is a javascript script.

                if (current_url == "") {
                    // The script tag is source-less, which means that the JavaScript is most likely declared within the tag. Therefore, we don't need to do anything as it's just how we want it.
                    continue
                } else {
                    // The script tag links to external resource.
                    debug(`Current URL: ${current_url}`)
                    fixUrl(current_url, url, function(err, res) {
                        if (err) {
                            reject(err)
                        }

                        current_url = res

                        debug(`Fixed URL:   ${current_url}`)

                        getResource(current_url, function(resource_err, resource_res) {
                            if (resource_err) {
                                debug(resource_err)
                                callback(resource_err, null)
                            }

                            //debug(`Sample of Resource: ${resource_res}`)

                            //debug(`Current Link Tag: ${xmlserializer.serializeToString(current_link)}`)

                            let new_resource = `// ${current_url}\n` + resource_res

                            let parser = new DOMParser()
                            let new_link = parser.parseFromString(`<style>${new_resource}</style>`, "text/html")

                            //debug(`New Style Tag: ${xmlserializer.serializeToString(new_link)}`)
                            debug("")

                            current_link.parentNode.replaceChild(new_link, current_link);

                        })

                    })

                }

            } else {
                // Can't handle this link type.
                continue
            }

        }

        resolve(document)
    }).then(function(result) {
        callback(null, result)
    }, function(err) {
        callback(err, null)
    })
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

        flattenDocument(res, url, function(flat_err, flat_res) {
            callback(null, xmlserializer.serializeToString(flat_res))
        })

    })
}

parser("ollybritton.com", function(err, res) {
    console.log(res)
})

module.exports = parser