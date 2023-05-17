class User {
  constructor (api) {
    this.$api = api
  }

  myUser () {
    return this.$api.$axios('get', '/user')
  }

  updateUser (data) {
    return this.$api.$axios('put', '/user', data)
  }

  editEmail (data) {
    return this.$api.$axios('put', '/user/email', data)
  }
}

module.exports = User
