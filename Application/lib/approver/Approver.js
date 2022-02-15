'use stric'

class Approver {
  constructor(userAccount) {
    this.Id = userAccount.Id
    this.Username = userAccount.Username
    this.FirstName = userAccount.FirstName
    this.LastName = userAccount.LastName
  }
}

module.exports = Approver
