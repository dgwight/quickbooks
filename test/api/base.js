const chai = require('chai')
const chaiHttp = require('chai-http')
const { app } = require('../../src/server')
const { get, has } = require('lodash')
const Auth = require('./auth')
const Chat = require('./chat')
const Flow = require('./flow')
const Invoice = require('./invoice')
const Message = require('./message')
const User = require('./user')
const Account = require('./account')
const { handleSlackEvent } = require('../../src/route/slack')

chai.use(chaiHttp)
chai.should()

class API {
  constructor () {
    this.agent = chai.request.agent(app)
    this.accessToken = null

    this.auth = new Auth(this)
    this.chat = new Chat(this)
    this.flow = new Flow(this)
    this.invoice = new Invoice(this)
    this.message = new Message(this)
    this.user = new User(this)
    this.account = new Account(this)
  }

  getSignedUrl (data) {
    return this.$axios('post', `/url?file=${data.file}`)
  }

  getBadge (username) {
    return this.$axios('get', `/workspace/${username}/badge.svg`)
  }

  getBadge2 (username) {
    return this.$axios('get', `/consultancy/${username}/badge.svg`)
  }

  getBeamsToken (userId) {
    return this.$axios('get', `/pusher/beams-auth?user_id=${userId}`)
  }

  stripeWebhook (type, object) {
    return this.$axios('post', '/stripe', { type: type, data: { object: object } })
  }

  stripeConnectWebhook (type, object, account) {
    return this.$axios('post', '/stripe/connect', { type: type, data: { object: object }, account: account })
  }

  slackWebhook (event) {
    return handleSlackEvent(event)
  }

  addContact (data) {
    return this.$axios('post', '/contact', data)
  }

  testError () {
    return this.$axios('post', '/error')
  }

  reset () {
    this.accessToken = null
    this.agent = chai.request.agent(app)
  }

  $axios (method, url, data) {
    let call
    if (method === 'post') {
      call = this.agent.post(url).send(data)
    } else if (method === 'get') {
      call = this.agent.get(url)
    } else if (method === 'put') {
      call = this.agent.put(url).send(data)
    } else {
      call = this.agent.delete(url)
    }
    call.set('origin', 'http://localhost:8080')
    if (this.accessToken) {
      call.set('Authorization', `Bearer ${this.accessToken}`)
    }

    return new Promise((resolve) => {
      call.end((_, res) => {
        if (has(res, 'body.accessToken') || has(res, 'body.auth.accessToken')) {
          this.accessToken = get(res, 'body.accessToken') || get(res, 'body.auth.accessToken')
        }
        resolve(res)
      })
    })
  }
}

module.exports = API
