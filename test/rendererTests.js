'use strict';

/**
 * @file Tests functions in `/api/controllers/renderer.js`
 * @author Charlie Britton
 */

const renderer = require('../api/controllers/renderer.js')
const chai = require('chai')
const chaiHttp = require('chai-http');
const expect = chai.expect
const app = require('express')()

chai.use(chaiHttp)

describe('renderer.baseUrl()', () => {
  it('should return the homepage.pug document', () => {
    chai.request(app)
      .get("/")
      .end((err, res) => {
        console.log(err)
        expect(err).to.be.null
        expect(res).to.have.status(200)
      })
  })
})