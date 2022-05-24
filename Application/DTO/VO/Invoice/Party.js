class Party {
  constructor(party) {
    this.id = party.Party.PartyIdentification[0].ID.value
    this.partyName = party.Party.PartyName[0].Name.value

    if (party.Party.PhysicalLocation) {
      this.physicalLocation = party.Party.PhysicalLocation[0].ID.value
    } else {
      this.physicalLocation = null
    }

    if (party.Party.Contact) {
      this.contact = {}
      const contact = party.Party.Contact
      this.contact.id = contact.ID?.value ?? ''
      this.contact.name = contact.Name?.value ?? ''
      this.contact.telephone = contact.Telephone?.value ?? ''
      this.contact.electronicMail = contact.ElectronicMail?.value ?? ''
    } else {
      this.contact = null
    }

    if (party.Party.PostalAddress) {
      const postalAddress = party.Party.PostalAddress
      this.postbox = postalAddress.Postbox ?? ''
      this.streetName = postalAddress.StreetName ?? ''
      this.additionalStreetName = postalAddress.AdditionalStreetName ?? ''
      this.postalZone = postalAddress.PostalZone ?? ''
      this.cityName = postalAddress.CityName ?? ''
      this.country = postalAddress.Country
    } else {
      // 任意項目
      this.postbox = ''
      this.streetName = ''
      this.additionalStreetName = ''
      this.postalZone = ''
      this.cityName = ''
      this.country = ''
    }
  }
}

module.exports = Party
