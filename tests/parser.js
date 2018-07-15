const test = require('ava')

const {
    detectURL,
    fixUrl,
    detectProtocol,
    rectifyDocumentURLs
} = require("../api/controllers/parser.js")

test("Can detect different URL types", t => {
    detectURL("https://google.com", (err, res) => {
        t.is(res, "full_url")
    })

    detectURL("//google.com", (err, res) => {
        t.is(res, "double_slash_url")
    })

    detectURL("google.com", (err, res) => {
        t.is(res, "httpless_url")
    })

    detectURL("example.org/script.js", (err, res) => {
        t.is(res, "httpless_url")
    })

    detectURL("/script.js", (err, res) => {
        t.is(res, "slash_resource_name")
    })

    detectURL("script.js", (err, res) => {
        t.is(res, "resource_name")
    })

    detectURL("badurl", (err, res) => {
        if (err) {
            t.pass()
        } else {
            t.fail()
        }
    })
})

test("Can fix resource URLs correctly", t => {
    fixUrl("http://example.org/script.js", "http://example.org", (err, res) => {
        t.is(res, "http://example.org/script.js")
    })

    fixUrl("//example.org/script.js", "http://example.org", (err, res) => {
        t.is(res, "http://example.org/script.js")
    })

    fixUrl("example.org/script.js", "http://example.org", (err, res) => {
        t.is(res, "http://example.org/script.js")
    })

    fixUrl("/script.js", "http://example.org", (err, res) => {
        t.is(res, "http://example.org/script.js")
    })

    fixUrl("script.js", "http://example.org", (err, res) => {
        t.is(res, "http://example.org/script.js")
    })

    fixUrl("scriptjs", "https://example.org", (err, res) => {
        if (err) {
            t.pass()
        } else {
            t.fail()
        }
    })
})

test("Can detect HTTP/HTTPS protocol", t => {
    t.is(detectProtocol("https://example.org"), "https")
    t.is(detectProtocol("http://example.org"), "http")
    t.is(detectProtocol("example.org"), "http")
})

/**
 * @todo Get this to work?
 */
test("Can rectify URLs within a HTML document", t => {
    rectifyDocumentURLs(
        "https://google.com",
        `<!DOCUMENT><html><body><script src="google.com" /><a href="//oops.com"></a></body></html>`,
        (err, res) => {
            t.is(res, `<!DOCUMENT><html><body><script src="http://google.com" /><a href="http://oops.com"></a></body></html>`)
        }
    )
})