const mongoose = require('mongoose')
const { first } = require('lodash')

const User = require('../model/user')
const Workspace = require('../model/workspace')
const QuickBooks = require('../service/QuickBooks')

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  sslValidate: false
}).then(done => {
  // return report()
  return query()
}).then(() => {
  process.exit()
})

async function report () {
  const user = await User.findOne({ email: 'dylan@nentry.com' })
  const workspace = await Workspace.findOne({ user: user._id })
  const result = await QuickBooks.getReport('TransactionList', workspace)

  console.log(result.Columns.Column)
  console.log(result.Rows.Row[3])
}

async function query () {
  const user = await User.findOne({ email: 'dylan@nentry.com' })
  const workspace = await Workspace.findOne({ user: user._id })
  const query = 'select * from Purchase where TotalAmt > \'100.00\''
  const result = await QuickBooks.query(query, workspace)
  console.log(first(result.Purchase))
}
