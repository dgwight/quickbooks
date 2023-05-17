const crypto = require('crypto')

module.exports.encrypt = (object) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv)
  const encrypted = cipher.update(JSON.stringify(object))
  return iv.toString('hex') + ':' + Buffer.concat([encrypted, cipher.final()]).toString('hex')
}

module.exports.decrypt = (text) => {
  const textParts = text.split(':')
  const iv = Buffer.from(textParts.shift(), 'hex')
  const encryptedText = Buffer.from(textParts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv)
  const decrypted = decipher.update(encryptedText)
  return JSON.parse(Buffer.concat([decrypted, decipher.final()]).toString())
}
