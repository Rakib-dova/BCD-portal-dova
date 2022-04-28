const Party = require('./Party.js')

class SupplierParty extends Party {
  constructor(supplierParty) {
    super(supplierParty)
    if (supplierParty.Party.PhysicalLocation) {
      this.physicalLocation = supplierParty.Party.PhysicalLocation[0].ID.value
    } else {
      this.physicalLocation = null
    }

    if (supplierParty.Party.Contact) {
      this.contact = {}
      const contact = supplierParty.Party.Contact
      this.contact.id = contact.ID.value
      this.contact.name = contact.Name.value
      this.contact.telephone = contact.Telephone?.value ?? ''
      this.contact.electronicMail = contact.ElectronicMail.value
    } else {
      this.contact = null
    }
  }
}

module.exports = SupplierParty
