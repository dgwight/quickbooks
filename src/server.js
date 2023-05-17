process.on('unhandledRejection', (err) => console.error(err))
process.on('unhandledException', (err) => console.error(err))
global.Promise = require('bluebird')
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const morgan = require('morgan')
const RateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const http = require('http')
const helmet = require('helmet')
const cors = require('cors')

const Sentry = require('./service/Sentry')

const baseRouter = require('./route/base')

mongoose.Promise = Promise

const app = express()
Sentry.init(app)

app.use(helmet())
app.enable('trust proxy')
app.use(new RateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  delayMs: 0
}))

app.use(cors())
app.use((req, res, next) => {
  bodyParser.urlencoded({ extended: false, limit: '50mb' })
  bodyParser.json({ limit: '50mb' })(req, res, next)
})
app.use(morgan('common'))
app.use(cookieParser())

app.use(async (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization) return next()
  try {
    const token = authorization.replace(/^bearer /gi, '')
    req.uid = jwt.verify(token, process.env.SESSION_SECRET)
    next()
  } catch (err) {
    console.error(err)
    res.clearCookie('auth')
    res.status(401).send('Invalid Token...')
  }
})

app.use('/', baseRouter)

app.use(Sentry.Handlers.errorHandler())

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message })
})

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  sslValidate: false
})

const server = http.createServer(app)
server.listen(process.env.PORT || 8000)

module.exports = { app, server }
