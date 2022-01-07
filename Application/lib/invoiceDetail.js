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

    this.setOptions(invoice)
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

  setOptions(invoice) {
    this.options = {}
    if (!isUndefined(invoice.Note) && invoice.Note.length !== 0) {
      this.options.note = invoice.Note[0].value
    }

    if (!isUndefined(invoice.AdditionalDocumentReference) && invoice.AdditionalDocumentReference.length !== 0) {
      const addtionalDocRef = invoice.AdditionalDocumentReference

      addtionalDocRef.forEach((item) => {
        switch (item.DocumentTypeCode.value) {
          case 'BOL ID':
            this.options.boldId = item.ID.value
            break
          case 'Interim Hours':
            this.options.interimHours = item.ID.value
            break
          case 'Clearance Clave':
            this.options.clearanceClave = item.ID.value
            break
          case 'TS Clearance':
            this.options.tsClearance = item.ID.value
            break
          case 'File ID':
            this.options.fileId = item.ID.value
            break
          case 'BookingNumber':
            this.options.bookingNumber = item.ID.value
            break
          case 'DOWN':
            this.options.roundingRule = item.ID.value
            break
          case 'humanreadableversion':
            this.options.humanReadableVersion = item.ID.value
            break
        }
      })

      if (!isUndefined(invoice.DeliveryTerms)) {
        this.options.deliveryTerms = invoice.DeliveryTerms.ID.value
      }

      if (!isUndefined(invoice.IssueDate)) {
        this.options.issueDate = invoice.IssueDate.value
      }

      if (!isUndefined(invoice.PaymentMeans) && invoice.PaymentMeans.length !== 0) {
        const paymentMeans = invoice.PaymentMeans
        paymentMeans.forEach((item) => {
          if (!isUndefined(item.PaymentDueDate)) {
            this.options.paymentDueDate = item.PaymentDueDate.value
          }
        })
      }

      if (!isUndefined(invoice.OrderReference)) {
        this.options.orderRef = {}
        if (!isUndefined(invoice.OrderReference.ID)) {
          this.options.orderRef.no = invoice.OrderReference.ID.value
        }
        if (!isUndefined(invoice.OrderReference.IssueDate)) {
          this.options.orderRef.issueDate = invoice.OrderReference.IssueDate.value
        }
      }

      if (!isUndefined(invoice.DocumentCurrencyCode)) {
        switch (invoice.DocumentCurrencyCode.value) {
          case 'JPY':
            this.options.documentCurrencyCode = '円'
            break
        }
      }

      if (!isUndefined(invoice.AccountingCost)) {
        this.options.accountingCost = invoice.AccountingCost.value
      }

      if (!isUndefined(invoice.ContractDocumentReference) && invoice.ContractDocumentReference.length !== 0) {
        this.options.contractDocumentRef = invoice.ContractDocumentReference[0].ID.value
      }

      if (!isUndefined(invoice.Delivery) && invoice.Delivery.length !== 0) {
        const delivery = invoice.Delivery
        delivery.forEach((item) => {
          const keys = Object.keys(item)
          keys.forEach((key) => {
            switch (key) {
              case 'ActualDeliveryDate':
                this.options.actualDeliveryDate = item.ActualDeliveryDate.value
                break
              case 'PromisedDeliveryPeriod':
                this.options.promisedDeliveryPeriod = {}
                this.options.promisedDeliveryPeriod.startDate = item.PromisedDeliveryPeriod.StartDate.value
                this.options.promisedDeliveryPeriod.endDate = item.PromisedDeliveryPeriod.EndDate.value
                break
              case 'Despatch':
                this.options.despatch = item.Despatch.ID.value
            }
          })
        })
      }

      if (!isUndefined(invoice.AccountingCustomerParty.CustomerAssignedAccountID)) {
        this.options.customerAssAccId = invoice.AccountingCustomerParty.CustomerAssignedAccountID.value
      }

      if (!isUndefined(invoice.TaxPointDate)) {
        this.options.taxPointDate = invoice.TaxPointDate.value
      }

      if (!isUndefined(invoice.BillingReference) && invoice.BillingReference.length !== 0) {
        const billRef = invoice.BillingReference
        billRef.forEach((item) => {
          const keys = Object.keys(item)
          keys.forEach((key) => {
            switch (key) {
              case 'InvoiceDocumentReference':
                this.options.invoiceDocRef = item.InvoiceDocumentReference.ID.value
                break
            }
          })
        })
      }

      if (!isUndefined(invoice.AccountingSupplierParty.Party.PhysicalLocation)) {
        this.options.physicalLocation = invoice.AccountingSupplierParty.Party.PhysicalLocation.ID.value
      }

      if (!isUndefined(invoice.AccountingCustomerParty.Party.Contact)) {
        if (!isUndefined(invoice.AccountingCustomerParty.Party.Contact.ID)) {
          this.options.contactEmail = invoice.AccountingCustomerParty.Party.Contact.ID.value
        }
      }
    }
  }
}
module.exports = InvoiceDetail
