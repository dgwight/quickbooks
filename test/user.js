/* eslint-disable no-undef,no-unused-expressions */
process.env.NODE_ENV = 'test'
const chai = require('chai')
const chaiHttp = require('chai-http')
const { app } = require('../src/server')
const API = require('./api/base')
const A = new API()
const B = new API()
const C = new API()
const Auth = require('../src/model/auth')
const User = require('../src/model/user')

const { setupBot } = require('./utils')

function reset () {
  A.reset()
  B.reset()
  C.reset()
}

chai.use(chaiHttp)

describe('User', () => {
  beforeEach(setupBot)
  afterEach(reset)

  it('Apple auth', async () => {
    let res = await A.addContact({ email: 'bad' })
    res.should.have.status(422)

    res = await A.addContact({ email: 'hello@otechie.com' })
    res.should.have.status(200)
  })

  it('Apple auth', async () => {
    const res = await A.auth.appleLogin({
      code: 'cce9052768c484a8e8994e69d6e59d3a5.0.mvxu.NKhITRbbgZAltUAdgkJr8Q',
      appleId: process.env.APPLE_ID
    })
    res.should.have.status(200)
    res.body.should.have.property('accessToken')
    res.body.should.have.property('user')

    const auth = await Auth.findById(res.body.id)
    auth.should.have.property('appleId').equals('000574.eecd6ac723d54229be17e637cddba879.2246')
    auth.should.have.property('emailConfirmed').equals(true)
    auth.should.have.property('emailNormalized').equals('dylangwight@gmail.com')

    const user = await User.findById(auth.user)
    user.should.have.property('firstName').equals('dylangwight@gmail.com')
    user.should.have.property('lastName').equals('')
    user.should.have.property('email').equals('dylangwight@gmail.com')
    user.should.have.property('avatarUrl') // isn't set
  })

  it('Google auth', async () => {
    const res = await A.auth.googleLogin({ token: 'test' })
    res.should.have.status(200)
    res.body.should.have.property('accessToken')
    res.body.should.have.property('user')

    const auth = await Auth.findById(res.body.id)
    auth.should.have.property('googleId').equals('106402639029385054868')
    auth.should.have.property('emailConfirmed').equals(true)
    auth.should.have.property('emailNormalized').equals('dylangwight@gmail.com')

    const user = await User.findById(auth.user)
    user.should.have.property('firstName').equals('Dylan')
    user.should.have.property('lastName').equals('Wight')
    user.should.have.property('email').equals('dylangwight@gmail.com')
    user.should.have.property('avatarUrl').equals('https://lh3.googleusercontent.com/a-/AOh14Gg1YtDTTNMPC6rpaQ4Z5ETAC1OX0fmhAjOfhoLdtA=s96-c')
  })

  it('Index', (done) => {
    chai.request(app)
      .get('/')
      .end((_, res) => {
        res.should.have.status(200)
        res.text.should.equal('Welcome to Otechie\'s API!')
        done()
      })
  })

  it('Options', (done) => {
    chai.request(app)
      .options('/')
      .end((_, res) => {
        res.should.have.status(204)
        done()
      })
  })

  it('Invalid Token', (done) => {
    A.accessToken = 'bad'
    A.user.myUser().then(res => {
      res.should.have.status(401)
      done()
    })
  })

  it('Invalid User Token', (done) => {
    A.accessToken = 'Bearer%20eyJhbGciOiJIUzI1NiJ9.NWYwZDJhZThmZmQyOTU2MzE1YWM5NTli.6sAqgB9bLM2nfDisBiKuP5o61NJLbDJp1TBwMcsZNE8'
    A.user.myUser().then(res => {
      res.should.have.status(401)
      done()
    })
  })

  it('User and get Beams token', (done) => {
    A.auth.githubLogin('code').then(res => {
      res.should.have.status(200)
      res.body.should.have.property('accessToken')
      res.body.should.have.property('user')
      A.auth.githubLogin('code').then(res => {
        res.should.have.status(200)
        res.body.should.have.property('accessToken')
        res.body.should.have.property('user')
        return A.user.updateUser({ firstName: 'Bob', emailNotifications: false })
      }).then(res => {
        res.should.have.status(200)
        res.body.should.have.property('object').equals('User')
        res.body.should.have.property('id')
        res.body.should.have.property('firstName').equals('Bob')
        res.body.should.have.property('emailNotifications').equals(false)
        return A.getBeamsToken(res.body.id)
      }).then(res => {
        const data = JSON.parse(res.text)
        res.should.have.status(200)
        data.should.have.property('token')
        done()
      })
    })
  })

  describe('Check email', () => {
    it('valid email', (done) => {
      A.auth.checkEmail('new@otechie.com').then(res => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('available').equals(true)
        res.body.should.have.property('email').equals('new@otechie.com')
        done()
      })
    })
    it('no email', (done) => {
      A.auth.checkEmail('').then(res => {
        res.should.have.status(422)
        res.body.errors.email.msg.should.equal('Invalid value')
        done()
      })
    })
    it('no email', (done) => {
      A.auth.checkEmail('adf').then(res => {
        res.should.have.status(422)
        res.body.errors.email.msg.should.equal('Invalid value')
        done()
      })
    })
    it('taken email', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'password1',
        email: 'hi@otechie.com'
      }
      A.auth.register(user).then(res => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('accessToken')
        return A.user.myUser()
      }).then(res => {
        res.should.have.status(200)
        res.body.should.have.property('firstName')
        res.body.should.have.property('lastName')
        res.body.should.have.property('email').eql(user.email)
        return A.auth.checkEmail(user.email)
      }).then(res => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('available').equals(false)
        res.body.should.have.property('email').equals(user.email)
        done()
      })
    })
  })
  describe('REGISTER user', () => {
    it('it should not REGISTER a user without email field', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'Password1'
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.email.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user with empty email field', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'password',
        email: ''
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.email.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user with an invalid email field', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'Password1',
        email: 'dylan@'
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.email.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user without password field', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        email: 'dyan@otechie.com'
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.password.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user with empty password field', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: '',
        email: 'dyan@otechie.com'
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.password.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user with an invalid password field', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'password',
        email: 'dyan@otechie.com'
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.password.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user without firstName field', (done) => {
      const user = {
        password: 'adsfas',
        email: 'dyan@otechie.com'
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.firstName.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user with empty firstName field', (done) => {
      const user = {
        firstName: '',
        lastName: '',
        password: 'asdfasf',
        email: 'dyan@otechie.com'
      }
      chai.request(app)
        .post('/auth/register')
        .send(user)
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.firstName.msg.should.equal('Invalid value')
          res.body.errors.lastName.msg.should.equal('Invalid value')
          res.body.errors.password.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should not REGISTER a user with taken email field', (done) => {
      const auth = new Auth({
        user: '5eb46967b631410cd75d5c2e',
        emailNormalized: 'dylan@otechie.com'
      })
      auth.save().then(auth => {
        return A.auth.register({
          firstName: 'Dylan',
          lastName: 'Wight',
          password: 'Password1',
          email: 'dylan@otechie.com'
        }).then(res => {
          res.should.have.status(422)
          res.body.error.should.equal('Email is already in use')
          done()
        })
      })
    })
    it('it should REGISTER a user ', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'password1',
        email: 'Hi@otechie.com'
      }
      A.auth.register(user).then(res => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('accessToken')
        return A.user.myUser()
      }).then(res => {
        res.body.should.have.property('firstName')
        res.body.should.have.property('lastName')
        res.body.should.have.property('email').eql(user.email)
        done()
      })
    })
    it('it should REGISTER two customers', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'Password1',
        email: 'hi@otechie.com'
      }
      A.auth.register(user).then(res => {
        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('accessToken')
        return A.user.myUser()
      }).then(res => {
        res.body.should.have.property('firstName')
        res.body.should.have.property('lastName')
        res.body.should.have.property('email').eql(user.email)
        const user2 = {
          firstName: 'Dylan',
          lastName: 'Wight',
          password: 'Password1',
          email: 'hi2@otechie.com'
        }
        return B.auth.register(user2).then(res => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.should.have.property('accessToken')
          return B.user.myUser()
        }).then(res => {
          res.body.should.have.property('firstName').eql(user2.firstName)
          res.body.should.have.property('lastName').eql(user2.lastName)
          res.body.should.have.property('email').eql(user2.email)
          done()
        })
      })
    })
  })
  describe('/POST /login user', () => {
    it('Bad password', (done) => {
      A.auth.login({
        password: 'password',
        email: 'dylan@otechie.com'
      }).then(res => {
        res.should.have.status(401)
        done()
      })
    })
    it('non-existant user', (done) => {
      A.auth.login({
        password: 'password',
        email: 'new@otechie.com'
      }).then(res => {
        res.should.have.status(401)
        done()
      })
    })
    it('it should LOGIN a user simple', (done) => {
      const user = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'Password1',
        email: 'hi@otechie.com'
      }
      A.auth.register(user).then(res => {
        res.should.have.status(200)
        A.auth.logout().then(logout => {
          return A.auth.login({
            password: 'Password1',
            email: 'hi@otechie.com'
          }).then(res => {
            res.should.have.status(200)
            res.body.should.be.a('object')
            res.body.should.have.property('accessToken')
            res.body.should.have.property('user')
            done()
          })
        })
      })
    })
  })

  /*
   * Test the /POST /auth/forgot route
   */
  describe('/POST /auth/forgot ', () => {
    it('it should not do anything with a non existent email', (done) => {
      chai.request(app)
        .post('/auth/forgot')
        .send({ email: 'new@otechie.com' })
        .end((_, res) => {
          res.should.have.status(422)
          res.body.error.should.equal('No account with that email address exists.')
          done()
        })
    })
    it('it should not do anything with no email', (done) => {
      chai.request(app)
        .post('/auth/forgot')
        .end((_, res) => {
          res.should.have.status(422)
          res.body.errors.email.msg.should.equal('Invalid value')
          done()
        })
    })
    it('it should set the  token and expireTime', async () => {
      let auth = new Auth({
        password: 'Password1',
        emailNormalized: 'dylangwight@gmail.com'
      })
      const user = new User({
        firstName: 'Dylan',
        lastName: 'Wight',
        avatarUrl: 'https://avatars2.githubusercontent.com/u/16690226?v=4',
        email: 'dylanGwight@gmail.com',
        emailNormalized: 'dylangwight@gmail.com',
        auth: auth._id
      })
      auth.user = user._id
      await auth.save()
      await user.save()

      let res = await A.auth.forgotPassword({ email: auth.emailNormalized })
      res.should.have.status(200)
      res.body.status.should.equal('Reset password email sent')

      auth = await Auth.findByEmail(auth.emailNormalized)
      auth.should.be.a('object')
      auth.should.have.property('resetPasswordToken')
      auth.should.have.property('resetPasswordExpires')

      res = await A.auth.setPassword({ password: 'newpassworD1', token: 'bad_token' })
      res.should.have.status(401)
      res.body.should.have.property('error').equals('Password reset token is invalid or has expired.')

      res = await A.auth.setPassword({ password: 'newpassworD1', token: auth.resetPasswordToken })
      res.should.have.status(200)
      res.body.should.have.property('accessToken')
      res.body.should.have.property('user')

      await A.auth.logout()

      res = await A.auth.login({ email: auth.emailNormalized, password: 'newpassworD1' })
      res.should.have.status(200)
      res.body.should.be.a('object')
      res.body.should.have.property('accessToken')
    })
  })
  /*
   * Test the /POST /auth/email/:token route
   */
  describe('Test the /POST /auth/email/:token route', () => {
    it('it should confirm an email token', (done) => {
      const userData = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'Passowrd1',
        email: 'new@otechie.com'
      }
      A.auth.register(userData).then(res => {
        res.body.should.have.property('accessToken')
        Auth.findByEmail(userData.email).then(auth => {
          auth.should.have.property('emailNormalized').eql(userData.email)
          auth.should.have.property('emailConfirmToken')
          auth.should.have.property('emailConfirmed').equal(false)
          return A.auth.confirmEmail({ token: auth.emailConfirmToken }).then(res => {
            res.should.have.status(200)
            res.body.should.be.a('object')
            res.body.should.have.property('user')
            res.body.should.have.property('accessToken')
            return A.auth.confirmEmail({ token: auth.emailConfirmToken })
          }).then(res => {
            res.should.have.status(422)
            res.body.should.be.a('object')
            res.body.should.have.property('error').eql('Email token is invalid or has expired.')
            Auth.findByEmail(userData.email).then(auth => {
              auth.should.have.property('emailNormalized').eql(auth.emailNormalized)
              auth.should.have.property('emailConfirmToken').eql(undefined)
              auth.should.have.property('emailConfirmed').equal(true)
              return A.auth.logout()
            }).then(res => {
              return A.user.myUser()
            }).then(res => {
              res.should.have.status(200)
              res.should.have.property('body').equals(null)
              done()
            })
          })
        })
      })
    })
    it('it should not confirm an incorrect email token', (done) => {
      const userData = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'Passowrd1',
        email: 'new@otechie.com'
      }
      A.auth.register(userData).then(res => {
        return Auth.findByEmail(userData.email)
      }).then(auth => {
        auth.should.have.property('emailNormalized').eql(userData.email)
        auth.should.have.property('emailConfirmToken')
        auth.should.have.property('emailConfirmed').equal(false)
        return A.auth.confirmEmail({ token: `${auth.emailConfirmToken}a` })
      }).then(res => {
        res.should.have.status(422)
        res.body.should.be.a('object')
        res.body.should.have.property('error').eql('Email token is invalid or has expired.')
        done()
      })
    })
    it('it should not confirm an incorrect email token and user STATUS', (done) => {
      const userData = {
        firstName: 'Dylan',
        lastName: 'Wight',
        password: 'Passowrd1',
        email: 'dyl3an@otechie.com'
      }
      A.auth.register(userData).then(res => {
        return Auth.findByEmail(userData.email)
      }).then(auth => {
        auth.should.have.property('user')
        auth.should.have.property('emailNormalized').eql(userData.email)
        auth.should.have.property('emailConfirmToken')
        auth.should.have.property('emailConfirmed').equal(false)
        return A.auth.confirmEmail({ token: `${auth.emailConfirmToken}a` })
      }).then(res => {
        res.should.have.status(422)
        res.body.should.be.a('object')
        res.body.should.have.property('error').eql('Email token is invalid or has expired.')
        return Auth.findByEmail(userData.email)
      }).then(auth => {
        auth.should.have.property('emailNormalized').eql(userData.email)
        auth.should.have.property('emailConfirmToken')
        auth.should.have.property('emailConfirmed').equal(false)
        return A.auth.logout().then(res => {
          return A.auth.confirmEmail({ token: 'a' })
        }).then(res => {
          res.should.have.status(422)
          done()
        })
      })
    })
  })
})
describe('/POST /auth/email/edit', async () => {
  it('it should throw a 422 with the same email', async () => {
    let user = {
      firstName: 'Joe',
      lastName: 'Buck',
      email: 'new1@otechie.com',
      password: 'Password1'
    }
    let res = await C.auth.register(user)
    res.should.have.status(200)
    res = await Auth.findByEmail('new1@otechie.com')
    res.should.have.property('user')
    res.should.have.property('emailNormalized').eql(user.email)
    res.should.have.property('emailConfirmToken')
    res.should.have.property('emailConfirmed').equal(false)
    res = await C.user.editEmail({ email: 'new1@otechie.com', password: 'Password1' })
    res.should.have.status(422)

    user = {
      firstName: 'Joe2',
      lastName: 'Buckless',
      email: 'new4@otechie.com',
      password: 'Password1'
    }
    res = await A.auth.register(user)
    res.should.have.status(200)
    res = await Auth.findByEmail('new4@otechie.com')
    res.should.have.property('user')
    res.should.have.property('emailNormalized').eql(user.email)
    res.should.have.property('emailConfirmToken')
    res.should.have.property('emailConfirmed').equal(false)

    // Cannot make same normalized email as another user
    res = await C.user.editEmail({ email: 'New4@otechie.com', password: 'Password1' })
    res.should.have.status(422)
    return null
  })
  it('it should throw a 401 with the wrong password', async () => {
    const res = await C.user.editEmail({ email: 'new2@otechie.com', password: 'password' })
    res.should.have.status(401)
    return null
  })
  it('email should successfully change', async () => {
    let res = await C.user.editEmail({ email: 'New2@otechie.com', password: 'Password1' })
    res.should.have.status(200)
    res.body.should.have.property('firstName').equals('Joe')
    res.body.should.have.property('lastName').equals('Buck')
    res.body.should.have.property('email').equals('New2@otechie.com')

    res = await C.auth.checkEmail('new2@otechie.com')
    res.should.have.status(200)
    res.body.should.have.property('available').equal(true)
    res = await C.auth.checkEmail('new1@otechie.com')
    res.should.have.status(200)
    res.body.should.have.property('available').equal(true)

    res = await C.auth.checkEmail('new21@otechie.com')
    res.should.have.status(200)
    res.body.should.have.property('available').equal(true)

    res = await C.auth.checkEmail('New2@otechie.com')
    res.should.have.status(200)
    res.body.should.have.property('available').equal(false)

    res = await A.auth.checkEmail('new2@otechie.com')
    res.should.have.status(200)
    res.body.should.have.property('available').equal(false)
    await C.auth.logout()

    res = await C.auth.login({
      password: 'Password1',
      email: 'new2@otechie.com'
    })
    res.should.have.status(200)
    res.body.should.have.property('accessToken')
    res.body.should.have.property('user')

    res = await C.user.myUser()
    res.should.have.status(200)
    res.body.should.have.property('firstName').equals('Joe')
    res.body.should.have.property('lastName').equals('Buck')
    res.body.should.have.property('email').equals('New2@otechie.com')

    res = await Auth.findByEmail('New2@otechie.com')
    res = await C.auth.confirmEmail({ token: res.emailConfirmToken })
    res.should.have.status(200)
    res.body.should.be.a('object')
    res.body.should.have.property('accessToken')
    return null
  })
  return null
})
