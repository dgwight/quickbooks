process.env.NODE_ENV = 'test'

const chai = require('chai')
const nock = require('nock')
const chaiHttp = require('chai-http')
const API = require('./api/base')
const A = new API()
const B = new API()

const { setupBot } = require('./utils')

chai.use(chaiHttp)

describe('Consultant Tests', () => {
  beforeEach(setupBot)

  it('Account', async () => {
    let res = await A.chat.myChats()
    res.should.have.status(200)
    res.body.length.should.equal(0)

    res = await A.auth.register({
      email: 'test@otechie.com',
      password: 'Password1',
      firstName: 'Test',
      lastName: 'Wight'
    })
    res.should.have.status(200)
    res.body.should.have.property('accessToken')
    res.body.should.have.property('user')
    res.should.have.status(200)

    res = await A.account.checkUsername('test')
    res.should.have.status(200)
    res.body.should.have.property('available').equals(true)
    res.body.should.have.property('username').equals('test')

    res = await A.account.createAccount({ name: 'Test', username: 'test' })
    const account = res.body
    res.should.have.status(200)
    account.should.have.property('object').equals('Account')
    account.should.have.property('name').equals('Test')
    account.should.have.property('id')
    const accountId = account.id

    res = await A.account.updateAccount({ username: 'tset' }, accountId)
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Account')
    res.body.should.have.property('username').equals('tset')
    res.body.should.have.property('name').equals('Test')

    res = await A.account.updateAccount({ username: 'test', name: 'OK' }, accountId)
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Account')
    res.body.should.have.property('username').equals('test')
    res.body.should.have.property('name').equals('OK')
    res.body.should.have.property('onboardingWidgetInstalled').equals(false)

    res = await A.account.setWidgetInstalled(accountId)
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Account')
    res.body.should.have.property('username').equals('test')
    res.body.should.have.property('name').equals('OK')
    res.body.should.have.property('onboardingWidgetInstalled').equals(true)

    res = await A.account.getActiveAccount()
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Account')
    res.body.users.length.should.equal(1)
    res.body.users[0].should.have.property('fullName')
    res.body.users[0].should.have.property('email')

    res = await A.account.checkUsername('test', accountId)
    res.should.have.status(200)
    res.body.should.have.property('available').equals(true)
    res.body.should.have.property('username').equals('test')

    res = await B.auth.register({
      email: 'test2@otechie.com',
      password: 'Password1',
      firstName: 'Test',
      lastName: 'Wight'
    })

    res.should.have.status(200)

    res = await B.account.checkUsername('test')
    res.should.have.status(200)
    res.body.should.have.property('available').equals(false)
    res.body.should.have.property('username').equals('test')
    res.should.have.status(200)

    res = await A.chat.myChats()
    res.should.have.status(200)
    res.body.length.should.equal(2)
    const chatId = res.body[0].id

    res = await A.user.myUser()
    res.should.have.status(200)
    res.body.accounts.length.should.equal(1)

    res = await A.message.addMessage({
      chat: chatId,
      tempId: 'tempId3',
      text: 'slack and discord'
    })
    res.should.have.status(200)

    res = await A.flow.createFlow({ name: 'Custom Services' })
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Flow')
    res.body.should.have.property('name').equals('Custom Services')
    res.body.steps.length.should.equal(4)
    res.body.steps[0].should.have.property('type').equals('EMAIL')
    res.body.steps[1].should.have.property('type').equals('NAME')
    res.body.steps[2].should.have.property('type').equals('COMPANY')
    res.body.steps[3].should.have.property('type').equals('MESSENGER')
    const flowId = res.body.id

    res = await A.flow.editFlow(flowId, { bad: 'Custom Services 2' })
    res.should.have.status(422)

    res = await A.account.connectStripeAccount('test')
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Account')
    res.body.should.have.property('stripeAccountId').equals('acct_1CgHSJD8sHwWJsmZ')

    res = await A.flow.editFlow(flowId, { name: 'Custom Services 2' })

    res.should.have.status(200)
    res.body.should.have.property('object').equals('Flow')
    res.body.should.have.property('name').equals('Custom Services 2')

    res = await A.account.connectStripeAccount('ac_123456789')
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Account')
    res.body.should.have.property('stripeAccountId').equals('acct_1CgHSJD8sHwWJsmZ')

    res = await A.flow.createFlow({ name: 'Code Review' })
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Flow')
    res.body.should.have.property('name').equals('Code Review')
    const flowId2 = res.body.id

    res = await A.flow.addStep(flowId2, {
      type: 'PAYMENT',
      amount: 10000,
      currency: 'USD',
      name: 'Code Review',
      description: 'I\'ll say whats bad with your software'
    })
    res.should.have.status(200)
    res.body.steps.length.should.equal(5)
    res.body.steps[4].should.have.property('object').equals('Step')
    res.body.steps[4].should.have.property('type').equals('PAYMENT')
    res.body.steps[4].should.have.property('amount').equals(10000)
    res.body.steps[4].should.have.property('currency').equals('USD')
    res.body.steps[4].should.have.property('name').equals('Code Review')
    res.body.steps[4].should.have.property('description').equals('I\'ll say whats bad with your software')

    res = await A.flow.deleteFlow(flowId)
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Flow')

    res = await A.flow.getFlows()
    res.should.have.status(200)
    res.body.length.should.equal(1)
    res.body[0].should.have.property('object').equals('Flow')
    res.body[0].should.have.property('name').equals('Code Review')

    res = await A.flow.deleteFlow(flowId2)
    res.should.have.status(200)
    res.body.should.have.property('object').equals('Flow')

    res = await A.flow.getFlows()
    res.should.have.status(200)
    res.body.length.should.equal(0)
  })
})
