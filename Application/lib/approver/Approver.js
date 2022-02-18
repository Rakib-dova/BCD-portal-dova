'use stric'

class Approver {
  constructor(userAccount) {
    this.tenantId = userAccount.Memberships[0].GroupId
    this.Id = userAccount.Id
    this.Username = userAccount.Username
    this.FirstName = userAccount.FirstName
    this.LastName = userAccount.LastName
  }

  getName() {
    return `${this.FirstName} ${this.LastName}`
  }

  getMail() {
    return this.Username
  }
}

module.exports = Approver
