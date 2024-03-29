const OAuthClient = require('intuit-oauth')
const { decrypt, encrypt } = require('../utils')

const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_ID,
  clientSecret: process.env.QUICKBOOKS_SECRET,
  environment: process.env.QUICKBOOKS_ENV || 'sandbox',
  redirectUri: `${process.env.API_URL}/quickbooks/callback`
})

const baseUrl = process.env.QUICKBOOKS_ENV === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com'

function getAuthUrl () {
  return oauthClient.authorizeUri({
    scope: [
      OAuthClient.scopes.Accounting,
      OAuthClient.scopes.OpenId,
      OAuthClient.scopes.Email,
      OAuthClient.scopes.Profile,
      OAuthClient.scopes.Phone
    ],
    state: 'testState'
  })
}

function authorize (url) {
  return oauthClient.createToken(url).then(function (authResponse) {
    return authResponse.getJson()
  })
}

function getUserInfo (token) {
  oauthClient.setToken(token)
  return oauthClient.getUserInfo().then(function (data) {
    console.log('user  ' + data)
    return data.getJson()
  }).catch(function (e) {
    console.error('The error message is :' + e.originalMessage)
    console.error(e.intuit_tid)
  })
}

async function query (q, workspace) {
  await refresh(workspace)
  return oauthClient.makeApiCall({
    url: `${baseUrl}/v3/company/${workspace.realmId}/query?query=${encodeURIComponent(q)}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (response) {
    return response.json.QueryResponse
  }).catch(function (e) {
    console.error('The error message is :' + e.originalMessage)
    console.error(e.intuit_tid)
    return e
  })
}

async function getReport (name, workspace) {
  await refresh(workspace)
  return oauthClient.makeApiCall({
    url: `${baseUrl}/v3/company/${workspace.realmId}/reports/${name}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (response) {
    return response.json
  }).catch(function (e) {
    console.error('The error message is :' + e.originalMessage)
    console.error(e.intuit_tid)
    return e
  })
}

function getWorkspaceInfo (reamId, token) {
  oauthClient.setToken(token)
  return oauthClient.makeApiCall({
    url: `${baseUrl}/v3/company/${reamId}/companyinfo/${reamId}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(function (response) {
    console.log(response)
    return response.json.CompanyInfo
  }).catch(function (e) {
    console.error('The error message is :' + e.originalMessage)
    console.error(e.intuit_tid)
    return e
  })
}

function disconnect (token) {
  return oauthClient.revoke(token).then(function (authResponse) {
    console.log('Tokens revoked : ' + JSON.stringify(authResponse.getJson()))
  }).catch(function (e) {
    console.error('The error message is :' + e.originalMessage)
    console.error(e.intuit_tid)
  })
}

async function refresh (workspace) {
  const token = decrypt(workspace.quickbooksToken)
  oauthClient.setToken(token)
  const newToken = await oauthClient.refresh()
  workspace.quickbooksToken = encrypt(newToken.json)
  await workspace.save()
}

module.exports = {
  getAuthUrl,
  authorize,
  disconnect,
  getUserInfo,
  query,
  getWorkspaceInfo,
  getReport,
  refresh
}
