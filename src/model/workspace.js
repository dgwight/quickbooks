const mongoose = require('mongoose')
const autopopulate = require('mongoose-autopopulate')
const timestamp = require('mongoose-timestamp')

class WorkspaceClass {
}

const schema = mongoose.Schema({
  object: { type: String, default: 'Workspace', required: true },
  name: { type: String, required: true },
  quickbooksToken: { type: String, required: true, hide: true },
  realmId: { type: String, required: true, hide: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { toJSON: { virtuals: true } })

schema.plugin(autopopulate)
schema.plugin(timestamp)
schema.loadClass(WorkspaceClass)
module.exports = mongoose.model('Workspace', schema)
