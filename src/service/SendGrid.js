const sgMail = require('@sendgrid/mail')
const client = require('@sendgrid/client')

const showdown = require('showdown')
const filterXSS = require('xss')
const Sentry = require('./Sentry')
const Pusher = require('./Pusher')
const User = require('../model/user')

const { merge, get } = require('lodash')
const qs = require('query-string')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)
client.setApiKey(process.env.SENDGRID_API_KEY)

const whiteList = merge({}, filterXSS.whiteList, {
  li: ['style'],
  input: ['type', 'style', 'disabled', 'checked']
})
const xssFilter = (converter) => {
  return [
    {
      type: 'output',
      filter: function (text) {
        return filterXSS(text, { whiteList: whiteList })
      }
    }
  ]
}

showdown.setFlavor('github')
const converter = new showdown.Converter({
  simplifiedAutoLink: true,
  headerLevelStart: 2,
  strikeThrough: true,
  extensions: [xssFilter]
})

function send (mailData) {
  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve(null)
  }
  sgMail.send(mailData).catch((error) => {
    console.error(error)
  }).catch(Sentry.captureException)
}

function confirmEmail ({ user, auth }) {
  if (auth.emailConfirmed) return
  return send({
    to: user.email,
    from: 'Otechie <account@otechie.com>',
    templateId: 'd-7cd75e41659341afbdbc2810806f56de',
    dynamicTemplateData: {
      email: user.email,
      confirmUrl: `${process.env.WEB_URL}/connect/email?token=${auth.emailConfirmToken}#user`
    }
  })
}

function startResetPassword (auth) {
  return send({
    to: auth.emailNormalized,
    from: 'Otechie <account@otechie.com>',
    templateId: 'd-c41800cd09cf47f3a8476580564c333d',
    dynamicTemplateData: {
      resetUrl: `${process.env.WEB_URL}/password?token=${auth.resetPasswordToken}`
    }
  })
}

function endResetPassword (auth) {
  return send({
    to: auth.emailNormalized,
    from: 'Otechie <account@otechie.com>',
    templateId: 'd-4917e6eec34b4eedbc0acf79c078169c',
    dynamicTemplateData: {
      email: auth.emailNormalized
    }
  })
}

function inviteToAccount (invitation, user, account) {
  return send({
    to: invitation.email,
    from: 'Otechie <account@otechie.com>',
    templateId: 'd-9c68c50e66554365bd27353aa4c52464',
    dynamicTemplateData: {
      user: {
        fullName: user.fullName,
        email: user.email
      },
      account: {
        name: account.name,
        avatarUrl: account.avatarUrl
      },
      joinUrl: `${process.env.WEB_URL}/join?token=${invitation.token}`
    }
  })
}

async function newMessage ({ chat, message, users, account }) {
  if (message.event === 'CHAT_CLOSED') return
  const onlineUsers = await Pusher.activeChannels()
  for (let u of users) {
    u = await User.findById(u)
    if (!u || onlineUsers.includes(u.id) || u.id === get(message, 'user.id') || !u.emailNotifications) {
      continue
    }
    await messageOne({ user: u, message, chat, account })
  }
}

async function messageOne ({ user, message, chat }) {
  const fullChat = await chat.for(user)
  await send({
    to: user.email,
    from: 'Otechie <messages@otechie.com>',
    replyTo: chat.email,
    templateId: 'd-11e40351a71c4468b294ffecdbc368f4',
    dynamicTemplateData: {
      user: {
        fullName: message.user.fullName,
        avatarUrl: message.user.avatarUrl
      },
      message: {
        text: message.text
      },
      chat: {
        name: fullChat.name,
        url: chat.fullUrl,
        replyUrl: `mailto:${chat.email}?subject=Reply%20to%20${fullChat.name}`
      }
    }
  })
}

async function upsertContact (user, account) {
  return upsertContactRaw({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isConsultant: get(account, 'isConsultant'),
    hasAccount: 1
  })
}

async function upsertContactRaw (data) {
  if (process.env.WEB_URL !== 'https://otechie.com') {
    return
  }
  return client.request({
    method: 'PUT',
    url: '/v3/marketing/contacts',
    body: {
      contacts:
        [{
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          custom_fields: {
            e3_N: get(data, 'isConsultant') ? 1 : undefined, // is_consultant
            e4_N: get(data, 'hasAccount'), // has_account
            e5_N: get(data, 'isConsultant') ? 1 : undefined // is_client
          }
        }]
    }
  }).catch(err => {
    console.error('SendGrid.upsertContact error:', get(err, 'response.body.errors'))
  })
}

async function outboundConversation (toUser, fromUser, { chat, message, account, auth }) {
  const fullChat = await chat.for(toUser)
  const query = qs.stringify({
    chat: chat.id,
    token: get(auth, 'resetPasswordToken')
  })
  return send({
    to: toUser.email,
    from: 'Otechie <messages@otechie.com>',
    replyTo: chat.email,
    templateId: 'd-43f9c96e12244c30b47cf28c4f09f1e3',
    dynamicTemplateData: {
      user: {
        fullName: fromUser.fullName,
        email: fromUser.email,
        avatarUrl: fromUser.avatarUrl
      },
      message: {
        text: message.text
      },
      account: {
        name: account.name,
        avatarUrl: account.avatarUrl
      },
      magicLink: `${process.env.WEB_URL}/redirect/magic?${query}`,
      slackUrl: `${process.env.WEB_URL}/redirect/slack?${query}`,
      replyUrl: `mailto:${chat.email}?subject=Reply%20to%20${fullChat.name}`
    }
  })
}

module.exports = {
  send,
  startResetPassword,
  endResetPassword,
  confirmEmail,
  inviteToAccount,
  newMessage,
  upsertContact,
  upsertContactRaw,
  outboundConversation
}
