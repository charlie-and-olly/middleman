'use strict';

/**
 * @todo Make it so that that the `rectifyDocumentURLs` function will not select URLs which do not to be fixed.
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
const url_patterns = {
    /* Attempts to find the HTTP/HTTPS prefix. */
    http_section: /(https?):\/\//,

    /* https://google.com, http://www.example.org/awesome */
    full_url: /^(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$/gm,

    /* //code.jquery.com, //google.com/awesome */
    double_slash_url: /^(\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$/gm,

    /* google.com, example.org/awesomer */
    httpless_url: /^((?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.(?!js|css|html|xml|xhtml)[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$/gm,

    /* /script.js, /css.css */
    slash_resource_name: /^\/([-a-zA-Z0-9@:%._\+~#=]{2,256}\.(?:js|css|html|xml|xhtml))$/gm,

    /* script.js, css.css */
    resource_name: /^([-a-zA-Z0-9@:%._\+~#=]{2,256}\.(?:js|css|html|xml|xhtml))$/gm,

    /* Any type of URL. TODO: THIS IS A MONSTER, and should probably be fixed. */
    any: /(?:^(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$)|(?:^(\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$)|(?:^((?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.(?!js|css|html|xml|xhtml)[a-z]{2,6}(?:\/(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)?)$)|(?:^\/([-a-zA-Z0-9@:%._\+~#=]{2,256}\.(?:js|css|html|xml|xhtml))$)|(?:^([-a-zA-Z0-9@:%._\+~#=]{2,256}\.(?:js|css|html|xml|xhtml))$)/
}

/**
 * @description This is another useful constant which contains Regex patterns that can extract the URLs out of `script` tags and `link` tags.
 */
const tag_patterns = {
    /* Matches valid script tags with the capture group being the URL. */
    script: /<script.*src="(.+\.js)".*(?:\/>|>.*<\/script>)/g,

    /* Matches valid <link> tags with the capture group being the HREF. */
    link: /<link.*href="(.+\.css)".*(?:\/>|>.*<\/link>)/g
}

/**
 * @description Detects the type of a URL and returns a string containing that information.
 * @param {string} url The URL which needs to be detected.
 * @param {function} callback
 * @example
 * // Logs "full_url"
 * detectURL("https://google.com", (err, res) => {console.log(res)} )
 */
exports.detectURL = function(url, callback) {
    if (url.match(url_patterns.full_url)) {
        /* Url is fine, no manipulation is required. */
        callback(null, "full_url")
    } else if (url.match(url_patterns.double_slash_url)) {
        /* The URL lacks a HTTP/HTTPS prefix, yet still has two slashes. For example: "//code.jquery.com". */
        callback(null, "double_slash_url")
    } else if (url.match(url_patterns.httpless_url)) {
        /* The URL lacks a HTTP/HTTPS prefix and doesn't have two slashes. For example: "code.jquery.com". However this is ambigous with a resource name, so we need to do some futher testing: */
        callback(null, "httpless_url")

    } else if (url.match(url_patterns.slash_resource_name)) {
        /* The URL is just the name of a resource with a slash, and nothing else. For example: "/script.js"  */
        callback(null, "slash_resource_name")

    } else if (url.match(url_patterns.resource_name)) {
        /* The URL is a plain resource name, and has no "HTTP://" or root url. */
        callback(null, "resource_name")

    } else {
        /* EEK! We have no idea. */
        callback(Error(`Strange URL: ${url}`), null)

    }
}

/**
 * @description This function detects whether the base url is using HTTP or HTTPS and returns the result accordingly.
 * @param {string} url
 */
exports.detectProtocol = function(url) {
    if (url.includes("https")) {
        return "https"
    } else {
        return "http"
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
exports.fixUrl = function(resource_url, base_url) {
    if (base_url[base_url.length - 1] != "/") {
        base_url += "/"
    }


    exports.detectURL(resource_url, function(err, res) {
        if (err) {
            throw err
        }

        let url_type = res
        let http_prefix = "http"

        if (url_type === "full_url") {
            // Resource URL is fine, no fixing needed.
            return resource_url

        } else if (url_type === "double_slash_url") {
            // Missing the "http:" or "https:".
            resource_url = `${http_prefix}:` + resource_url
            return resource_url

        } else if (url_type === "httpless_url") {
            // Missing the "http://" or "https://".
            resource_url = `${http_prefix}://` + resource_url
            return resource_url

        } else if (url_type == "slash_resource_name") {
            // A resource name, but with a slash. "/script.js" or "/css.css".
            resource_url = base_url + resource_url.slice(1, resource_url.length)
            return resource_url

        } else if (url_type == "resource_name") {
            // A resource name, like "script.js" or "styles.css".
            resource_url = base_url + resource_url
            return resource_url

        } else {
            // Hmmm... The resource is of a URL we do not recognise.
            throw (
                Error(`Strange Resource URL: '${resource_url}'`), null
            )

        }

    })
}

/**
 * @description This function is passed a HTML document represnted as a string, and will return a version of that document where each URL is represented in full. For example, `google.com` becomes `http://google.com`.
 * @param {string} baseUrl The base url of the page, for example: "http://google.com".
 * @param {string} document The document, as a string.
 * @param {function} callback The callback function.
 */
exports.rectifyDocumentURLs = function(baseUrl, document, callback) {


    let new_document = document.replace(url_patterns.any, match => {
        console.log(exports.fixUrl(match, baseUrl))
        return exports.fixUrl(match, baseUrl)
    })

    console.log(new_document)


}

/**
 * @description This function takes a URL, like "https://example.org" and returns a version of the HTML which has all the external resources and scripts which are specified in the file. For example, a `<script src="..."></script>` would become `<script>...</script>`.
 * @param {string} url The url which has been requested.
 * @param {function} callback The callback function.
 */
exports.parser = function(url, callback) {

    request(url, (err, res) => {
        if (err) {
            callback(err, null)
        }

        let document = res

        exports.rectifyDocumentURLs(url, document, (err, res) => {
            if (err) {
                callback(err, null)
            }

            let fixedDocument = res



        })
    })

}

// exports.rectifyDocumentURLs("https://google.com", "google.com", (rectifyErr, rectifyRes) => {
//     console.log(rectifyRes)
// })

let a = function() {
    let b = 12
    b = 10

    return b
}

console.log(a())