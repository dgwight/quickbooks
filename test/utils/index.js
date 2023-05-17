const Account = require('../../src/model/account')
const Auth = require('../../src/model/auth')
const Chat = require('../../src/model/chat')
const ChatState = require('../../src/model/chatState')
const Flow = require('../../src/model/flow')
const Invitation = require('../../src/model/invitation')
const Invoice = require('../../src/model/invoice')
const InvoiceItem = require('../../src/model/invoiceItem')
const Message = require('../../src/model/message')
const Step = require('../../src/model/step')
const User = require('../../src/model/user')
const SlackUser = require('../../src/model/slackUser')

async function setupBot () {
  await clearAll()
  const dylan = new User({
    firstName: 'Dylan',
    lastName: 'Wight',
    email: 'dylan@otechie.com',
    emailNormalized: 'dylan@otechie.com',
    avatarUrl: 'https://avatars2.githubusercontent.com/u/16690226?v=4'
  })
  const auth = await Auth.create({
    user: dylan._id,
    emailNormalized: 'dylan@otechie.com',
    password: Auth.hashSync('Password1')
  })
  dylan.auth = auth._id
  await dylan.save()
  const otechie = await Account.newAccount({
    username: 'otechie',
    name: 'Otechie Account',
    isConsultant: true,
    billingEmail: 'hello@otechie.com'
  }, dylan)
  return { otechie, dylan }
}

function clearAll () {
  return Promise.map([
    Account,
    Auth,
    Chat,
    ChatState,
    Flow,
    Invitation,
    Invoice,
    InvoiceItem,
    Message,
    User,
    Step,
    SlackUser
  ], (Model) => Model.deleteMany({}))
}

function wait (time) {
  return new Promise((resolve) => {
    setTimeout(function () {
      resolve(true)
    }, time)
  })
}

module.exports = { setupBot, clearAll, wait }
