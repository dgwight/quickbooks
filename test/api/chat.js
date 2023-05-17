const qs = require('query-string')

class Chat {
  constructor (api) {
    this.$api = api
  }

  myChats () {
    return this.$api.$axios('get', '/chat')
  }

  first () {
    return this.$api.$axios('get', '/chat/first')
  }

  startChat (data) {
    return this.$api.$axios('post', '/chat', data)
  }

  startChatWidget (data) {
    return this.$api.$axios('post', '/chat/widget', data)
  }

  relayEmail (data) {
    return this.$api.$axios('post', `/chat/email?secret=${process.env.SENDGRID_SIGNING_SECRET}`, data)
  }

  getChat (chatId) {
    return this.$api.$axios('get', `/chat/${chatId}`)
  }

  setMuted (chatId, muted) {
    return this.$api.$axios('post', `/chat/${chatId}/muted`, { muted })
  }

  setAssignees (data, chatId) {
    return this.$api.$axios('post', `/chat/${chatId}/assignees`, data)
  }

  addItem (chatId, data) {
    return this.$api.$axios('post', `/chat/${chatId}/item`, data)
  }

  updateItem (chatId, itemId, data) {
    return this.$api.$axios('put', `/chat/${chatId}/item/${itemId}`, data)
  }

  removeItem (chatId, itemId) {
    return this.$api.$axios('delete', `/chat/${chatId}/item/${itemId}`)
  }

  clearUnread (chatId) {
    return this.$api.$axios('post', `/chat/${chatId}/unread`)
  }

  close (chatId) {
    return this.$api.$axios('post', `/chat/${chatId}/close`)
  }

  editClient (chatId, data) {
    return this.$api.$axios('put', `/chat/${chatId}/client`, data)
  }

  connectSlack (chatId, data) {
    return this.$api.$axios('post', `/chat/${chatId}/slack`, data)
  }
}

module.exports = Chat
