const nock = require('nock')

class Account {
  constructor (api) {
    this.$api = api
  }

  getActiveAccount () {
    return this.$api.$axios('get', '/account')
  }

  getUsernames () {
    return this.$api.$axios('get', '/account/username')
  }

  createAccount (body) {
    return this.$api.$axios('post', '/account', body)
  }

  getAccount (accountId, fromWidget) {
    const query = fromWidget ? '?widget=true' : ''
    return this.$api.$axios('get', `/account/${accountId}${query}`)
  }

  checkUsername (username, accountId) {
    const query = accountId ? `?account=${accountId}` : ''
    return this.$api.$axios('get', `/account/username/${username}${query}`)
  }

  updateAccount (body, accountId) {
    return this.$api.$axios('put', `/account/${accountId}`, body)
  }

  join (token) {
    return this.$api.$axios('post', '/account/join', { token })
  }

  sendInvites (body, accountId) {
    return this.$api.$axios('post', `/account/${accountId}/invite`, body)
  }

  removeMember (accountId, userId) {
    return this.$api.$axios('delete', `/account/${accountId}/user/${userId}`)
  }

  delete (accountId) {
    return this.$api.$axios('delete', `/account/${accountId}`)
  }

  setAccount (accountId) {
    return this.$api.$axios('post', `/account/${accountId}`)
  }

  setWidgetInstalled (accountId) {
    return this.$api.$axios('put', `/account/${accountId}/widget`)
  }

  connectStripeAccount (code) {
    nock('https://connect.stripe.com')
      .post('/oauth/token')
      .reply(200, { stripe_user_id: 'acct_1CgHSJD8sHwWJsmZ' })
    return this.$api.$axios('post', '/account/stripe', { code })
  }
}

module.exports = Account
