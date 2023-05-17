process.env.NODE_ENV = 'test'

const chai = require('chai')
const nock = require('nock')
const chaiHttp = require('chai-http')
const API = require('./api/base')

const A = new API()
const B = new API()
const C = new API()

const Chat = require('../src/model/chat')
const Message = require('../src/model/message')

const { setupBot, wait } = require('./utils')

chai.use(chaiHttp)

describe('Slack Tests', () => {
  beforeEach(setupBot)

  it('Slack', async () => {
    let res = await A.auth.githubLogin('code')
    res.should.have.status(200)
    res.body.should.have.property('accessToken')
    res.body.should.have.property('user')

    res = await A.account.createAccount({
      name: 'Consultant',
      username: 'consultant'
    })
    res.should.have.status(200)
    res.body.should.have.property('owner')
    res.body.should.have.property('name').equals('Consultant')
    const accountId = res.body.id

    res = await A.flow.createFlow({
      name: 'Free Help'
    })
    res.should.have.status(200)
    res.body.steps.length.should.equal(4)
    res.body.steps[0].should.have.property('type').equals('EMAIL')
    res.body.steps[1].should.have.property('type').equals('NAME')
    res.body.steps[2].should.have.property('type').equals('COMPANY')
    res.body.steps[3].should.have.property('type').equals('MESSENGER')
    const flowId = res.body.id

    res = await B.chat.startChat({
      flow: flowId,
      consultant: accountId
    })
    res.should.have.status(200)
    res.body.auth.should.have.property('object').equals('Auth')
    res.body.auth.should.have.property('user')
    res.body.auth.should.have.property('accessToken')
    res.body.user.should.have.property('object').equals('User')
    res.body.user.should.have.property('hasPassword').equals(false)
    const chatId = res.body.chat.id

    nock('https://slack.com/api')
      .post('/oauth.v2.access')
      .reply(200, {
        team: { id: 'team_id' },
        authed_user: { id: 'user_id' },
        access_token: 'slack_access_token',
        incoming_webhook: { channel_id: 'slack_channel_id' }
      })
    nock('https://slack.com/api')
      .get('/team.info?team=team_id')
      .reply(200, {
        team: {
          name: 'slackTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png'
          }
        }
      })
    nock('https://slack.com/api')
      .get('/users.identity')
      .reply(200, {
        user: {
          name: 'Newseph Dude',
          image_72: 'url.png',
          id: 'user_id'
        }
      })

    // nock('https://slack.com/api')
    //   .get('/team.info?team=team_id')
    //   .reply(200, {
    //     team: {
    //       icon: {
    //         image_88: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png'
    //       }
    //     }
    //   })

    nock('https://slack.com/api')
      .post('/conversations.join')
      .reply(200, {})

    nock('https://slack.com/api')
      .post('/conversations.create')
      .reply(200, { channel: { id: 'slack_channel_id' } })
    nock('https://slack.com/api')
      .post('/conversations.invite')
      .reply(200, {})

    nock('https://slack.com/api')
      .post('/chat.postMessage')
      .reply(200, {})

    res = await B.chat.connectSlack(chatId, { code: 'code' })
    res.should.have.status(200)
    console.log('connectSlack', res.body)
    res.body.account.should.have.property('object').equals('Account')
    res.body.chat.should.have.property('object').equals('Chat')
    res.body.chat.slack.should.have.property('team').equals('team_id')
    res.body.chat.slack.should.have.property('channel').equals('slack_channel_id')
    res.body.chat.slack.should.not.have.property('token')

    res = await Chat.find({ 'slack.channel': 'slack_channel_id' })
    res.length.should.equal(1)

    res = await B.account.getActiveAccount()
    res.should.have.status(200)
    res.body.should.have.property('avatarUrl').equals('https://cdn.otechie.com/attachments/QmSE7yj7e/image.png')
    const clientId = res.body.id

    // TODO: make sure that it connects to another slackChannel
    // Connected user addMessage
    nock('https://slack.com/api')
      .get('/users.info?user=user_id')
      .reply(200, {
        user: {
          real_name: 'Newseph Dude',
          profile: { display_name: 'New Dude', image_72: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png' }
        }
      })

    res = await B.slackWebhook({
      type: 'message',
      ts: 'test',
      user: 'user_id',
      text: 'Coming from slack yo',
      channel: 'slack_channel_id',
      event_ts: 'test',
      channel_type: 'channel'
    })

    // New User addMessage
    nock('https://slack.com/api')
      .get('/users.info?user=user_id2')
      .reply(200, {
        user: {
          real_name: 'Newsephina Duderina',
          profile: { image_72: 'https://s3.amazonaws.com/cdn.otechie.com/attachments/pqATCWpMJASA/image.png' }
        }
      })
    res = await C.slackWebhook({
      type: 'message',
      ts: 'test2',
      user: 'user_id2',
      text: 'Im another person in the channel',
      channel: 'slack_channel_id',
      event_ts: 'test90',
      channel_type: 'channel'
    })

    // New User addMessage change picture and name
    nock('https://slack.com/api')
      .get('/users.info?user=user_id2')
      .reply(200, {
        user: {
          real_name: 'Newsephina Duderina',
          profile: {
            display_name: 'Phina',
            image_72: 'https://s3.amazonaws.com/cdn.otechie.com/attachments/pqATCWpMJ/image.png'
          }
        }
      })
    res = await C.slackWebhook({
      type: 'message',
      ts: 'test3',
      user: 'user_id2',
      text: 'I fdsve more to say',
      channel: 'slack_channel_id',
      event_ts: 'test4',
      channel_type: 'channel'
    })

    // That user edit message
    res = await C.slackWebhook({
      type: 'message',
      subtype: 'message_changed',
      hidden: true,
      channel: 'slack_channel_id',
      ts: 'test5',
      message: {
        type: 'message',
        user: 'user_id2',
        text: 'I have more to say',
        ts: 'test3',
        edited: {
          user: 'user_id2',
          ts: 'test6'
        }
      }
    })

    // New User delete message
    res = await C.slackWebhook({
      type: 'message',
      subtype: 'message_deleted',
      hidden: true,
      channel: 'slack_channel_id',
      ts: 'test43',
      deleted_ts: 'test2'
    })

    // get messages in chat make sure is correct
    let chat = await Chat.findOne({ 'slack.channel': 'slack_channel_id' })
    let messages = await Message.find({ chat: chat._id })

    const slackMessages = messages.filter(m => m.slackSent)
    slackMessages.length.should.equal(2)
    slackMessages[0].text.should.equal('Coming from slack yo')
    slackMessages[0].slackId.should.equal('test')
    slackMessages[0].slackUser.lastName.should.equal('Dude')
    slackMessages[0].slackUser.firstName.should.equal('New')
    slackMessages[0].slackUser.avatarUrl.should.equal('https://cdn.otechie.com/attachments/QmSE7yj7e/image.png')

    slackMessages[1].text.should.equal('I have more to say')
    slackMessages[1].slackId.should.equal('test3')
    slackMessages[1].slackUser.lastName.should.equal('')
    slackMessages[1].slackUser.firstName.should.equal('Phina')
    slackMessages[1].slackUser.avatarUrl.should.equal('https://s3.amazonaws.com/cdn.otechie.com/attachments/pqATCWpMJ/image.png')

    // rejoin if out of channel
    nock('https://slack.com/api')
      .post('/chat.postMessage')
      .reply(200, {
        error: 'not_in_channel'
      })
    nock('https://slack.com/api')
      .post('/conversations.join')
      .reply(200, {
        channel: 'slack_channel_id'
      })
    nock('https://slack.com/api')
      .post('/chat.postMessage')
      .reply(200, {
        message: 'messageIdsdsds'
      })
    await wait(1000)
    res = await A.message.addMessage({
      chat: chat.id,
      tempId: 'tempIdzs',
      text: 'Well thats wonderful'
    })

    messages = await Message.find({ chat: chat._id })
    const otechieMessages = messages.filter(m => !m.slackSent)

    otechieMessages.length.should.equal(4)

    otechieMessages[0].text.should.equal('Hi there! How can we help you get started?')
    otechieMessages[0].otechieUser.firstName.should.equal('Dylan')
    otechieMessages[0].otechieUser.lastName.should.equal('Wight')
    otechieMessages[0].otechieUser.avatarUrl.should.equal('https://avatars2.githubusercontent.com/u/16690226?v=4')

    otechieMessages[1].text.should.equal('Selected Free Help')
    otechieMessages[1].event.should.equal('FLOW_SELECTED')
    otechieMessages[1].otechieUser.firstName.should.equal('Newseph')
    otechieMessages[1].otechieUser.lastName.should.equal('Dude')
    otechieMessages[1].otechieUser.avatarUrl.should.equal('url.png')

    otechieMessages[2].text.should.equal('Requested your email')
    otechieMessages[2].bot.should.equal(true)
    otechieMessages[2].form.field.should.equal('EMAIL')
    otechieMessages[2].account.name.should.equal('Consultant')

    otechieMessages[3].text.should.equal('Well thats wonderful')
    otechieMessages[3].otechieUser.lastName.should.equal('Wight')
    otechieMessages[3].otechieUser.firstName.should.equal('Dylan')
    otechieMessages[3].otechieUser.avatarUrl.should.equal('https://avatars2.githubusercontent.com/u/16690226?v=4')

    /***

     // have name taken response test result and handle
     // also covers starting new conversation after slack is connected
     res = await D.auth.register({
      email: 'cocnocnonon@sdfsdjfslkdjflkds.com',
      password: 'Password1',
      firstName: 'Consurrr',
      lastName: 'asd'
    })
     res.should.have.status(200)
     res.body.should.have.property('user')
     const consultantUserId = res.body.user

     res = await D.account.createAccount({
      name: 'Consultar',
      username: 'consultar'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consultar')
     const account2 = res.body

     res = await D.account.connectStripeAccount('test')
     res.should.have.status(200)
     res.body.should.have.property('object').equals('Account')
     res.body.should.have.property('stripeAccountId').equals('acct_1CgHSJD8sHwWJsmZ')

     res = await D.account.addService({
      name: 'Free Help from this one',
      slug: 'help2',
      description: 'Get help from me!',
      collectUpfrontFee: false,
      displayOngoingRate: false,
      scheduleMeeting: false,
      account: account2.id
    })
     res.should.have.status(200)
     const serviceId2 = res.body.services[0].id

     // TODO: name counting not really tested???
     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        error: 'name_taken'
      })

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: 'consultar1'
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id3'
      })

     res = await B.chat.startChat({
      service: serviceId2,
      token: { id: 'tok_mastercard' },
      client: clientId
    })
     res.should.have.status(200)
     chat = res.body.chat

     // otechieUser edit message
     nock('https://slack.com/api')
     .post('/chat.postMessage')
     .reply(200, {
        ok: true,
        channel: 'slack_channel_id3',
        ts: '1503435956.000248',
        message: {
          text: 'I done heard you need the help',
          username: 'ecto1',
          bot_id: 'B19LU7CSY',
          type: 'message',
          subtype: 'bot_message',
          ts: '1503435956.000233'
        }
      })
     res = await D.message.addMessage({
      chat: chat.id,
      tempId: 'tempIdzs',
      text: 'I done heard you need the help'
    })
     res.should.have.status(200)
     let messageId = res.body.message._id

     nock('https://slack.com/api')
     .post('/chat.update')
     .reply(200, {
        ok: true,
        channel: 'slack_channel_id3',
        ts: '1503435956.000248',
        message: {
          text: 'EHRHRHRHHRHRHR',
          username: 'ecto1',
          bot_id: 'B19LU7CSY',
          type: 'message',
          subtype: 'bot_message',
          ts: '1503435956.000233'
        }
      })

     res = await D.message.editMessage({ id: messageId, text: 'I heard you need help' })
     res.should.have.status(200)
     res.body.chat.should.have.property('name').equals('Free from Stief Inc')
     res.body.chat.should.have.property('preview').equals('Consurrr: I heard you need help')
     res.body.message.should.have.property('object').equals('Message')
     res.body.message.should.have.property('text').equals('I heard you need help')
     res.body.message.should.have.property('edited').equals(true)
     res.body.message.should.have.property('slackId').equals('1503435956.000233')

     // otechieUser delete message
     nock('https://slack.com/api')
     .post('/chat.postMessage')
     .reply(200, {
        ok: true,
        channel: 'C1H9RESGL',
        ts: '1503435956.000247',
        message: {
          text: 'EHRHRHRHHRHRHR',
          username: 'ecto1',
          bot_id: 'B19LU7CSY',
          type: 'message',
          subtype: 'bot_message',
          ts: '1503435956.000247'
        }
      })
     res = await D.message.addMessage({
      chat: chat.id,
      tempId: 'tempIdzsl',
      text: 'EHRHRHRHHRHRHR'
    })
     res.should.have.status(200)

     messageId = res.body.message._id
     nock('https://slack.com/api')
     .post('/chat.delete')
     .reply(200, {
        ok: true
      })
     res = await D.message.deleteMessage(messageId)
     res.should.have.status(200)

     messages = await Message.find({ chat: chat._id })
     res.should.have.status(200)
     messages.length.should.equal(2)
     messages[0].text.should.equal('Purchased Free Help from this one')
     messages[0].event.should.equal('SERVICE_PURCHASED')
     messages[0].otechieUser.lastName.should.equal('Bee')
     messages[0].otechieUser.firstName.should.equal('Free')
     messages[0].otechieUser.avatarUrl.should.equal('url.png')

     messages[1].text.should.equal('I heard you need help')
     messages[1].otechieUser.lastName.should.equal('asd')
     messages[1].otechieUser.firstName.should.equal('Consurrr')
     messages[1].otechieUser.avatarUrl.should.equal('https://s.gravatar.com/avatar/edb9256fd6c9c0d39cf7dadc7a74d3c6?s=200&d=retro')
     messages[1].slackId.should.equal('1503435956.000233')

     // invoiceSent
     nock('https://slack.com/api')
     .post('/chat.postMessage')
     .reply(200, {
        ok: true,
        channel: 'C1H9RESGL',
        ts: '1503435956.000249',
        message: {
          text: 'EHRHRHRHHRHRHR',
          username: 'ecto1',
          bot_id: 'B19LU7CSY',
          type: 'message',
          attachments: [
            {
              fallback: 'item added',
              color: 'iconColor',
              text: 'item Added'
            }
          ],
          subtype: 'bot_message',
          ts: '1503435956.000249'
        }
      })

     res = await D.chat.addItem(chat.id, { amount: 10000, description: 'Mas minutos', currency: 'EUR' })
     res.should.have.status(200)

     nock('https://slack.com/api')
     .post('/chat.postMessage')
     .reply(200, {
        ok: true,
        channel: 'C1H9RESGL',
        ts: '1503435956.000250',
        message: {
          username: 'ecto1',
          bot_id: 'B19LU7CSY',
          type: 'message',
          attachments: [
            {
              fallback: 'Invoice Sent Pay Here: google.com',
              color: 'something',
              title: 'urlTitle',
              title_link: 'url',
              text: 'text'
            }
          ],
          subtype: 'bot_message',
          ts: '1503435956.000250'
        }
      })

     res = await D.invoice.sendInvoice(chat.id)
     res.should.have.status(200)

     // one active channel the rest are not found in this slack workspace
     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id2' },
        authed_user: { id: 'user_id2' },
        access_token: 'slack_access_token',
        incoming_webhook: { channel_id: 'slack_channel_id' }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'Ner Dod',
          image_72: 'url.png',
          id: 'user_id72'
        }
      })

     nock('https://slack.com/api')
     .get('/team.info?team=team_id2')
     .reply(200, {
        team: {
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png'
          }
        }
      })

     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id2')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id'
        }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, { channel: { id: 'slack_channel_id2' } })
     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {})

     nock('https://slack.com/api')
     .post('/chat.postMessage')
     .reply(200, {})

     res = await B.account.connectSlack('code2')
     res.should.have.status(200)
     res.body.account.slack.team.should.equal('team_id2')

     res = await B.chat.myChats()
     const nonOtechieChats = res.body.filter(c => c.consultantName !== 'Otechie Account')
     nonOtechieChats[0].consultantName.should.equal('Consultar')
     nonOtechieChats[0].slackChannel.should.equal('slack_channel_id2')

     nonOtechieChats[1].consultantName.should.equal('Consultant')
     nonOtechieChats[1].slackChannel.should.equal('slack_channel_id')

     // brand new startChat
     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id3' },
        authed_user: { id: 'slackUser4' },
        access_token: 'slack_access_token2',
        incoming_webhook: { channel_id: 'slack_channel_id4' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id3')
     .reply(200, {
        team: {
          name: 'DatTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'Jon Doe',
          email: 'Jd@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png',
          id: 'slackUser4'
        }
      })
     res = await E.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.should.have.property('auth')
     res.body.user.should.have.property('email').equals('Jd@otechie.com')
     res.body.user.should.have.property('avatarUrl').equals('https://cdn.otechie.com/attachments/QmSE7yj7e/image.png')
     res.body.user.should.have.property('firstName').equals('Jon')
     res.body.user.should.have.property('fullName').equals('Jon Doe')
     res.body.user.should.have.property('slackUser')
     res.body.user.should.have.property('account').equals(res.body.account.id)
     res.body.user.accounts.length.should.equal(1) //

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.account.should.have.property('owner').equals(res.body.user.id)
     res.body.account.users.length.should.equal(1)
     res.body.account.slack.should.have.property('teamId').equals('team_id3')
     const clientId2 = res.body.account.id

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consultant',
          id: 'slack_channel_id4'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id4'
      })

     res = await E.chat.startChat({
      client: clientId2,
      username: 'consultant'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('DatTeam')
     res.body.chat.client.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id4')
     res.body.chat.should.have.property('name').equals('Consultant')

     res.body.user.should.have.property('fullName').equals('Jon Doe')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     await E.auth.logout()
     res.should.have.status(200)

     // StartChat logged out existing slack connected  Otechie user
     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id3' },
        authed_user: { id: 'slackUser4' },
        access_token: 'slack_access_token2',
        incoming_webhook: { channel_id: 'slack_channel_id5' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id3')
     .reply(200, {
        team: {
          name: 'DatTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'Jon Doe',
          email: 'Jd@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png',
          id: 'slackUser4'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id3')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id4'
        }]
      })
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await E.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.should.have.property('auth')
     res.body.user.should.have.property('email').equals('Jd@otechie.com')
     res.body.user.should.have.property('avatarUrl').equals('https://cdn.otechie.com/attachments/QmSE7yj7e/image.png')
     res.body.user.should.have.property('firstName').equals('Jon')
     res.body.user.should.have.property('fullName').equals('Jon Doe')
     res.body.user.should.have.property('slackUser')
     res.body.user.should.have.property('account').equals(res.body.account.id)
     res.body.user.accounts.length.should.equal(1)

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.account.should.have.property('owner').equals(res.body.user.id)
     res.body.account.users.length.should.equal(1)
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consultar',
          id: 'slack_channel_id5'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id5'
      })

     res = await E.chat.startChat({
      client: clientId2,
      username: 'consultar'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('DatTeam')
     res.body.chat.client.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.chat.should.have.property('name').equals('Consultar')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id5')

     res.body.user.should.have.property('fullName').equals('Jon Doe')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     // TODO: check accounts with consultant, and consultant2 from above
     let chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(2)
     chats[0].slackChannel.should.equal('slack_channel_id4')
     chats[1].slackChannel.should.equal('slack_channel_id5')

     // StartChat logged in existing slack connected OtechieUser
     res = await D.account.createAccount({
      name: 'Consultir',
      username: 'consultir'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consultir')

     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id3' },
        authed_user: { id: 'slackUser4' },
        access_token: 'slack_access_token2',
        incoming_webhook: { channel_id: 'slack_channel_id6' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id3')
     .reply(200, {
        team: {
          name: 'DatTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'Jon Doe',
          email: 'JDOE@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png',
          id: 'slackUser4'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id3')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id4'
        },
          {
            id: 'slack_channel_id5'
          }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await E.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.account.should.have.property('owner') // TODO: add D.userid const and just refer to this here and similar
     res.body.account.users.length.should.equal(1)
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consultir',
          id: 'slack_channel_id6'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id6'
      })

     res = await E.chat.startChat({
      client: clientId2,
      username: 'consultir'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('DatTeam')
     res.body.chat.client.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.chat.should.have.property('name').equals('Consultir')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id6')

     res.body.user.should.have.property('fullName').equals('Jon Doe')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     // TODO: check accounts with consultant, and consultant2 from above
     chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(3)
     chats[0].slackChannel.should.equal('slack_channel_id4')
     chats[1].slackChannel.should.equal('slack_channel_id5')
     chats[2].slackChannel.should.equal('slack_channel_id6')

     // startChat new Otechie user in same workspace
     res = await D.account.createAccount({
      name: 'Consulter',
      username: 'consulter'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consulter')

     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id3' },
        authed_user: { id: 'slackUser5' },
        access_token: 'slack_access_token3',
        incoming_webhook: { channel_id: 'slack_channel_id7' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id3')
     .reply(200, {
        team: {
          name: 'DatTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'Joe Bro',
          email: 'JBRO@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmSEfdfd7yj7e/image.png',
          id: 'slackUser5'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id3')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id4'
        },
          {
            id: 'slack_channel_id5'
          },
          {
            id: 'slack_channel_id6'
          }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await F.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.should.have.property('auth')
     res.body.user.should.have.property('email').equals('JBRO@otechie.com')
     res.body.user.should.have.property('avatarUrl').equals('https://cdn.otechie.com/attachments/QmSEfdfd7yj7e/image.png')
     res.body.user.should.have.property('firstName').equals('Joe')
     res.body.user.should.have.property('fullName').equals('Joe Bro')
     res.body.user.should.have.property('slackUser')
     res.body.user.should.have.property('account').equals(res.body.account.id)
     res.body.user.accounts.length.should.equal(1)

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.account.should.have.property('owner') // TODO: add D.userid const and just refer to this here and similar
     res.body.account.users.length.should.equal(2)
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consulter',
          id: 'slack_channel_id7'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id7'
      })

     res = await F.chat.startChat({
      client: clientId2,
      username: 'consulter'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('DatTeam')
     res.body.chat.client.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.chat.should.have.property('name').equals('Consulter')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id7')

     res.body.user.should.have.property('fullName').equals('Joe Bro')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     // TODO: check accounts with consultant, and consultant2 from above
     chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(4)
     chats[0].slackChannel.should.equal('slack_channel_id4')
     chats[1].slackChannel.should.equal('slack_channel_id5')
     chats[2].slackChannel.should.equal('slack_channel_id6')
     chats[3].slackChannel.should.equal('slack_channel_id7')

     // startChat logged in Otechie user different account same Slack Workspace
     res = await D.account.createAccount({
      name: 'Consult7',
      username: 'consult7'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consult7')

     res = await G.chat.startChat({
      email: 'Jaw@otechie.com',
      firstName: 'Jaw',
      lastName: 'Brah',
      accountName: 'Jaw Inc',
      username: 'consulter'
    })

     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id3' },
        authed_user: { id: 'slackUser6' },
        access_token: 'slack_access_token4',
        incoming_webhook: { channel_id: 'slack_channel_id8' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id3')
     .reply(200, {
        team: {
          name: 'DatTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'Jeezy Breezy',
          email: 'JB@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png',
          id: 'slackUser6'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id3')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id4'
        },
          {
            id: 'slack_channel_id5'
          },
          {
            id: 'slack_channel_id6'
          },
          {
            id: 'slack_channel_id7'
          }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await G.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.account.should.have.property('owner') // TODO: add D.userid const and just refer to this here and similar
     res.body.account.users.length.should.equal(3)
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consulter',
          id: 'slack_channel_id8'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id8'
      })

     res = await G.chat.startChat({
      client: clientId2,
      username: 'consult7'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('DatTeam')
     res.body.chat.client.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.chat.should.have.property('name').equals('Consult7')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id8')

     res.body.user.should.have.property('fullName').equals('Jaw Brah')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     // TODO: check accounts with consultant, and consultant2 from above
     chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(5)
     chats[0].slackChannel.should.equal('slack_channel_id4')
     chats[1].slackChannel.should.equal('slack_channel_id5')
     chats[2].slackChannel.should.equal('slack_channel_id6')
     chats[3].slackChannel.should.equal('slack_channel_id7')
     chats[4].slackChannel.should.equal('slack_channel_id8')

     // startChat existing Otechie user logged out with same email as slackUser in same Slack workspace
     res = await D.account.createAccount({
      name: 'Consult8',
      username: 'consult8'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consult8')

     res = await H.chat.startChat({
      email: 'JJ@otechie.com',
      firstName: 'JJ',
      lastName: 'BB',
      accountName: 'JJ Co',
      username: 'consulter'
    })

     await H.auth.logout()

     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id3' },
        authed_user: { id: 'slackUser7' },
        access_token: 'slack_access_token4',
        incoming_webhook: { channel_id: 'slack_channel_id8' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id3')
     .reply(200, {
        team: {
          name: 'DatTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'JJ BB',
          email: 'JJ@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmdfdfSEfdfd7yj7e/image.png',
          id: 'slackUser7'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id3')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id4'
        },
          {
            id: 'slack_channel_id5'
          },
          {
            id: 'slack_channel_id6'
          },
          {
            id: 'slack_channel_id7'
          },
          {
            id: 'slack_channel_id8'
          }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await H.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.should.have.property('auth')
     res.body.user.should.have.property('email').equals('JJ@otechie.com')
     res.body.user.should.have.property('avatarUrl').equals('https://cdn.otechie.com/attachments/QmdfdfSEfdfd7yj7e/image.png') // TODO: maybe fix this
     res.body.user.should.have.property('firstName').equals('JJ')
     res.body.user.should.have.property('fullName').equals('JJ BB')
     res.body.user.should.have.property('slackUser')
     res.body.user.should.have.property('account').equals(res.body.account.id)
     res.body.user.accounts.length.should.equal(2)

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.account.should.have.property('owner') // TODO: add D.userid const and just refer to this here and similar
     res.body.account.users.length.should.equal(4)
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consulter',
          id: 'slack_channel_id9'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id9'
      })

     res = await H.chat.startChat({
      client: clientId2,
      username: 'consult8'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('DatTeam')
     res.body.chat.client.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.chat.should.have.property('name').equals('Consult8')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id9')

     res.body.user.should.have.property('fullName').equals('JJ BB')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     // TODO: check accounts with consultant, and consultant2 from above
     chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(6)
     chats[0].slackChannel.should.equal('slack_channel_id4')
     chats[1].slackChannel.should.equal('slack_channel_id5')
     chats[2].slackChannel.should.equal('slack_channel_id6')
     chats[3].slackChannel.should.equal('slack_channel_id7')
     chats[4].slackChannel.should.equal('slack_channel_id8')
     chats[5].slackChannel.should.equal('slack_channel_id9')

     // User Authed no account to new slack workspace new slackUser logged in
     res = await D.account.createAccount({
      name: 'Consult9',
      username: 'consult9'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consult9')

     res = await I.auth.register({
      email: 'fl@otechie.com',
      password: 'Password1',
      firstName: 'First',
      lastName: 'Last'
    })

     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id4' },
        authed_user: { id: 'slackUser8' },
        access_token: 'slack_access_token5',
        incoming_webhook: { channel_id: 'slack_channel_id10' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id4')
     .reply(200, {
        team: {
          name: 'YYOOYyTam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tdfdsfjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'Firstus Lasticus',
          email: 'FULU@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png',
          id: 'slackUser8'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id4')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id10'
        }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await I.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.account.should.have.property('name').equals('YYOOYyTam')
     res.body.account.should.have.property('billingEmail').equals('fl@otechie.com')
     res.body.account.should.have.property('owner') // TODO: add D.userid const and just refer to this here and similar
     res.body.account.users.length.should.equal(1)
     res.body.account.slack.should.have.property('teamId').equals('team_id4')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consult',
          id: 'slack_channel_id10'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id10'
      })

     res = await I.chat.startChat({
      username: 'consult9'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('YYOOYyTam')
     res.body.chat.client.should.have.property('billingEmail').equals('fl@otechie.com')
     res.body.chat.should.have.property('name').equals('Consult9')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id10')

     res.body.user.should.have.property('fullName').equals('First Last')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('YYOOYyTam')
     res.body.account.slack.should.have.property('teamId').equals('team_id4')

     // TODO: check accounts with consultant, and consultant2 from above
     chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(1)
     chats[0].slackChannel.should.equal('slack_channel_id10')

     // User Authed no account to new slack workspace new slackUser logged out
     res = await D.account.createAccount({
      name: 'Consult10',
      username: 'consult10'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consult10')

     res = await J.auth.register({
      email: 'flY@otechie.com',
      password: 'Password1',
      firstName: 'FirstY',
      lastName: 'LastY'
    })

     await J.auth.logout()

     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id3' },
        authed_user: { id: 'slackUser9' },
        access_token: 'slack_access_token5',
        incoming_webhook: { channel_id: 'slack_channel_id11' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id3')
     .reply(200, {
        team: {
          name: 'DatTeam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'DDD SSS',
          email: 'flY@otechie.com',
          image_72: 'https://cdn.otechie.com/attachments/QmdfdfdSEfdfd7yj7e/image.png',
          id: 'slackUser9'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id3')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id4'
        },
          {
            id: 'slack_channel_id5'
          },
          {
            id: 'slack_channel_id6'
          },
          {
            id: 'slack_channel_id7'
          },
          {
            id: 'slack_channel_id8'
          },
          {
            id: 'slack_channel_id9'
          }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await J.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.should.have.property('auth')
     res.body.user.should.have.property('email').equals('flY@otechie.com')
     res.body.user.should.have.property('avatarUrl').equals('https://cdn.otechie.com/attachments/QmdfdfdSEfdfd7yj7e/image.png')
     res.body.user.should.have.property('firstName').equals('FirstY')
     res.body.user.should.have.property('fullName').equals('FirstY LastY')
     res.body.user.should.have.property('slackUser')
     res.body.user.should.have.property('account').equals(res.body.account.id)
     res.body.user.accounts.length.should.equal(1)

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.account.should.have.property('owner')
     res.body.account.users.length.should.equal(5)
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consulter',
          id: 'slack_channel_id11'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id11'
      })

     res = await J.chat.startChat({
      client: clientId2,
      username: 'consult10'
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('DatTeam')
     res.body.chat.client.should.have.property('billingEmail').equals('Jd@otechie.com')
     res.body.chat.should.have.property('name').equals('Consult10')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id11')

     res.body.user.should.have.property('fullName').equals('FirstY LastY')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('DatTeam')
     res.body.account.slack.should.have.property('teamId').equals('team_id3')

     // TODO: check accounts with consultant, and consultant2 from above
     chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(7)
     chats[0].slackChannel.should.equal('slack_channel_id4')
     chats[1].slackChannel.should.equal('slack_channel_id5')
     chats[2].slackChannel.should.equal('slack_channel_id6')
     chats[3].slackChannel.should.equal('slack_channel_id7')
     chats[4].slackChannel.should.equal('slack_channel_id8')
     chats[5].slackChannel.should.equal('slack_channel_id9')
     chats[6].slackChannel.should.equal('slack_channel_id11')

     // User Authed but no account to existing slack workspace new slackUser logged in
     res = await D.account.createAccount({
      name: 'Consult11',
      username: 'consult11'
    })
     res.should.have.status(200)
     res.body.should.have.property('owner')
     res.body.should.have.property('name').equals('Consult11')

     res = await K.auth.register({
      email: 'gdam@otechie.com',
      password: 'Password1',
      firstName: 'GG',
      lastName: 'LL'
    })

     nock('https://slack.com/api')
     .post('/oauth.v2.access')
     .reply(200, {
        team: { id: 'team_id4' },
        authed_user: { id: 'slackUser10' },
        access_token: 'slack_access_token6',
        incoming_webhook: { channel_id: 'slack_channel_id12' }
      })
     nock('https://slack.com/api')
     .get('/team.info?team=team_id4')
     .reply(200, {
        team: {
          name: 'YYOOYyTam',
          icon: {
            image_88: 'https://cdn.otechie.com/attachments/QmSE7tdfdsfjtjt/image.png'
          }
        }
      })
     nock('https://slack.com/api')
     .get('/users.identity')
     .reply(200, {
        user: {
          name: 'God Dam',
          email: 'GodDam@dsflkjsdl.com',
          image_72: 'https://cdn.otechie.com/attachments/QmSE7yj7e/image.png',
          id: 'slackUser10'
        }
      })
     nock('https://slack.com/api')
     .get('/conversations.list?team_id=team_id4')
     .reply(200, {
        channels: [{
          id: 'slack_channel_id12'
        }]
      })

     nock('https://slack.com/api')
     .post('/conversations.join')
     .reply(200, {})
     res = await K.account.connectSlack('code3')
     res.should.have.status(200)
     res.body.account.should.have.property('name').equals('YYOOYyTam')
     res.body.account.should.have.property('billingEmail').equals('fl@otechie.com')
     res.body.account.should.have.property('owner') // TODO: add D.userid const and just refer to this here and similar
     res.body.account.users.length.should.equal(2)
     res.body.account.slack.should.have.property('teamId').equals('team_id4')

     nock('https://slack.com/api')
     .post('/conversations.create')
     .reply(200, {
        channel: {
          name: 'consult',
          id: 'slack_channel_id12'
        }
      })

     nock('https://slack.com/api')
     .post('/conversations.invite')
     .reply(200, {
        channel: 'slack_channel_id12'
      })

     res = await K.chat.startChat({
      username: 'consult11',
      client: res.body.account.id
    })
     res.should.have.status(200)

     res.body.chat.client.should.have.property('name').equals('YYOOYyTam')
     res.body.chat.client.should.have.property('billingEmail').equals('fl@otechie.com')
     res.body.chat.should.have.property('name').equals('Consult11')

     res.body.chat.should.have.property('slackChannel').equals('slack_channel_id12')

     res.body.user.should.have.property('fullName').equals('GG LL')
     res.body.user.should.have.property('slackUser')

     res.body.account.should.have.property('name').equals('YYOOYyTam')
     res.body.account.slack.should.have.property('teamId').equals('team_id4')

     // TODO: check accounts with consultant, and consultant2 from above
     chats = await Chat.find({ client: res.body.account.id }).sort({ createdAt: 1 })
     chats.length.should.equal(2)
     chats[0].slackChannel.should.equal('slack_channel_id10')
     chats[1].slackChannel.should.equal('slack_channel_id12')
     **/
  })
})
