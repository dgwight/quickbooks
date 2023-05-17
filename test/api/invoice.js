class Invoice {
  constructor (api) {
    this.$api = api
  }

  getInvoices (chatId) {
    return this.$api.$axios('get', `/invoice?chat=${chatId}`)
  }

  sendInvoice (chatId) {
    return this.$api.$axios('post', '/invoice', { chat: chatId })
  }

  getInvoice (invoiceId) {
    return this.$api.$axios('get', `/invoice/${invoiceId}`)
  }

  setStatus (status, invoiceId) {
    return this.$api.$axios('post', `/invoice/${invoiceId}/status`, { status: status })
  }

  refundInvoice (invoiceId) {
    return this.$api.$axios('post', `/invoice/${invoiceId}/refund`)
  }

  captureCharge (invoiceId) {
    return this.$api.$axios('post', `/invoice/${invoiceId}/capture`)
  }
}

module.exports = Invoice
