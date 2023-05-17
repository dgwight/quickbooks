const express = require('express')
const router = express.Router()
const { encrypt } = require('../utils')

const QuickBooks = require('../service/QuickBooks')
const User = require('../model/user')
const Workspace = require('../model/workspace')

router.get('/', home)
router.get('/quickbooks', quickbooksAuth)
router.get('/quickbooks/callback', quickbooksCallback)

function home (req, res) {
  res.send(`<h1>Welcome to Nentry\'s API!</h1><a href="/quickbooks">Connect to Quickbooks</a>`)
}

function quickbooksAuth (req, res, next) {
  (async () => {
    const redirectUrl = QuickBooks.getAuthUrl()
    res.redirect(redirectUrl)
  })().catch(next)
}

function quickbooksCallback (req, res) {
  (async () => {
    const token = await QuickBooks.authorize(req.url)
    const realmId = req.query.realmId
    const userData = await QuickBooks.getUserInfo(token)

    let user = await User.findOne({ sub: userData.sub })
    if (!user) {
      user = await User.create({
        sub: userData.sub,
        firstName: userData.givenName,
        lastName: userData.familyName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        phoneNumberVerified: userData.phoneNumberVerified,
        emailVerified: userData.emailVerified
      })
    }

    let workspace = await Workspace.findOne({ realmId: realmId })
    if (!workspace) {
      const workspaceData = await QuickBooks.getWorkspaceInfo(realmId, token)
      workspace = await Workspace.create({
        user: user._id,
        name: workspaceData.CompanyName,
        realmId: realmId,
        quickbooksToken: encrypt(token) // TODO: Encrypt this
      })
      if (user.workspaces) {
        user.workspaces.push(workspace._id)
      } else {
        user.workspaces = [workspace._id]
      }
      await user.save()
    }
    return res.redirect(`${process.env.API_URL}#success`)
  })().catch(err => {
    console.error(err)
    return res.redirect(`${process.env.API_URL}#failed`)
  })
}

module.exports = router
