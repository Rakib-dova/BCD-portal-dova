'use strict'

class UserAccounts {
  static setUserAccounts(_userAccounts) {
    const userAccounts = new UserAccounts()

    userAccounts.id = _userAccounts.Id
    userAccounts.companyName = _userAccounts.CompanyName
    userAccounts.email = _userAccounts.Username
    userAccounts.firstName = _userAccounts.FirstName
    userAccounts.lastName = _userAccounts.LastName
    userAccounts.state = _userAccounts.State
    userAccounts.memberships = _userAccounts.Memberships

    const keys = Object.keys(userAccounts)
    keys.forEach((property) => {
      Object.defineProperty(userAccounts, property, { writable: false })
    })

    return userAccounts
  }

  getId() {
    return this.id
  }

  getCompanyName() {
    return this.companyName
  }

  getEmail() {
    return this.email
  }

  getName() {
    return `${this.lastName} ${this.firstName}`
  }

  getFirstName() {
    return this.firstName
  }

  getLastName() {
    return this.lastName
  }
}

module.exports = UserAccounts
