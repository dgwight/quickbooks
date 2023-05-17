const nock = require('nock')

class Auth {
  constructor (api) {
    this.$api = api
  }

  logout () {
    this.$api.accessToken = null
    return Promise.resolve(true)
  }

  basicAuth (data) {
    return this.$api.$axios('post', '/auth', data)
  }

  findByToken (token) {
    return this.$api.$axios('get', `/auth?token=${token}`)
  }

  setPassword (data) {
    return this.$api.$axios('post', '/auth/password', data)
  }

  register (data) {
    return this.$api.$axios('post', '/auth/register', data)
  }

  login (data) {
    return this.$api.$axios('post', '/auth/login', data)
  }

  forgotPassword (data) {
    return this.$api.$axios('post', '/auth/forgot', data)
  }

  checkEmail (email) {
    return this.$api.$axios('post', '/auth/email', { email: email })
  }

  confirmEmail (data) {
    return this.$api.$axios('post', '/auth/email/confirm', data)
  }

  githubLogin (code) {
    nock('https://github.com')
      .post('/login/oauth/access_token')
      .reply(200, 'access_token=token')
    nock('https://api.github.com')
      .get('/user')
      .reply(200, {
        id: 'id',
        login: 'Dgwight',
        name: 'Dylan Wight',
        avatar_url: 'https://avatars2.githubusercontent.com/u/16690226?v=4'
      })
    nock('https://api.github.com')
      .get('/user/emails')
      .reply(200, [{ primary: true, email: 'test@otechie.com' }])
    return this.$api.$axios('post', '/auth/github', { code: code })
  }

  googleLogin (data) {
    nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: 'ya29.a0AfH6SMAHmJu5s8XnRvSVNQJRlQ7PaxljHWfHOAEXDPbfE00vFDxKCG8HdVnMu1G738SIAk_rZOs6lqIwNJstPRVE9atX57S70Zp8sBF3r9lh8yGsKst1f_E6Xbs4p-RjXLheoSn7lCM98ZmLAK96ST3com2a',
        expires_in: 3599,
        scope: 'https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/userinfo.email',
        token_type: 'Bearer',
        id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ijc3NDU3MzIxOGM2ZjZhMmZlNTBlMjlhY2JjNjg2NDMyODYzZmM5YzMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIxMDA1NDkyMTc0NzczLWNmcDhnb2xoNGdrNDdkOXE5dmpzanJ1NzEwN3FlYmZyLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiMTAwNTQ5MjE3NDc3My1jZnA4Z29saDRnazQ3ZDlxOXZqc2pydTcxMDdxZWJmci5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjEwNjQwMjYzOTAyOTM4NTA1NDg2OCIsImVtYWlsIjoiZHlsYW5nd2lnaHRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF0X2hhc2giOiJPeWY3SEtQVzNYZzlIWjlNVUpUMjd3IiwibmFtZSI6IkR5bGFuIFdpZ2h0IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hLS9BT2gxNEdnMVl0RFRUTk1QQzZycGFRNFo1RVRBQzFPWDBmbWhBak9maG9MZHRBPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkR5bGFuIiwiZmFtaWx5X25hbWUiOiJXaWdodCIsImxvY2FsZSI6ImVuIiwiaWF0IjoxNjE4MTkzOTUxLCJleHAiOjE2MTgxOTc1NTF9.jN-Ruyggy94sWwbKrHTlGABXFSJjDkwUfO5rDnCNYA6LxV1iML5nHfAMhyh_nX5D8lkiYTjB59Vz0ejVSr8Qq7jgn3JOJ2hETTkk3JYJbJG6SKhRW6fFX2k8ywSwWpdQ8MMcs7pvXKqMDaziW_NcmuAaK8T8ljYd87O2XBRmShWwlVA-WJIP-fR4pxjxBLe7C-pPfT3kwGbIYD7YBF-7sv_XHF-d5HjzxWEgGrJqHHn4H5slV-0ZqYpNweHa5Oj9qvo6DyQrzReoCSwU5-jc_CuG9FrtRVR__2fQg5zDmVSr97f_1i49ydyhZWwSGDvbCglMl9GIbl6qPjlqIP_6QA'
      })
    return this.$api.$axios('post', '/auth/google', data)
  }

  appleLogin (data) {
    nock('https://appleid.apple.com')
      .post('/auth/token')
      .reply(200, {
        access_token: 'ab303858802c44e77b72addd1e61cf4f0.0.mvxu.zc4oXzmDEmhnqIEzyND-IA',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'rf4a37fa18eab428ca2c447933faca4ed.0.mvxu.PHglxJWdH5vyjRJqdN_ZQg',
        id_token: 'eyJraWQiOiJlWGF1bm1MIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIiwiYXVkIjoiY29tLmRldi1vdGVjaGllLnNlcnZpY2UiLCJleHAiOjE2MTgyODE1MTIsImlhdCI6MTYxODE5NTExMiwic3ViIjoiMDAwNTc0LmVlY2Q2YWM3MjNkNTQyMjliZTE3ZTYzN2NkZGJhODc5LjIyNDYiLCJhdF9oYXNoIjoiS0lQMThHNXJrYUExUTd5WHpZakx0dyIsImVtYWlsIjoiZHlsYW5nd2lnaHRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOiJ0cnVlIiwiYXV0aF90aW1lIjoxNjE4MTk1MTEwLCJub25jZV9zdXBwb3J0ZWQiOnRydWV9.Tv-POFavo8WnGYjHKHFNuMpNMl9GJ9Hp5RhMHA72hfEi8TQYfrVMq4UNrW2skmA5VPvqYufr-_r9A64ZQXtkwtTICMc_dx3uu7g9oZJCPa1b2dAKMkq_vrxHJW85DfVe_A27uHq_xUhNJvx1EXHcjUkfWGyJskVs5tEBL3ySh7dxUnShjj20NufvINkl79U5qmegv_Ov4EBhtLzh1aFtYaSob9DtRLqocS-kjGlVIGlcK-E3WfHvuXbchmSv-KSN-G3u5NNjT3zLw28RvzUrrqdyjuP3PBoH7rauVJixlfp1YcQDW2YrgtdZBCjUATr_frIU9IlikaQDHi-9bUWzzg'
      })
    return this.$api.$axios('post', '/auth/apple', data)
  }
}

module.exports = Auth
