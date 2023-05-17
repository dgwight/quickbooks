const stripe = require('stripe')(process.env.STRIPE_TOKEN)

console.log('STRIPE_TOKEN', process.env.STRIPE_TOKEN)

// otechieInvoice()
//
// async function otechieInvoice () {
//   await stripe.invoices.create({
//     customer: 'cus_Jd818pOZg4USYg',
//     collection_method: 'send_invoice',
//     statement_descriptor: 'otechie',
//     days_until_due: 5,
//     payment_settings: {
//       payment_method_types: ['ach_credit_transfer']
//     },
//     transfer_data: {
//       destination: 'acct_1CgHSJD8sHwWJsmZ',
//       amount: 161700
//     }
//   })
// }

// fixInvoice('in_1ISvTuFUMtsUKSqQ7aNLdoHO')

// async function fixInvoice (badStripeInvoiceId) {
//   // Add new Items to stripe
//   // TODO: double check currency here
//   const otechieInvoice = await Invoice.findOne({ stripeId: badStripeInvoiceId })
//   const relevantChat = await Chat.findById(otechieInvoice.chat)
//
//   const customer = await relevantChat.getCustomer(relevantChat.currency)
//
//   const items = await InvoiceItem.find({ invoice: otechieInvoice._id })
//   for (const item of items) {
//     await stripe.invoiceItems.create({
//       customer: customer.customerId,
//       amount: item.amount,
//       currency: item.currency,
//       description: item.description
//     }, {
//       stripeAccount: customer.accountId
//     })
//   }
//
//   // Create Stripe Invoice From Items
//   let stripeInvoice = await stripe.invoices.retrieveUpcoming({
//     customer: customer.customerId
//   }, {
//     stripeAccount: customer.accountId
//   })
//
//   stripeInvoice = await stripe.invoices.create({
//     customer: customer.customerId,
//     collection_method: 'send_invoice',
//     days_until_due: 7,
//     application_fee_amount: (stripeInvoice.total * 0.05).toFixed()
//   }, {
//     stripeAccount: customer.accountId
//   })
//
//   // Send Invoice
//   stripeInvoice = await stripe.invoices.sendInvoice(stripeInvoice.id, {
//     stripeAccount: customer.accountId
//   })
//
//   // Repoint our invoice and fix message link
//   const message = await Message.findOne({ url: otechieInvoice.paymentUrl })
//   message.url = stripeInvoice.hosted_invoice_url
//   await message.save()
//   otechieInvoice.stripeId = stripeInvoice.id
//   otechieInvoice.paymentUrl = stripeInvoice.hosted_invoice_url
//   otechieInvoice.pdfUrl = stripeInvoice.invoice_pdf
//   await otechieInvoice.save()
//
//   // void old invoice
//   await stripe.invoices.voidInvoice(badStripeInvoiceId, {
//     stripeAccount: customer.accountId
//   })
// }
//
// invoicePaid({
//   id: 'in_1Hyl5zL9KcxvCqcQuecyrLGn',
//   charge: 'ch_1HylNaL9KcxvCqcQssJf39dj'
// })

// This failed with "Error: You can only manually send an invoice if its collection method is 'send_invoice'"
// stripe.invoices.sendInvoice('in_1I6xTFL9KcxvCqcQbvWWzdYb', {
//   stripeAccount: 'acct_1DehDpL9KcxvCqcQ'
// })
//
// async function invoicePaid (stripeInvoice) {
//   const invoice = await Invoice.findOne({ stripeId: stripeInvoice.id, paid: false })
//   if (!invoice) return
//   invoice.status = 'PAID'
//   invoice.paid = true
//   await invoice.save()
//   const chat = await Chat.findById(invoice.chat)
//   const consultant = await Account.findById(chat.consultant)
//   const client = await Account.findById(chat.client._id)
//   const user = await User.findById(client.owner)
//   const amountString = formatCurrency(invoice.amount, invoice.currency)
//   const balanceTransaction = await Stripe.getBalanceTransaction(stripeInvoice.charge, consultant.stripeAccountId)
//   const invoiceItems = await InvoiceItem.find({ invoice: invoice.id })
//   await Balance.addTransactions(invoice, balanceTransaction, consultant, invoiceItems, chat.client.name)
//   await Message.addMessage({
//     event: 'INVOICE_PAID',
//     text: `Paid the ${amountString} invoice`
//   }, user, chat)
//   process.exit(0)
// }
//
// async function importCustomers (username) {
//   const consultants = await Account.find({ stripeAccountId: { $exists: true }, username: { $ne: 'otechie' } })
//   console.log('consultants', consultants.map(c => c.name), consultants.length)
//   for (const consultant of consultants) {
//     console.log('consultant', consultant.username)
//     const chats = await Chat.find({ consultant: consultant._id })
//     for (const chat of chats) {
//       const client = await Account.findById(chat.client._id)
//       const customer = find(client.stripeCustomers, { accountId: consultant.stripeAccountId })
//       if (!customer) {
//         const customer = await Account.createCustomer({ consultant, client })
//         console.log('Created customer', consultant.username, customer)
//       } else {
//         console.log('Existed customer', consultant.username, customer)
//       }
//     }
//   }
//   process.exit(0)
// }
