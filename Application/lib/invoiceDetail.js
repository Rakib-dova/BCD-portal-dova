const validate = require('./validate')
const isUndefined = validate.isUndefined
class InvoiceDetail {
  constructor(invoice) {
    if (isUndefined(invoice)) throw new Error('not create Invoice Object.')
    if (isUndefined(invoice.DocumentType) || invoice.DocumentType !== 'InvoiceType') {
      throw new Error('Document Type Error. is not invoice document.')
    }

    this.invoiceId = invoice.ID.value

    if (!isUndefined(invoice.AccountingSupplierParty)) {
      this.setSupplier(invoice.AccountingSupplierParty)
    }
    if (!isUndefined(invoice.AccountingCustomerParty)) {
      this.setCustomer(invoice.AccountingCustomerParty)
    }

    if (!isUndefined(invoice.TaxTotal)) {
      this.setTaxtotal(invoice.TaxTotal)
    }

    if (!isUndefined(invoice.LegalMonetaryTotal)) {
      this.setLegalMonetary(invoice.LegalMonetaryTotal)
    }

    if (!isUndefined(invoice.TaxExchangeRate)) {
      this.setTaxExchangeRate(invoice.TaxExchangeRate)
    }

    if (!isUndefined(invoice.UBLExtensions.UBLExtension[0])) {
      this.setExtenstionContent(invoice.UBLExtensions.UBLExtension[0].ExtensionContent)
    }
  }

  setSupplier(accountingSupplierParty) {
    this.supplier = {}
    this.supplier.name = accountingSupplierParty.Party.PartyName[0].Name.value
    if (!isUndefined(accountingSupplierParty.Party.PostalAddress)) {
      const address = accountingSupplierParty.Party.PostalAddress
      this.supplier.address = {}
      this.supplier.address.streetName = !isUndefined(address.StreetName) ? address.StreetName.value : ''
      this.supplier.address.additionalStreetName = !isUndefined(address.AdditionalStreetName)
        ? address.AdditionalStreetName.value
        : ''
      this.supplier.address.cityName = !isUndefined(address.CityName) ? address.CityName.value : ''
      this.supplier.address.postalNumber = !isUndefined(address.PostalZone) ? address.PostalZone.value : ''
      this.supplier.address.country = !isUndefined(address.Country)
        ? `${address.Country.IdentificationCode.value === 'JP' ? '日本' : ''}`
        : ''
    }
    if (!isUndefined(accountingSupplierParty.Party.PartyIdentification)) {
      this.supplier.id = []
      accountingSupplierParty.Party.PartyIdentification.forEach((item) => {
        this.supplier.id.push({
          schemeId: item.ID.schemeID,
          value: item.ID.value
        })
      })
    }
    if (
      !isUndefined(accountingSupplierParty.Party.Contact) &&
      !isUndefined(accountingSupplierParty.Party.Contact.ElectronicMail)
    ) {
      this.supplier.email = accountingSupplierParty.Party.Contact.ElectronicMail.value
    }
  }

  setCustomer(accountingCustomerParty) {
    this.customer = {}
    this.customer.name = accountingCustomerParty.Party.PartyName[0].Name.value
    if (!isUndefined(accountingCustomerParty.Party.PostalAddress)) {
      const address = accountingCustomerParty.Party.PostalAddress
      this.customer.address = {}
      this.customer.address.streetName = !isUndefined(address.StreetName) ? address.StreetName.value : ''
      this.customer.address.additionalStreetName = !isUndefined(address.AdditionalStreetName)
        ? address.AdditionalStreetName.value
        : ''
      this.customer.address.cityName = !isUndefined(address.CityName) ? address.CityName.value : ''
      this.customer.address.postalNumber = !isUndefined(address.PostalZone) ? address.PostalZone.value : ''
      this.customer.address.country = !isUndefined(address.Country)
        ? `${address.Country.IdentificationCode.value === 'JP' ? '日本' : ''}`
        : ''
    }
    if (!isUndefined(accountingCustomerParty.Party.PartyIdentification)) {
      this.customer.id = []
      accountingCustomerParty.Party.PartyIdentification.forEach((item) => {
        this.customer.id.push({
          schemeId: item.ID.schemeID,
          value: item.ID.value
        })
      })
    }
  }

  setIssueDate(issueDate) {
    if (isUndefined(issueDate)) return null
  }

  setTaxtotal(taxTotal) {
    if (isUndefined(taxTotal[0])) return null

    this.taxAmount = taxTotal[0].TaxAmount.value
    this.taxSubtotal = []
    this.transactionCurrTaxAmount = {}

    taxTotal[0].TaxSubtotal.forEach((subItem) => {
      this.taxSubtotal.push({
        taxableAmount: subItem.TaxableAmount.value,
        categoryName: subItem.TaxCategory.TaxScheme.Name.value,
        taxAmount: !isUndefined(subItem.TaxAmount) ? subItem.TaxAmount.value : null,
        transactionCurrTaxAmount: !isUndefined(subItem.TransactionCurrencyTaxAmount)
          ? subItem.TransactionCurrencyTaxAmount.value
          : null
      })
      if (!isUndefined(subItem.TransactionCurrencyTaxAmount)) {
        if (isUndefined(this.transactionCurrTaxAmount[subItem.TransactionCurrencyTaxAmount.currencyID])) {
          this.transactionCurrTaxAmount[subItem.TransactionCurrencyTaxAmount.currencyID] = 0
        }
        this.transactionCurrTaxAmount[subItem.TransactionCurrencyTaxAmount.currencyID] +=
          subItem.TransactionCurrencyTaxAmount.value
      }
    })
  }

  setLegalMonetary(legalMonetaryTotal) {
    if (validate.isUndefined(legalMonetaryTotal)) return null
    this.subtotal = !isUndefined(legalMonetaryTotal.LineExtensionAmount)
      ? legalMonetaryTotal.LineExtensionAmount.value
      : null
    this.subtotalOftax = !isUndefined(legalMonetaryTotal.TaxExclusiveAmount)
      ? legalMonetaryTotal.TaxExclusiveAmount.value
      : null
    this.total = !isUndefined(legalMonetaryTotal.TaxInclusiveAmount)
      ? legalMonetaryTotal.TaxInclusiveAmount.value
      : null
    this.payableAmount = !isUndefined(legalMonetaryTotal.PayableAmount) ? legalMonetaryTotal.PayableAmount.value : null
    this.allowanceTotalAmount = !isUndefined(legalMonetaryTotal.AllowanceTotalAmount)
      ? legalMonetaryTotal.AllowanceTotalAmount.value
      : null
    this.chargeTotalAmount = !isUndefined(legalMonetaryTotal.ChargeTotalAmount)
      ? legalMonetaryTotal.ChargeTotalAmount.value
      : null
  }

  setTaxExchangeRate(taxExchangeRate) {
    this.taxExRate = {}
    this.taxExRate.sourceCurrCode = taxExchangeRate.SourceCurrencyCode.value
    this.taxExRate.targetCurrCode = taxExchangeRate.TargetCurrencyCode.value
    this.taxExRate.calculationRate = taxExchangeRate.CalculationRate.value
    this.taxExRate.mathchOpCode = taxExchangeRate.MathematicOperatorCode.value
    if (taxExchangeRate.Date) {
      const date = new Date(taxExchangeRate.Date.value)
      this.taxExRate.date = `${(date.getFullYear() + '').substr(-2)}/${date.getMonth()}/${date.getDate()}`
    }
  }

  setExtenstionContent(extensionContent) {
    const content = extensionContent.value
    this.extenstionContent = content.substr(
      content.search('<ts:PayableAlternativeAmount>') + '<ts:PayableAlternativeAmount>'.length,
      content.search('</ts:PayableAlternativeAmount>') -
        content.search('<ts:PayableAlternativeAmount>') -
        '<ts:PayableAlternativeAmount>'.length
    )
  }
}
module.exports = InvoiceDetail
