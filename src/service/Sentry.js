const Sentry = require('@sentry/node')
const Tracing = require('@sentry/tracing')

function init (app) {
  if (process.env.SENTRY_DSN_API) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN_API,
      environment: process.env.NODE_ENV,
      release: process.env.CIRCLE_SHA1,
      integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app })
      ],
      tracesSampleRate: 0.1
    })
    // RequestHandler creates a separate execution context using domains, so that every
    // transaction/span/breadcrumb is attached to its own Hub instance
    app.use(Sentry.Handlers.requestHandler())
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler())
  }
}

function captureException (err) {
  if (process.env.SENTRY_DSN_API) {
    Sentry.captureException(err)
  } else {
    console.error(err.stack)
  }
}

module.exports = {
  ...Sentry,
  captureException,
  init
}
