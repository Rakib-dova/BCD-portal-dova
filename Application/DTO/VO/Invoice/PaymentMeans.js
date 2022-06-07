class PaymentMeans {
  constructor(paymentMeans) {
    if (paymentMeans.ID) {
      this.id = paymentMeans.ID.value
    } else {
      this.id = null
    }

    this.paymentMeansCode = paymentMeans.PaymentMeansCode.value

    if (paymentMeans.PaymentDueDate) {
      this.paymentDueDate = paymentMeans.PaymentDueDate.value
    } else {
      this.paymentDueDate = null
    }

    if (paymentMeans.PaymentChannelCode) {
      this.paymentChannelCode = paymentMeans.PaymentChannelCode.value
    }

    if (paymentMeans.PayeeFinancialAccount) {
      this.payeeFinancialAccount = {}
      const payeeFinancialAccount = paymentMeans.PayeeFinancialAccount
      this.payeeFinancialAccount.id = payeeFinancialAccount.ID.value

      if (payeeFinancialAccount.PaymentNote) {
        this.payeeFinancialAccount.note = payeeFinancialAccount.PaymentNote
      } else {
        this.payeeFinancialAccount.note = null
      }

      if (payeeFinancialAccount.Name) {
        this.payeeFinancialAccount.name = payeeFinancialAccount.Name.value
      } else {
        this.payeeFinancialAccount.name = null
      }

      this.payeeFinancialAccount.financialInstitutionBranch = {
        name: payeeFinancialAccount.FinancialInstitutionBranch.Name.value,
        financialInstitution: payeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name.value
      }

      this.payeeFinancialAccount.accountCodeType = payeeFinancialAccount.AccountTypeCode.value
    }
  }
}

module.exports = PaymentMeans
