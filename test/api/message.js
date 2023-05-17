class Message {
  constructor (api) {
    this.$api = api
  }

  getMessages (chatId, oldestDate) {
    const dateQuery = oldestDate ? `&oldest=${oldestDate}` : ''
    return this.$api.$axios('get', `/message?chat=${chatId}${dateQuery}`)
  }

  addMessage (data) {
    return this.$api.$axios('post', '/message', data)
  }

  editMessage (data) {
    return this.$api.$axios('put', `/message/${data.id}`, data)
  }

  deleteMessage (messageId) {
    return this.$api.$axios('delete', `/message/${messageId}`)
  }

  getMessage (messageId) {
    return this.$api.$axios('get', `/message/${messageId}`)
  }
}

module.exports = Message
