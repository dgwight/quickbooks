const mongoose = require('mongoose')
const autopopulate = require('mongoose-autopopulate')
const timestamp = require('mongoose-timestamp')

class UserClass {
}

const schema = mongoose.Schema({
  object: { type: String, default: 'User', required: true },
  sub: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  phoneNumber: { type: String },
  phoneNumberVerified: { type: Boolean, default: false },
  workspaces: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  }]
}, { toJSON: { virtuals: true } })

schema.plugin(autopopulate)
schema.plugin(timestamp)
schema.loadClass(UserClass)
module.exports = mongoose.model('User', schema)
