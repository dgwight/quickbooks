class Flow {
  constructor (api) {
    this.$api = api
  }

  getFlows () {
    return this.$api.$axios('get', '/flow')
  }

  createFlow (data) {
    return this.$api.$axios('post', '/flow', data)
  }

  getFlow (flowId) {
    return this.$api.$axios('get', `/flow/${flowId}`)
  }

  editFlow (flowId, data) {
    return this.$api.$axios('put', `/flow/${flowId}`, data)
  }

  deleteFlow (flowId) {
    return this.$api.$axios('delete', `/flow/${flowId}`)
  }

  addStep (flowId, data) {
    return this.$api.$axios('post', `/flow/${flowId}/step`, data)
  }

  editStep (flowId, stepId, data) {
    return this.$api.$axios('put', `/flow/${flowId}/step/${stepId}`, data)
  }

  deleteStep (flowId, stepId) {
    return this.$api.$axios('delete', `/flow/${flowId}/step/${stepId}`)
  }

  setOrder (flowId, stepId, data) {
    return this.$api.$axios('put', `/flow/${flowId}/step/${stepId}/order`, data)
  }
}

module.exports = Flow
