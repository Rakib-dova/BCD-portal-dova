class Invoice {
  static setInvoice(_invoice) {
    const invoice = new Invoice()

    invoice.invoiceId = _invoice.ID.value
    invoice.issueDate = _invoice.IssueDate.value
    invoice.supplierParty = new SupplierParty().setSupplierParty(_invoice.AccountingSupplierParty) ?? null
    invoice.customerParty = new CustomerParty().setCustomerParty(_invoice.AccountingCustomerParty) ?? null
    invoice.legalMonetaryTotal = new LegalMonetaryTotal().setLegalMonetaryTotal(_invoice.LegalMonetaryTotal)
    invoice.paymentMeans = new PaymentMeans().setPaymentMeans(_invoice.PaymentMeans[0]) ?? null
    invoice.taxTotal = new TaxTotal().setTaxtotal(_invoice.TaxTotal[0]) ?? null
    invoice.invoiceLine = new InvoiceLine().setInvoiceLine(_invoice.InvoiceLine) ?? null

    const keys = Object.keys(invoice)
    keys.forEach((property) => {
      Object.defineProperty(invoice, property, { writable: false })
    })

    return invoice
  }
}

class Party {
  setParty(_party) {
    const party = new Party()

    party.ID = _party.PartyIdentification.ID.value
    party.PartyName = _party.PartyName[0].Name.value

    // 任意項目
    party.Country = _party.PostalAddress?.Country?.IdentificationCode?.value ?? null
    party.Postbox = _party.PostalAddress?.Postbox?.value ?? null
    party.PostalZone = _party.PostalAddress?.PostalZone?.value ?? null
    party.CityName = _party.PostalAddress?.CityName?.value ?? null
    party.StreetName = _party.PostalAddress?.StreetName?.value ?? null
    party.AdditionalStreetName = _party.PostalAddress?.AdditionalStreetName?.value ?? null

    return party
  }
}

class SupplierParty {
  setSupplierParty(_supplierParty) {
    const supplierParty = new Party().setParty(_supplierParty.Party)

    supplierParty.PhysicalLocation = _supplierParty.Party.PhysicalLocation?.ID?.value ?? null
  }
}

class CustomerParty {
  setCustomerParty(_customerParty) {
    const customerParty = new Party().setParty(_customerParty.Party)

    customerParty.Contact = _customerParty.Party.Contact?.ID?.value ?? null
    customerParty.CustomerAssignedAccountID = _customerParty.CustomerAssignedAccountID?.value ?? null

    return customerParty
  }
}

class LegalMonetaryTotal {
  setLegalMonetaryTotal(_legalMonetaryTotal) {
    const legalMonetaryTotal = new LegalMonetaryTotal()

    legalMonetaryTotal.LineExtensionAmount = _legalMonetaryTotal.LineExtensionAmount.value
    legalMonetaryTotal.TaxExclusiveAmount = _legalMonetaryTotal.TaxExclusiveAmount.value
    legalMonetaryTotal.TaxInclusiveAmount = _legalMonetaryTotal.TaxInclusiveAmount.value
    legalMonetaryTotal.PayableAmount = _legalMonetaryTotal.PayableAmount.value

    return legalMonetaryTotal
  }
}

class PaymentMeans {
  setPaymentMeans(_paymentMeans) {
    const paymentMeans = new PaymentMeans()

    paymentMeans.ID = _paymentMeans?.ID?.value ?? null
    paymentMeans.PaymentMeansCode = _paymentMeans?.PaymentMeansCode?.value ?? null
    paymentMeans.PaymentDueDate = _paymentMeans?.PaymentDueDate?.value ?? null

    return paymentMeans
  }
}

class InvoiceLine {
  setInvoiceLine(_invoiceLines) {
    const lines = []

    for (let idx = 0; idx < _invoiceLines.length; ++idx) {
      const invoiceLine = new InvoiceLine()

      invoiceLine.ID = _invoiceLines[idx]?.ID?.value ?? null
      invoiceLine.InvoicedQuantity = _invoiceLines[idx]?.InvoicedQuantity?.value ?? null
      invoiceLine.UnitCode = _invoiceLines[idx]?.InvoicedQuantity?.unitCode ?? null
      invoiceLine.LineExtensionAmount = _invoiceLines[idx]?.LineExtensionAmount?.value ?? null
      invoiceLine.OrderLineReferenceID = _invoiceLines[idx]?.OrderLineReference[0]?.OrderReference?.ID?.value ?? null
      invoiceLine.OrderLineReferenceLineID = _invoiceLines[idx]?.OrderLineReference[0]?.LineID?.value ?? null

      // 税
      invoiceLine.TaxCategory =
        new TaxCategory().setTaxCategory(_invoiceLines[idx].TaxTotal[0]?.TaxSubtotal[0]?.TaxCategory) ?? null
      // 割引か追加料金
      invoiceLine.AllowanceCharge = new AllowanceCharge().setAllowanceCharge(_invoiceLines[idx].AllowanceCharge) ?? null
      invoiceLine.DocumentReference =
        new DocumentReference().setDocumentReference(_invoiceLines[idx].DocumentReference) ?? null

      // 明細-単価（割引や追加料金などがない場合）
      invoiceLine.Price = new Price().setPrice(_invoiceLines[idx].Price) ?? null
      // 明細
      invoiceLine.Item = new Item().setItem(_invoiceLines[idx].Item) ?? null
      // 明細-納期
      invoiceLine.Delivery = new Delivery().setDelivery(_invoiceLines[idx].Delivery) ?? null
    }

    return lines
  }
}

class AllowanceCharge {
  setAllowanceCharge(_allowanceCharge) {
    const allowanceCharges = []

    for (let idx = 0; idx < _allowanceCharge.length; ++idx) {
      const allowanceCharge = new AllowanceCharge()

      // 割引idx-内容
      allowanceCharge.AllowanceChargeReason = _allowanceCharge[idx]?.AllowanceChargeReason?.value ?? null
      // 割引idx-単位
      allowanceCharge.MultiplierFactorNumeric = _allowanceCharge[idx]?.MultiplierFactorNumeric?.value ?? null
      // 割引1-税（消費税／軽減税率／不課税／免税／非課税）
      allowanceCharge.TaxCategory = new TaxCategory().setTaxCategory(_allowanceCharge[idx]?.TaxCategory) ?? null
      // 割引idx-小計（税抜）
      allowanceCharge.Amount = _allowanceCharge[idx]?.Amount?.value ?? null

      allowanceCharges.push(allowanceCharge)
    }

    return allowanceCharges
  }
}

class DocumentReference {
  setDocumentReference(_documentReference) {
    const documentReferences = []

    for (let idx = 0; idx < _documentReference.length; ++idx) {
      const documentReference = new DocumentReference()

      documentReference.DocumentTypeCode = _documentReference[idx]?.DocumentTypeCode?.value ?? null

      documentReferences.push(documentReference)
    }

    return documentReferences
  }
}

class Delivery {
  setPrice(_delivery) {}
}

class Price {
  setPrice(_price) {
    const price = new Price()

    price.TaxAmount = _price?.PriceAmount?.value ?? null

    return price
  }
}

class TaxTotal {
  setTaxTotal(_taxTotal) {
    const taxTotal = new TaxTotal()

    taxTotal.TaxAmount = _taxTotal?.TaxAmount?.value ?? null
    taxTotal.TaxSubtotal = new TaxSubTotal().setTaxSubTotal(_taxTotal.TaxSubtotal[0])
    taxTotal.PaymentDueDate = _taxTotal?.PaymentDueDate?.value ?? null

    return taxTotal
  }
}

class TaxSubTotal {
  setTaxSubTotal(_taxSubtotal) {
    const taxSubtotal = new TaxSubTotal()

    taxSubtotal.TransactionCurrencyTaxAmount = _taxSubtotal?.TransactionCurrencyTaxAmount?.value ?? null
    taxSubtotal.TaxCategory = new TaxCategory().setTaxCategory(_taxSubtotal.TaxCategory)

    return taxSubtotal
  }
}

class TaxCategory {
  setTaxCategory(_taxCategory) {
    const taxCategory = new TaxCategory()

    taxCategory.ID = _taxCategory?.ID?.value ?? null
    taxCategory.Percent = _taxCategory?.Percent?.value ?? null
    taxCategory.TaxScheme = _taxCategory?.Name?.value ?? null

    return taxCategory
  }
}

module.exports = {
  Invoice,
  SupplierParty,
  CustomerParty,
  LegalMonetaryTotal,
  PaymentMeans,
  InvoiceLine,
  AllowanceCharge,
  DocumentReference,
  Item,
  Delivery,
  Price,
  TaxTotal,
  TaxSubTotal,
  TaxCategory
}
