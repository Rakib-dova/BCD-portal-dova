const Party = require('./Party')

class CustomerParty extends Party {
  constructor(customerParty) {
    super(customerParty)
    this.customerAssignedAccountID = customerParty.CustomerAssignedAccountID?.value ?? null
  }
}

module.exports = CustomerParty
