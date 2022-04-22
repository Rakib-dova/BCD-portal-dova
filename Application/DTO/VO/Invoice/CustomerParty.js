const Party = require('./Party')

class CustomerParty extends Party {
  constructor(customerParty) {
    super(customerParty)
    this.contact = customerParty.Party.Contact?.ID?.value ?? null
    this.customerAssignedAccountID = customerParty.CustomerAssignedAccountID?.value ?? null
  }
}

module.exports = CustomerParty
