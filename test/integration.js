/* eslint-disable no-undef,no-unused-expressions */
process.env.NODE_ENV = 'test'
const chai = require('chai')
const chaiHttp = require('chai-http')
const API = require('./api/base')
const A = new API()
const B = new API()
const C = new API()
const D = new API()
const E = new API()
const F = new API()
const G = new API()
const H = new API()

const Account = require('../src/model/account')
const Auth = require('../src/model/auth')
const Invitation = require('../src/model/invitation')
const Message = require('../src/model/message')
const Invoice = require('../src/model/invoice')
const Stripe = require('../src/service/Stripe')

const { setupBot } = require('./utils')
const { last, first } = require('lodash')

chai.use(chaiHttp)

describe('Integration', () => {
  beforeEach(setupBot)

  it('Main', async () => {
    await githubLogin()
    let account = await createAccount()
    await defaultFlow(account)
    account = await setupConsultant(account)
    await getBadge(account)
    let { chat, user, auth } = await beginChat(account)
    await setPassword(user, auth)
    await joinAccount(account)
    await uploadFile()
    chat = await updateChatState()
    const messages = await checkMessages(chat.id)
    await viewMessages(messages)
    await assigning(chat, user)
    await emailMessages(chat)
    const invoiceChat = await invoicing(chat)
    await checkChats(chat, account, user)
    await addMember(chat)
    await internalChat()
    await stripeWebhook(invoiceChat)
    await invoiceStatuses(chat)
    await invoiceBeforeRegister(account)
    await cleanupAccounts(account, user)
  })
})

async function githubLogin () {
  let res = await A.auth.githubLogin('code')
  res.should.have.status(200)
  res.body.should.have.property('accessToken')
  res.body.should.have.property('user')

  res = await A.user.myUser()
  res.should.have.status(200)
  res.body.should.not.have.property('password')
  res.body.should.not.have.property('emailConfirmed')
  res.body.should.not.have.property('emails')
  res.body.should.not.have.property('emailConfirmToken')
  res.body.should.not.have.property('resetPasswordToken')
  res.body.should.have.property('firstName').equals('Dylan')
  res.body.should.have.property('lastName').equals('Wight')
  res.body.should.have.property('email').equals('test@otechie.com')
  res.body.should.have.property('object').equals('User')
  res.body.should.not.have.property('githubId').equals('id')
  return res.body
}

async function createAccount () {
  let res = await A.account.createAccount({
    name: 'Consultant',
    username: 'consultant'
  })
  res.should.have.status(200)
  res.body.should.have.property('owner')
  res.body.should.have.property('name').equals('Consultant')
  res.body.should.have.property('activated').equals(true)
  const account = res.body

  res = await A.user.myUser()
  res.should.have.status(200)
  res.body.should.have.property('object').equals('User')
  res.body.accounts.length.should.equal(1)

  return account
}

async function defaultFlow (account) {

  let res = await A.flow.createFlow({ name: 'Free Help' })
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Flow')
  res.body.should.have.property('name').equals('Free Help')
  res.body.steps.length.should.equal(4)
  res.body.steps[0].should.have.property('type').equals('EMAIL')
  res.body.steps[1].should.have.property('type').equals('NAME')
  res.body.steps[2].should.have.property('type').equals('COMPANY')
  res.body.steps[3].should.have.property('type').equals('MESSENGER')
  const flowId = res.body.id

  // Can't add payment step without stripe
  res = await A.flow.addStep(flowId, {
    type: 'PAYMENT',
    name: 'No Stripe',
    description: 'can\'t add this without stripe account attached',
    amount: 10000,
    currency: 'USD'
  })
  res.should.have.status(422)
  res.body.should.have.property('error').equals('Stripe account required')

  res = await G.chat.startChat({
    consultant: account.id,
    flow: flowId
  })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('flow').equals(flowId)
  res.body.chat.should.have.property('preview').equals('New Client: Selected Free Help')
  res.body.chat.should.have.property('consultant').equals(account.id)
  res.body.auth.should.have.property('object').equals('Auth')
  res.body.auth.should.have.property('user')
  res.body.auth.should.have.property('accessToken')
  const authId = res.body.auth.id
  res.body.user.should.have.property('object').equals('User')
  res.body.user.should.have.property('hasPassword').equals(false)
  res.body.should.have.property('messages')
  res.body.messages.length.should.equal(2)
  res.body.messages[0].should.have.property('text').equals('Hi there! How can we help you get started?')
  res.body.messages[1].should.have.property('text').equals('Selected Free Help')
  res.body.messages[1].should.have.property('event').equals('FLOW_SELECTED')

  const auth = await Auth.findById(authId)
  auth.should.be.a('object')
  auth.should.have.property('resetPasswordToken')
  auth.should.have.property('resetPasswordExpires')

  res = await G.auth.setPassword({ password: 'Password1', token: auth.resetPasswordToken })
  res.should.have.status(200)
  res.body.should.have.property('accessToken')
  res.body.should.have.property('user')

  res = await G.user.myUser()
  res.body.should.have.property('object').equals('User')
  res.body.should.have.property('hasPassword').equals(true)

  res = await G.auth.googleLogin({ token: 'test' })
  res.should.have.status(200)
  res.body.should.have.property('accessToken')
  res.body.should.have.property('user')

  res = await A.flow.deleteFlow(flowId)
  res.should.have.status(200)
}

async function setupConsultant (account) {
  res = await A.account.getAccount(account.id, true)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('name').equals('Consultant')
  res.body.should.have.property('avatarUrl')
  res.body.should.have.property('widgetColor')
  res.body.should.have.property('about')

  res = await A.account.updateAccount({ avatarUrl: 'test' }, account.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('avatarUrl').equals('test')
  res.body.should.have.property('name').equals('Consultant')

  res = await A.account.updateAccount({
    username: 'new',
    hourlyRate: 25000
  }, account.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('hourlyRate').equals(25000)
  res.body.should.have.property('username').equals('new')

  res = await A.account.connectStripeAccount('test')
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('stripeAccountId').equals('acct_1CgHSJD8sHwWJsmZ')

  res = await A.flow.createFlow({ name: 'Help' })
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Flow')
  res.body.should.have.property('name').equals('Help')
  const flowId = res.body.id

  res = await A.flow.addStep(flowId, {
    type: 'PAYMENT',
    name: 'Help',
    description: 'Get help from me!',
    amount: 10000,
    currency: 'USD'
  })
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Flow')
  res.body.steps[4].should.have.property('object').equals('Step')
  res.body.steps[4].should.have.property('type').equals('PAYMENT')
  res.body.steps[4].should.have.property('description').equals('Get help from me!')
  res.body.steps[4].should.have.property('amount').equals(10000)
  res.body.steps[4].should.have.property('currency').equals('USD')
  res.body.steps[4].should.have.property('name').equals('Help')

  const stepId = res.body.steps[4].id

  res = await A.flow.editStep(flowId, stepId, {
    type: 'PAYMENT',
    name: 'Help',
    description: 'get the helpiest help',
    amount: 10000,
    currency: 'USD'
  })
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Flow')
  res.body.steps[4].should.have.property('description').equals('get the helpiest help')

  // No currency
  res = await A.flow.addStep(flowId, {
    type: 'PAYMENT',
    name: 'Help',
    description: 'Get help from me!',
    amount: 10000
  })
  res.should.have.status(422)

  res = await A.flow.createFlow({ name: 'Really Helping' })
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Flow')
  res.body.should.have.property('name').equals('Really Helping')
  const flowId2 = res.body.id

  res = await A.flow.addStep(flowId2, {
    type: 'PAYMENT',
    name: 'Really Helping',
    description: 'Get lots and lots of help from me!',
    amount: 40000,
    currency: 'USD'
  })
  res.should.have.status(200)

  // Existing basic plan
  // TODO: create subscription for test
  res = await A.stripeWebhook('checkout.session.completed', {
    client_reference_id: account.id,
    subscription: 'sub_1JgCnVL4UL1LoRSgi9PiOrMQ',
    customer: 'testCust'
  })
  res.should.have.status(200)

  res = await A.account.getActiveAccount()
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('activated').equals(true)
  res.body.should.have.property('subscriptionId').equals('sub_1JgCnVL4UL1LoRSgi9PiOrMQ')
  res.body.should.have.property('usedTrial').equals(true)
  res.body.should.have.property('plan').equals('BASIC')
  res.body.should.have.property('stripeId').equals('testCust')

  // Changing to existing pro plan
  // TODO: create subscription for test
  res = await A.stripeWebhook('checkout.session.completed', {
    client_reference_id: account.id,
    subscription: 'sub_1JgCrML4UL1LoRSgjphNN0P3',
    customer: 'testCust2'
  })
  res.should.have.status(200)

  res = await A.account.getActiveAccount()
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('activated').equals(true)
  res.body.should.have.property('subscriptionId').equals('sub_1JgCrML4UL1LoRSgjphNN0P3')
  res.body.should.have.property('usedTrial').equals(true)
  res.body.should.have.property('plan').equals('PRO')
  res.body.should.have.property('stripeId').equals('testCust2')

  return res.body
}

async function getBadge (account) {
  let res = await Account.findById(account.id)
  account.users.should.be.an('array')

  res = await A.account.getAccount(account.owner)
  res.should.have.status(404)

  res = await A.account.getAccount(account.id)
  res.should.have.status(200)

  // check for case where username matches objectId params
  const otechie = await Account.findByIdOrUsername('otechie')
  otechie.should.have.property('object').equals('Account')

  res = await A.account.getAccount(account.id)
  res.should.have.status(200)
  res.body.should.have.property('username').equals(account.username)

  res = await A.getBadge('consultantAccount.username')
  res.should.have.status(404)
  res.body.should.be.empty

  res = await A.getBadge(account.username)
  res.should.have.status(200)
  res.body.should.be.a('Uint8Array')

  res = await A.getBadge2(account.username)
  res.should.have.status(200)
  res.body.should.be.a('Uint8Array')

  res = await A.testError()
  res.should.have.status(500)
  res.body.should.have.property('error').equals('TEST ERROR')
}

async function beginChat (account) {
  let res = await D.auth.register({
    email: 'dana.c.stiefel@gmail.com',
    firstName: 'First',
    lastName: 'Last',
    password: 'Password1'
  })
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Auth')
  res.body.should.have.property('user')
  res.body.should.have.property('accessToken')

  res = await D.chat.startChat({
    flow: account.flows[1].id,
    consultant: account.id
  })

  res.should.have.status(200)
  res.body.user.should.have.property('object').equals('User')
  res.body.account.should.have.property('object').equals('Account')
  res.body.account.should.have.property('name').equals('First Last')
  const clientAccount = res.body.account
  const message = res.body.messages[1]
  const clientChat = res.body.chat

  // Make sure error is not thrown is message is deleted for some reason
  await Message.deleteOne({ _id: message.id })
  res = await D.chat.getChat(clientChat.id)
  res.should.have.status(200)
  res.body.should.have.property('preview').equals('This is the very beginning of your chat with Consultant.')

  res = await D.message.getMessage(message.id)
  res.should.have.status(404)

  res = await A.message.addMessage({
    chat: clientChat.id,
    tempId: 'tempIdz',
    text: 'Auto-assign me'
  })
  res.should.have.status(200)
  res.body.chat.assignees.length.should.equal(1)

  // Re-add the deleted message
  res = await D.message.addMessage({
    chat: clientChat.id,
    tempId: 'tempIdz',
    text: 'Yo!'
  })
  res.should.have.status(200)
  // Make sure didn't auto-assign
  res.body.chat.assignees.length.should.equal(1)

  res = await D.account.updateAccount({
    name: 'billToThisName',
    billingEmail: 'dana.c.stiefel@gmail.co'
  }, clientAccount.id)
  res.should.have.status(200)
  res.body.should.have.property('name').equals('billToThisName')
  res.body.should.have.property('billingEmail').equals('dana.c.stiefel@gmail.co')

  res = await B.account.getAccount(account.username)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('username').equals(account.username)
  res.body.should.have.property('widgetColor').equals(account.widgetColor)

  res = await B.auth.register({
    email: 'dylanGwight2@gmail.com',
    firstName: 'Client',
    lastName: 'Man',
    password: 'Password1'
  })
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Auth')
  res.body.should.have.property('user')
  res.body.should.have.property('accessToken')
  const auth = res.body

  res = await B.user.myUser()
  res.should.have.status(200)
  res.body.should.have.property('object').equals('User')
  res.body.should.have.property('firstName').equals('Client')
  res.body.should.have.property('lastName').equals('Man')
  res.body.should.have.property('email').equals('dylanGwight2@gmail.com')
  const user = res.body

  res = await B.chat.startChat({
    flow: account.flows[0].id,
    text: 'Hi!',
    consultant: account.id
  })
  res.should.have.status(200)
  const chat = res.body.chat
  chat.should.have.property('object').equals('Chat')
  chat.should.have.property('consultant')
  chat.should.have.property('id')
  chat.should.have.property('url')

  res.body.account.should.have.property('name').equals('Client Man')
  const clientId = res.body.account.id

  // TODO: Duplicate to test expiring hold

  // don't create second chat between user and account
  res = await B.chat.startChat({
    consultant: account.id,
    text: 'Hi2!'
  })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('consultant')
  res.body.chat.should.have.property('id')
  res.body.chat.should.have.property('url')
  res.body.account.should.have.property('name').equals('Client Man')
  // res.body.should.have.property('invoice')
  // res.body.invoice.should.have.property('object').equals('Invoice')
  // res.body.invoice.should.have.property('captured').equals(false)
  // res.body.invoice.should.have.property('paid').equals(false)

  // res = await A.invoice.getInvoices(res.body.chat.id)
  // res.should.have.status(200)
  // res.body.length.should.equal(4)
  // res.body[0].should.have.property('object').equals('Invoice')
  // res.body[0].should.have.property('amount').equals(40000)
  // res.body[0].should.have.property('currency').equals('USD')
  // res.body[0].should.have.property('stripeIntent')
  // res.body[0].should.have.property('stripeUrl').contains('payments')
  // res.body[0].should.have.property('status').equals('UNCAPTURED')
  // res.body[0].should.have.property('captured').equals(false)
  // res.body[0].should.have.property('paid').equals(false)
  // res.body[1].should.have.property('object').equals('Invoice')
  // res.body[1].should.have.property('amount').equals(10000)
  // res.body[1].should.have.property('currency').equals('USD')
  // res.body[1].should.have.property('stripeIntent')
  // res.body[1].should.have.property('stripeUrl').contains('payments')
  // res.body[1].should.have.property('status').equals('UNCAPTURED')
  // res.body[1].should.have.property('captured').equals(false)
  // res.body[1].should.have.property('paid').equals(false)
  // const invoiceId = res.body[1].id
  //
  // res = await A.invoice.captureCharge(invoiceId)
  // res.should.have.status(200)
  // res.body.should.not.have.property('auth')
  // res.body.chat.should.have.property('id').equals(chatId)
  // res.body.chat.should.have.property('object').equals('Chat')
  // res.body.chat.should.have.property('consultant')
  // res.body.chat.should.have.property('id')
  // res.body.chat.should.have.property('url')
  // res.body.message.should.have.property('event').equals('COMPLETED')
  // res.body.message.should.have.property('text').equals('Charged the $100.00 invoice')
  // res.body.message.user.should.have.property('fullName').equals('Dylan Wight')
  // res.body.invoice.should.have.property('paid').equals(true)
  // res.body.invoice.should.have.property('captured').equals(true)
  // res.body.invoice.should.have.property('amount').equals(10000)
  // res.body.invoice.should.have.property('currency').equals('USD')
  // res.body.invoice.should.have.property('stripeUrl').contains('invoice')
  // res.body.invoice.should.have.property('paymentUrl')
  // res.body.invoice.should.have.property('pdfUrl')
  //
  // res = await A.invoice.captureCharge(invoiceId)
  // res.should.have.status(422)
  // res.body.should.have.property('error').equals('Invoice has already been captured')

  res = await B.message.addMessage({
    chat: chat.id,
    tempId: 'tempId',
    text: 'text'
  })
  res.should.have.status(200)
  res.body.message.should.have.property('object').equals('Message')
  res.body.message.should.have.property('user')
  res.body.message.user.should.have.property('firstName')
  res.body.message.user.should.have.property('lastName')
  res.body.message.user.should.have.property('fullName')
  res.body.message.user.should.have.property('avatarUrl')
  res.body.message.user.should.have.property('id')
  res.body.message.should.have.property('text').equals('text')
  res.body.message.should.not.have.property('event')

  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('avatarUrl')
  res.body.chat.should.have.property('name').equals('Consultant')

  // D is a User without permission to view chat
  res = await D.chat.getChat(chat.id)
  res.should.have.status(401)
  res.body.should.not.have.property('object')
  return { chat, user, auth, clientId }
}

async function setPassword (user, auth) {
  let res = await B.auth.setPassword({ password: 'Password1', currentPassword: 'bad' })
  res.should.have.status(401)
  res.body.should.have.property('error').equals('Password is invalid')

  await B.auth.logout()

  res = await B.auth.forgotPassword({ email: user.email })
  res.should.have.status(200)
  res.body.should.have.property('status').equals('Reset password email sent')

  const { resetPasswordToken } = await Auth.findById(user.auth)
  res = await B.auth.setPassword({ token: resetPasswordToken, password: 'Password2' })
  res.should.have.status(200)
  res.body.should.have.property('accessToken').equals(auth.accessToken)
  res.body.should.have.property('user').equals(auth.user)

  auth = await Auth.findById(user.auth)
  auth.should.have.property('password')
  auth.should.have.property('emailConfirmed').equals(true)

  res = await B.auth.setPassword({ password: 'Password3' })
  res.should.have.status(401)
  res.body.should.have.property('error').equals('Password is invalid')

  res = await B.auth.setPassword({ currentPassword: 'Password2', password: 'Password3' })
  res.should.have.status(200)

  await B.auth.logout()

  res = await B.auth.setPassword({ token: resetPasswordToken, password: 'Password4' })
  res.should.have.status(401)

  res = await B.auth.login({ email: user.email, password: 'Password3' })
  res.should.have.status(200)
}

async function joinAccount (account) {
  let res = await A.account.sendInvites({ emails: ['dylan@otechie.com', 'quickname82@gmail.com'] }, account.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('name')
  let invitation = await Invitation.findOne({ account: account.id, email: 'dylan@otechie.com' })
  const invitation2 = await Invitation.findOne({ account: account.id, email: 'quickname82@gmail.com' })

  res = await B.account.join(invitation.token)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.users.length.should.equal(2)

  res = await E.auth.register({
    firstName: 'Billy',
    lastName: 'Black',
    email: 'quickname82@gmail.com',
    password: 'Password1'
  })
  res.should.have.status(200)

  res = await E.account.join(invitation2.token)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.users.length.should.equal(3)

  res = await B.account.join(invitation.token)
  res.should.have.status(401)

  res = await E.account.join(invitation.token)
  res.should.have.status(401)

  let invitations = await Invitation.find({ token: invitation.token })
  invitations.length.should.equal(0)

  res = await B.user.myUser()
  res.should.have.status(200)

  res = await A.account.removeMember(account.id, res.body.id)
  res.should.have.status(200)
  res.body.account.should.have.property('object').equals('Account')
  res.body.account.users.length.should.equal(2)

  res = await A.account.sendInvites({ emails: ['dylan@otechie.com'] }, account.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('name')
  invitation = await Invitation.findOne({ account: account.id, email: 'dylan@otechie.com' })

  res = await B.account.join(invitation.token)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.users.length.should.equal(3)

  invitations = await Invitation.find({ account: account.id, email: 'dylan@otechie.com' })
  invitations.length.should.equal(0)

  res = await A.account.getUsernames()
  res.should.have.status(200)
  res.body.should.be.an('array')
  res.body.length.should.equal(2)
  res.body[0].should.equal('otechie')
  res.body[1].should.equal('new')

  res = await B.chat.myChats()
  res.should.have.status(200)
  res.body.length.should.equal(5)
}

async function uploadFile () {
  const res = await A.getSignedUrl({ file: 'test.png' })
  res.should.have.status(200)
  res.body.should.have.property('postEndpoint').equals('https://s3.amazonaws.com/cdn.otechie.com')
  res.body.signature.should.have.property('key')
  res.body.signature.should.have.property('acl').equals('public-read')
  res.body.signature.should.have.property('success_action_status').equals('201')
  res.body.signature.should.have.property('bucket').equals('cdn.otechie.com')
  res.body.signature.should.have.property('X-Amz-Algorithm')
  res.body.signature.should.have.property('X-Amz-Credential')
  res.body.signature.should.have.property('X-Amz-Date')
  res.body.signature.should.have.property('Policy')
  res.body.signature.should.have.property('X-Amz-Signature')
}

async function updateChatState () {
  let res = await A.chat.myChats()
  res.should.have.status(200)
  res.body.length.should.equal(5)
  res.body[1].should.have.property('object').equals('Chat')
  res.body[1].should.have.property('muted').equals(false)
  const chatId = res.body[1].id

  res = await A.chat.setMuted(chatId, true)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Chat')
  res.body.should.have.property('id').equals(chatId)
  res.body.should.have.property('muted').equals(true)

  res = await A.chat.myChats()
  res.should.have.status(200)
  res.body.length.should.equal(5)
  res.body[1].should.have.property('object').equals('Chat')
  res.body[1].should.have.property('muted').equals(true)
  return res.body[1]
}

async function checkMessages (chatId) {
  const res = await A.message.getMessages(chatId)
  res.should.have.status(200)
  res.body.length.should.equal(5)
  let i = 0
  res.body[i].form.should.have.property('field').equals('EMAIL')
  res.body[i].should.have.property('text').equals('Requested your email')
  res.body[i].should.have.property('bot').equals(true)
  i++
  res.body[i].should.have.property('tempId')
  res.body[i].should.have.property('text').equals('text')
  i++
  res.body[i].should.have.property('tempId')
  res.body[i].should.have.property('text').equals('Hi2!')
  i++
  res.body[i].should.have.property('text').equals('Selected Help')
  res.body[i].should.have.property('event').equals('FLOW_SELECTED')
  res.body[i].should.have.property('bot').equals(false)
  i++
  res.body[i].should.have.property('text').equals('Hi there! How can we help you get started?')
  res.body[i].should.have.property('bot').equals(false)

  return res.body
}

async function viewMessages (messages) {
  const lastMessageTime = last(messages).createdAt
  let res = await A.chat.clearUnread(messages[0].chat)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Chat')
  res.body.should.have.property('hasNewMessages').equals(false)
  res.body.should.have.property('id').equals(messages[0].chat)
  res.body.should.have.property('consultant')
  res.body.should.have.property('preview').equals('Consultant: Requested your email')

  res = await B.message.addMessage({
    chat: messages[0].chat,
    tempId: 'tempIddasfz',
    text: 'Edit me'
  })
  res.should.have.status(200)
  const messageId = res.body.message.id

  res = await A.message.getMessage(messageId)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Message')
  res.body.should.have.property('id')
  res.body.should.have.property('text').equals('Edit me')
  res.body.should.have.property('createdAt')
  res.body.should.have.property('updatedAt')
  res.body.should.have.property('tempId')
  res.body.should.have.property('chat').equals(messages[0].chat)
  res.body.user.should.have.property('id')
  res.body.user.should.have.property('fullName')
  res.body.user.should.have.property('avatarUrl')
  res.body.user.should.have.property('object').equals('User')
  const bogusId = messages[0].chat

  res = await A.message.getMessage(bogusId)
  res.should.have.status(404)

  res = await A.message.getMessages(messages[0].chat, lastMessageTime)
  res.should.have.status(200)
  res.body.length.should.equal(0)

  res = await A.message.editMessage({ id: messageId, text: 'Hi! 2' })
  res.should.have.status(401)

  res = await A.message.deleteMessage(messageId)
  res.should.have.status(401)

  res = await B.user.myUser()
  res.should.have.status(200)
  res.body.should.have.property('object').equals('User')

  res = await B.message.editMessage({ id: messageId, text: 'Hi! 2' })
  res.should.have.status(200)
  res.body.chat.should.have.property('name').equals('Client from Client Man')
  res.body.chat.should.have.property('preview').equals('Client: Hi! 2')
  res.body.message.should.have.property('object').equals('Message')
  res.body.message.should.have.property('id').equals(messageId)
  res.body.message.should.have.property('text').equals('Hi! 2')
  res.body.message.should.have.property('edited').equals(true)

  res = await B.message.deleteMessage(messageId)
  res.should.have.status(200)
  res.body.chat.should.have.property('name').equals('Client from Client Man')
  res.body.chat.should.have.property('preview').equals('Consultant: Requested your email')
  res.body.message.should.have.property('object').equals('Message')
  res.body.message.should.have.property('id').equals(messageId)
  res.body.message.should.have.property('text').equals('Hi! 2')
  res.body.message.should.have.property('edited').equals(true)
}

async function assigning (chat) {
  const consultant = await Account.findById(chat.consultant)
  const userA = first(consultant.users).id
  const userB = last(consultant.users).id
  let res = await A.chat.setAssignees({ users: [userA] }, chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('assignees')
  res.body.chat.assignees.length.should.equal(1)
  res.body.chat.assignees[0].should.have.property('id').equals(userA)
  res.body.message.should.have.property('text').equals('Assigned themself')
  res.body.message.should.have.property('event').equals('SET_ASSIGNEES')
  // duplicate assignment
  res = await A.chat.setAssignees({ users: [userA] }, chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('assignees')
  res.body.chat.assignees.length.should.equal(1)
  res.body.chat.assignees[0].should.have.property('id').equals(userA)

  res = await B.chat.getChat(res.body.chat.id)
  res.should.have.status(200)

  res = await A.chat.setAssignees({ users: [userA, userB] }, chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('assignees')
  res.body.chat.assignees.length.should.equal(2)
  res.body.chat.assignees[1].should.have.property('id').equals(userB)
  res.body.message.should.have.property('text').equals('Set assignees: Dylan, Client')
  res.body.message.should.have.property('event').equals('SET_ASSIGNEES')

  res = await B.chat.getChat(res.body.chat.id)
  res.should.have.status(200)

  res = await A.chat.setAssignees({ users: [userB] }, chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('assignees')
  res.body.chat.assignees.length.should.equal(1)
  res.body.chat.assignees[0].should.have.property('id').equals(userB)

  res = await A.chat.setAssignees({ users: [] }, chat.id)
  res.should.have.status(200)
  res.body.chat.assignees.length.should.equal(0)
  res.body.message.should.have.property('text').equals('Cleared the assignees')
  res.body.message.should.have.property('event').equals('SET_ASSIGNEES')
}

async function emailMessages (chat) {
  let res = await F.auth.register({
    email: 'newclient@otechie.com',
    password: 'Password1',
    firstName: 'ConE',
    lastName: 'Eel'
  })
  res.should.have.status(200)

  res = await F.account.createAccount({
    name: 'Consultant2',
    username: 'consultant2'
  })
  res.should.have.status(200)
  res.body.should.have.property('owner')
  res.body.should.have.property('name').equals('Consultant2')
  const newClientAccount = res.body

  res = await F.account.getAccount(chat.consultant)
  res.should.have.status(200)
  const flowId = res.body.flows[0].id

  // Create chat without message
  res = await F.chat.startChat({
    flow: flowId,
    consultant: chat.consultant
  })
  res.should.have.status(200)
  const chatId = res.body.chat.id

  res = await F.chat.relayEmail({
    from: 'newclient@otechie.com',
    to: `${chat.id}@${process.env.MAIL_DOMAIN}`,
    subject: 'Test Image',
    text: 'stripped-text',
    attachments: '[{ "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "image/png", "name": "otechie-ci-sm.png", "size": 10225 }, { "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "text", "name": "otechie-ci-sm.png", "size": 10225 }]'
  })
  res.should.have.status(200)
  res.body.should.equals(true)

  // consultant responds
  res = await A.chat.relayEmail({
    from: 'test@otechie.com',
    to: `${chat.id}@${process.env.MAIL_DOMAIN}`,
    subject: 'Re: Test Image',
    text: 'stripped-text',
    attachments: '[{ "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "image/png", "name": "otechie-ci-sm.png", "size": 10225 }, { "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "text", "name": "otechie-ci-sm.png", "size": 10225 }]'
  })
  res.should.have.status(200)
  res.body.should.equals(true)

  // client responds
  res = await A.chat.relayEmail({
    from: 'New Client <newClient@otechie.com>',
    to: `${chatId}@${process.env.MAIL_DOMAIN}`,
    subject: 'Re: Test Image',
    text: 'stripped-text',
    attachments: '[{ "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "image/png", "name": "otechie-ci-sm.png", "size": 10225 }, { "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "text", "name": "otechie-ci-sm.png", "size": 10225 }]'
  })
  res.should.have.status(200)
  res.body.should.equals(true)

  // Client that now exists to new username email
  res = await A.chat.relayEmail({
    from: 'newClient@otechie.com',
    to: `${chatId}@${process.env.MAIL_DOMAIN}`,
    subject: 'Test Image',
    text: 'stripped-text',
    attachments: '[{ "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "image/png", "name": "otechie-ci-sm.png", "size": 10225 }, { "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "text", "name": "otechie-ci-sm.png", "size": 10225 }]'
  })
  res.should.have.status(200)
  res.body.should.equals(true)

  res = await F.chat.myChats()
  res.body.length.should.equal(3)
  let i = 0
  res.body[i].client.name.should.equal('Consultant2')
  i++
  res.body[i].client.name.should.equal('Consultant2')
  i++
  res.body[i].client.name.should.equal('Consultant2')

  res = await A.chat.relayEmail({
    from: 'test@otechie.com',
    to: `${chatId}@${process.env.MAIL_DOMAIN}`,
    subject: 'Test Image',
    text: 'stripped-text',
    attachments: '[{ "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "image/png", "name": "otechie-ci-sm.png", "size": 10225 }, { "url": "https://cdn.otechie.com/attachments/cWfYAoVG/otechie-ci-sm.png", "content-type": "text", "name": "otechie-ci-sm.png", "size": 10225 }]'
  })
  res.should.have.status(200)
  res.body.should.equals(true)

  res = await A.chat.relayEmail({
    from: 'test@otechie.com',
    to: `${chatId}@${process.env.MAIL_DOMAIN}`,
    subject: 'Test Subject',
    text: 'stripped-text'
  })
  res.should.have.status(200)
  res.body.should.equals(true)

  // bad recipient
  res = await A.chat.relayEmail({
    from: 'dylan@otechie.com',
    to: `chat@${process.env.MAIL_DOMAIN}`,
    subject: 'Bad Subject',
    text: 'stripped-text'
  })
  res.should.have.status(200)
  res.body.should.equals(false)
}

async function invoicing (chat) {
  let res = await A.chat.addItem(chat.id, { amount: 6250, description: '15 minutes' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(6250)
  res.body.chat.upcomingItems[0].should.have.property('currency').equals('USD')

  res.body.message.should.have.property('object').equals('Message')
  res.body.message.should.have.property('user')
  res.body.message.user.should.have.property('firstName')
  res.body.message.user.should.have.property('lastName')
  res.body.message.user.should.have.property('fullName')
  res.body.message.user.should.have.property('avatarUrl')
  res.body.message.user.should.have.property('id')
  res.body.message.should.have.property('event').equals('ITEM_ADDED')
  res.body.message.should.have.property('text').equals('Added item: 15 minutes - $62.50')

  res = await E.chat.addItem(chat.id, { amount: 5000, description: 'Project Done', currency: 'EUR' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(6250)
  res.body.chat.upcomingItems[0].should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[1].should.have.property('amount').equals(5000)
  res.body.chat.upcomingItems[1].should.have.property('currency').equals('EUR')
  res.body.message.should.have.property('event').equals('ITEM_ADDED')
  res.body.message.should.have.property('text').equals('Updated item: 15 minutes - €62.50, Added item: Project Done - €50.00')

  res = await E.chat.addItem(chat.id, { amount: 5000, description: 'Project 2 Done', currency: 'USD' })
  res.should.have.status(200)

  res = await E.invoice.sendInvoice(chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.message.should.have.property('event').equals('INVOICE_SENT')
  res.body.message.should.have.property('text').equals('Sent an invoice for $162.50')
  res.should.have.status(200)

  // Update vat after customer is created
  res = await B.account.updateAccount({
    name: 'Client, Inc.',
    vatId: 'BE0123456789'
  }, res.body.chat.client.id)
  res.should.have.status(200)

  res = await A.chat.addItem(chat.id, { amount: 102083, description: '245 minutes', currency: 'USD' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.message.should.have.property('object').equals('Message')
  res.body.message.should.have.property('user')
  res.body.message.user.should.have.property('firstName')
  res.body.message.user.should.have.property('lastName')
  res.body.message.user.should.have.property('fullName')
  res.body.message.user.should.have.property('avatarUrl')
  res.body.message.user.should.have.property('id')
  res.body.message.should.have.property('event').equals('ITEM_ADDED')
  res.body.message.should.have.property('text').equals('Added item: 245 minutes - $1,020.83')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(102083)

  const itemId = res.body.chat.upcomingItems[0].id

  res = await A.chat.addItem(chat.id, { amount: 10000, description: 'Mas minutos', currency: 'EUR' })
  res.body.message.should.have.property('event').equals('ITEM_ADDED')
  res.body.message.should.have.property('text').equals('Updated item: 245 minutes - €1,020.83, Added item: Mas minutos - €100.00')
  res.body.chat.should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[0].should.have.property('description').equals('245 minutes')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(102083)
  res.body.chat.upcomingItems[0].should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[1].should.have.property('description').equals('Mas minutos')
  res.body.chat.upcomingItems[1].should.have.property('amount').equals(10000)
  res.body.chat.upcomingItems[1].should.have.property('currency').equals('EUR')

  res = await A.chat.updateItem(chat.id, itemId, {
    amount: 102083,
    description: '245 minas',
    currency: 'EUR'
  })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.message.should.have.property('event').equals('ITEM_UPDATED')
  res.body.message.should.have.property('text').equals('Updated item: 245 minas - €1,020.83')
  res.body.chat.should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[0].should.have.property('description').equals('245 minas')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(102083)
  res.body.chat.upcomingItems[0].should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[1].should.have.property('description').equals('Mas minutos')
  res.body.chat.upcomingItems[1].should.have.property('amount').equals(10000)
  res.body.chat.upcomingItems[1].should.have.property('currency').equals('EUR')

  res = await A.chat.updateItem(chat.id, itemId, {
    amount: 102083,
    description: '245 minos',
    currency: 'USD'
  })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.message.should.have.property('event').equals('ITEM_UPDATED')
  res.body.message.should.have.property('text').equals('Updated item: 245 minos - $1,020.83, Updated item: Mas minutos - $100.00')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.chat.upcomingItems[0].should.have.property('description').equals('245 minos')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(102083)
  res.body.chat.upcomingItems[0].should.have.property('currency').equals('USD')
  res.body.chat.upcomingItems[1].should.have.property('description').equals('Mas minutos')
  res.body.chat.upcomingItems[1].should.have.property('amount').equals(10000)
  res.body.chat.upcomingItems[1].should.have.property('currency').equals('USD')

  res = await A.chat.removeItem(chat.id, itemId)
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.message.should.have.property('event').equals('ITEM_REMOVED')
  res.body.message.should.have.property('text').equals('Removed item: 245 minos - $1,020.83')
  res.body.chat.upcomingItems.should.have.property('length').equals(1)

  res = await A.chat.addItem(chat.id, { amount: 1000, description: 'remove via stripe', currency: 'USD' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')

  res = await A.chat.addItem(chat.id, { amount: 102083, description: '245 minutes', currency: 'USD' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.message.should.have.property('object').equals('Message')
  res.body.message.should.have.property('user')
  res.body.message.user.should.have.property('firstName')
  res.body.message.user.should.have.property('lastName')
  res.body.message.user.should.have.property('fullName')
  res.body.message.user.should.have.property('avatarUrl')
  res.body.message.user.should.have.property('id')
  res.body.message.should.have.property('event').equals('ITEM_ADDED')
  res.body.message.should.have.property('text').equals('Added item: 245 minutes - $1,020.83')
  res.body.chat.upcomingItems[2].should.have.property('amount').equals(102083)

  res = await A.invoice.sendInvoice(chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.message.should.have.property('event').equals('INVOICE_SENT')
  res.body.message.should.have.property('url')
  res.body.message.should.have.property('urlTitle').equals('Pay Now')
  res.body.message.should.have.property('text').equals('Sent an invoice for $1,130.83')
  const userId = res.body.message.user.id
  const invoiceId = res.body.invoice.id

  await Invoice.updateOne({ _id: invoiceId }, { $unset: { stripeId: true } })
  res = await A.invoice.getInvoice(invoiceId)
  res.should.have.status(200)
  res.body.should.not.have.property('stripeUrl')

  await Invoice.updateOne({ _id: invoiceId }, { stripeIntent: 'stripeIntentId' })
  res = await A.invoice.getInvoice(invoiceId)
  res.should.have.status(200)
  res.body.should.have.property('stripeUrl').equals('https://dashboard.stripe.com/test/payments/stripeIntentId')

  res = await A.invoice.sendInvoice(chat.id)
  res.should.have.status(500)
  res.body.should.have.property('error').contain('Nothing to invoice for customer')

  res = await A.chat.addItem(chat.id, { amount: 40000, description: 'converting to EUR', currency: 'EUR' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(40000)
  res.body.chat.upcomingItems[0].should.have.property('currency').equals('EUR')
  res.body.chat.upcomingItems[0].should.have.property('description').equals('converting to EUR')

  res = await A.invoice.sendInvoice(chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('EUR')
  res.body.message.should.have.property('event').equals('INVOICE_SENT')
  res.body.message.should.have.property('url')
  res.body.message.should.have.property('urlTitle').equals('Pay Now')
  res.body.message.should.have.property('text').equals('Sent an invoice for €400.00')

  res = await A.chat.setAssignees({ users: [userId] }, chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('assignees')
  res.body.chat.assignees.length.should.equal(1)
  res.body.chat.assignees[0].should.have.property('id').equals(userId)

  res = await A.chat.close(chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('closed').equals(true)
  res.body.chat.assignees.length.should.equal(0)
  res.body.message.should.have.property('event').equals('CHAT_CLOSED')
  res.body.message.should.have.property('text').equals('Closed the conversation')
  return res.body.chat
}

async function checkChats (chat, account, user) {
  let res = await B.account.removeMember(account.id, user.id)
  res.should.have.status(200)
  res.body.account.should.have.property('object').equal('Account')
  res.body.account.users.length.should.equal(1)

  res = await B.account.setAccount(account.id)
  res.should.have.status(401)

  res = await B.chat.first()
  res.should.have.status(200)
  res.body.should.have.property('id')
  res.body.should.have.property('object').equals('Chat')

  res = await B.chat.getChat(res.body.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Chat')
  res.body.should.have.property('hasNewMessages').equals(true)
  res.body.should.not.have.property('states')
  const bogusId = res.body.firstMessage

  res = await A.chat.getChat(bogusId)
  res.should.have.status(404)
}

async function addMember (chat) {
  chat.should.have.property('object').equals('Chat')
  const chatId = chat.id

  res = await B.account.sendInvites({ emails: ['Bob@otechie.com'] }, chat.client.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')

  const invitation = await Invitation.findOne({ email: 'bob@otechie.com', account: chat.client.id })
  invitation.should.have.property('token')

  res = await C.auth.register({ firstName: 'Bob', lastName: 'White', email: 'bob@otechie.com', password: 'Password1' })
  res.should.have.status(200)

  res = await C.account.join(invitation.token)
  res.should.have.status(200)
  res.body.users.length.should.equal(2)
  res.body.users[1].should.have.property('email').equals('bob@otechie.com')
  res.body.users[1].should.have.property('lastName').equals('White')

  const invitations = await Invitation.find({ token: invitation.token })
  invitations.length.should.equal(0)

  res = await C.account.join(invitation.token)
  res.should.have.status(401)

  res = await C.chat.getChat(chat.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equal('Chat')
  res.body.should.have.property('id').equals(chatId)

  // D is a User without permission to view chat
  res = await D.chat.getChat(chatId)
  res.should.have.status(401)
  res.body.should.not.have.property('object')
}

async function internalChat () {
  const res = await A.chat.myChats()
  res.should.have.status(200)
  res.body.length.should.equal(6)
  let i = 0
  res.body[i].should.have.property('name').equals('Client, Bob from Client, Inc.')
  res.body[i].should.have.property('consultant')
  i++
  res.body[i].should.have.property('name').equals('ConE from Consultant2')
  res.body[i].should.have.property('consultant')
  i++
  res.body[i].should.have.property('name').equals('Consultant')
  res.body[i].should.have.property('consultant')
  i++
  res.body[i].should.have.property('name').equals('First from billToThisName')
  res.body[i].should.have.property('consultant')
  i++
  res.body[i].should.have.property('name').equals('Dylan from New Client')
  res.body[i].should.have.property('consultant')
  i++
  res.body[i].should.have.property('name').equals('Otechie Account')
  res.body[i].should.have.property('client')
}

async function stripeWebhook (chat) {
  let res = await A.invoice.getInvoices(chat.id)
  res.should.have.status(200)
  res.body.length.should.equal(3)
  const invoice1 = res.body[0]
  const invoice2 = res.body[1]
  const invoice3 = res.body[2]

  res = await A.stripeConnectWebhook('invoice.sent', { id: 'bad_id', status: 'open' })
  res.should.have.status(200)
  res.body.should.have.property('received').equal(true)

  res = await A.stripeConnectWebhook('bad_event', { id: invoice1.stripeId, status: 'open' })
  res.should.have.status(200)
  res.body.should.have.property('received').equal(true)

  res = await A.stripeConnectWebhook('invoice.sent', { id: invoice1.stripeId, status: 'open' })
  res.should.have.status(200)
  res.body.should.have.property('received').equal(true)

  const stripeInvoice = await Stripe.payInvoiceTest(invoice1.stripeId, 'acct_1CgHSJD8sHwWJsmZ', 'pm_card_visa')
  stripeInvoice.should.have.property('paid').equal(true)
  stripeInvoice.should.have.property('charge')

  res = await A.stripeConnectWebhook('invoice.paid', stripeInvoice)
  res.should.have.status(200)
  res.body.should.have.property('received').equal(true)

  res = await A.message.getMessages(chat.id)
  res.should.have.status(200)
  res.body.length.should.equal(29)

  res = await A.stripeConnectWebhook('invoice.paid', stripeInvoice)
  res.should.have.status(200)
  res.body.should.have.property('received').equal(true)

  // Make sure second identical 'invoice.paid' webhook doesn't create message
  res = await A.message.getMessages(chat.id)
  res.should.have.status(200)
  res.body.length.should.equal(29)

  // res = await A.stripeConnectWebhook('invoice.paid', stripeInvoice2)
  // res.should.have.status(200)
  // res.body.should.have.property('received').equal(true)

  res = await A.invoice.refundInvoice(invoice1.id)
  res.should.have.status(200)
  res.body.invoice.should.have.property('status').equals('REFUNDED')
  res.body.message.should.have.property('event').equals('INVOICE_REFUNDED')
  res.body.message.should.have.property('text').equals('Refunded the €400.00 invoice')

  res = await A.stripeConnectWebhook('intent.canceled', { id: invoice3.stripeIntent })
  res.should.have.status(200)
  res.body.should.have.property('received').equal(true)

  res = await A.invoice.getInvoice(invoice3.id)
  res.should.have.status(200)
  res.body.should.have.property('status').equals('REFUNDED')

  return invoice1
}

async function invoiceStatuses (chat) {
  let res = await A.chat.addItem(chat.id, { amount: 1000, description: 'item', currency: 'USD' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')

  res = await A.invoice.sendInvoice(chat.id)
  res.should.have.status(200)

  res = await A.chat.addItem(chat.id, { amount: 2000, description: 'item2' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')

  res = await A.invoice.sendInvoice(chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')

  res = await A.invoice.getInvoices(chat.id)
  res.should.have.status(200)
  res.body.length.should.equal(5)
  const invoiceId = res.body[0].id
  const invoiceId2 = res.body[1].id

  // Try bad status
  res = await A.invoice.setStatus('BAD_STATUS', invoiceId)
  res.should.have.status(422)
  res.body.errors.status.msg.should.equal('Invalid value')

  // Status doesn't get set until webhook hears back from stripe, so we don't check that here
  res = await A.invoice.setStatus('UNCOLLECTIBLE', invoiceId)
  res.should.have.status(200)
  res.body.invoice.should.have.property('status').equals('UNCOLLECTIBLE')
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.not.have.property('message')

  // Try to set invoice as uncollectible again, Stripe will throw error
  res = await A.invoice.setStatus('UNCOLLECTIBLE', invoiceId)
  res.should.have.status(200)
  res.body.invoice.should.have.property('status').equals('UNCOLLECTIBLE')
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.should.not.have.property('message')

  res = await A.invoice.setStatus('VOID', invoiceId)
  res.should.have.status(200)
  res.body.invoice.should.have.property('status').equals('VOID')
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.should.have.property('message')
  res.body.message.should.have.property('event').equals('INVOICE_VOIDED')

  res = await A.invoice.setStatus('PAID', invoiceId2)
  res.should.have.status(200)
  res.body.invoice.should.have.property('status').equals('PAID')
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.should.not.have.property('message')
  return res.body
}

async function invoiceBeforeRegister (account) {
  let res = await H.chat.startChatWidget({
    consultant: account.id,
    text: 'text',
    avatarUrl: 'avatarUrl',
    firstName: 'randomName'
  })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  // TODO: check more stuff here
  const chat = res.body.chat

  res = await A.chat.addItem(chat.id, { amount: 600000, description: 'Week of developement' })
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.chat.upcomingItems[0].should.have.property('amount').equals(600000)
  res.body.chat.upcomingItems[0].should.have.property('currency').equals('USD')

  res = await A.invoice.sendInvoice(chat.id)
  res.should.have.status(200)
  res.body.chat.should.have.property('object').equals('Chat')
  res.body.chat.should.have.property('currency').equals('USD')
  res.body.message.should.have.property('event').equals('INVOICE_SENT')
  res.body.message.should.have.property('text').equals('Sent an invoice for $6,000.00')
}

async function cleanupAccounts (account, user) {
  let res = await A.account.getAccount(account.id)
  res.body.should.have.property('object').equal('Account')
  res.body.users.length.should.equal(2)
  res.body.should.have.property('stripeAccountId')

  res = await A.flow.getFlows()
  res.should.have.status(200)
  res.should.have.status(200)
  res.body.length.should.equal(2)
  res.body[0].steps.length.should.equal(5)
  res.body[1].steps.length.should.equal(5)

  res = await A.stripeConnectWebhook('account.application.deauthorized', {}, 'acct_1CgHSJD8sHwWJsmZ')
  res.should.have.status(200)

  res = await A.account.getAccount(account.id)
  res.body.should.have.property('object').equal('Account')
  res.body.users.length.should.equal(2)
  res.body.should.not.have.property('stripeAccountId')

  res = await A.account.getAccount(account.id)
  res.should.have.status(200)
  res.body.should.have.property('object').equals('Account')
  res.body.should.have.property('activated').equals(true)
  res.body.should.not.have.property('stripeAccountId')

  // Payment steps removed when stripe disconencted
  res = await A.flow.getFlows()
  res.should.have.status(200)
  res.body.length.should.equal(2)
  res.body[0].steps.length.should.equal(4)
  res.body[1].steps.length.should.equal(4)

  res = await A.account.setAccount(account.id)
  res.should.have.status(200)
  res.body.account.should.have.property('id').equal(account.id)
  res.body.user.should.have.property('account').equal(account.id)
  res.body.account.users.length.should.equal(2)

  // Remove self from account
  res = await B.account.removeMember(account.id, user.id)
  res.should.have.status(200)
  res.body.account.should.have.property('object').equal('Account')
  res.body.account.should.have.property('id').not.equal(account.id)
  res.body.account.users.length.should.equal(2)
  res.body.user.should.have.property('object').equal('User')
  res.body.user.should.have.property('id').equal(user.id)

  res = await A.account.createAccount({
    name: 'Nintendo Switch',
    username: 'switch'
  })
  res.should.have.status(200)
  const switchAccountId = res.body.id

  res = await A.account.setAccount(account.id)
  res.should.have.status(200)

  res = await A.account.delete(account.id)
  res.should.have.status(200)
  res.body.account.should.have.property('object').equal('Account')

  res = await A.account.delete(switchAccountId)
  res.should.have.status(200)
  res.body.account.should.have.property('object').equal('Account')

  res = await A.account.getActiveAccount()
  res.should.have.status(200)
  res.should.have.property('body').equals(null)

  await A.auth.logout()

  res = await A.account.getActiveAccount()
  res.should.have.status(200)
  res.should.have.property('body').equals(null)
}
