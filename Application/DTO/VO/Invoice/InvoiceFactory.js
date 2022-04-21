class InvoiceFactory {
  constructor(passport, contract) {
    this.accessToken = passport.accessToken
    this.refreshToken = passport.refreshToken
    this.tenantId = passport.tenantId
    this.contract = contract
    this.tradeshiftDTO = new (require('../DTO/TradeshiftDTO'))(this.accessToken, this.refreshToken, this.tenantId)
  }

  async findDocuments(sentBy, businessId, minIssuedate, maxIssuedate) {
    const response = []
    const searchResult = []
    let page = 0
    let numPages = 1
    do {
      const documents = await this.tradeshiftDTO.getDocuments(
        null,
        null,
        null,
        page,
        null,
        null,
        null,
        sentBy,
        null,
        minIssuedate,
        maxIssuedate,
        null,
        businessId,
        false
      )
      numPages = page.numPages
      page++
      response.push(...documents.Document)
    } while (page < numPages)
    for (const document of response) {
      if (document.ID.indexOf(businessId) !== -1) {
        searchResult.push(document)
      }
    }
    return searchResult
  }

  async getInvoices(sentBy, businessId, minIssuedate, maxIssuedate, isCloedApproval) {
    const documents = []
    const result = []
    const isSearchedDocument = await this.findDocuments(sentBy, businessId, minIssuedate, maxIssuedate)

    if (isSearchedDocument.length === 0) return null

    for (const document of isSearchedDocument) {
      const documentId = document.DocumentId
      const response = await this.tradeshiftDTO.getDocument(documentId)
      documents.push({ ...response, documentId })
    }

    for (const invoice of documents) {
      const coding = await this.getCoding(isCloedApproval, invoice.documentId)
      if (coding) {
        result.push(new Invoice(invoice, coding))
      }
    }

    return result
  }

  async getCoding(isCloedApproval, documentId) {
    const coding = await this.contract.getCoding(isCloedApproval, documentId)
    return coding
  }
}

// ダミークラス
const Coding = require('../DTO/VO/Invoice/Coding')
// ダミークラス
class Invoice {
  constructor(document, coding) {
    this.documentId = document.documentId
    this.id = document.ID.value
    this.issueDate = document.IssueDate.value
    this.invoiceLine = []
    for (const invoiceLine of document.InvoiceLine) {
      this.invoiceLine.push(new InvoiceLine(invoiceLine, coding))
    }
  }
}

class InvoiceLine {
  constructor(invoiceLine, coding) {
    this.id = invoiceLine.ID.value
    this.invoicedQuantity = invoiceLine.InvoicedQuantity.value
    this.unitCode = invoiceLine.InvoicedQuantity.unitCode
    this.lineExtensionAmount = invoiceLine.LineExtensionAmount.value
    this.setCoding(coding)
  }

  setCoding(codings) {
    this.coding = []
    for (const coding of codings) {
      if (coding.lineNo === Number(this.id)) {
        this.coding.push(new Coding(coding))
      }
    }
  }
}

module.exports = InvoiceFactory
