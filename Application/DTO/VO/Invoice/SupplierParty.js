const Party = require('./Party.js')

class SupplierParty extends Party {
  constructor(supplierParty) {
    super(supplierParty)
    this.customerAssignedAccountID = supplierParty.CustomerAssignedAccountID?.value ?? null
  }
}

module.exports = SupplierParty
