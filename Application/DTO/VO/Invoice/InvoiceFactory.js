const Invoice = require('./')

class InvoiceFactory {
  constructor(passport, contract) {
    this.accessToken = passport.accessToken
    this.refreshToken = passport.refreshToken
    this.tenantId = passport.tenantId
    this.contract = contract
    this.tradeshiftDTO = new (require('../../TradeshiftDTO'))(this.accessToken, this.refreshToken, this.tenantId)
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

      if (documents instanceof Error) throw documents

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
    let documents = []
    const result = []
    const isSearchedDocument = await this.findDocuments(sentBy, businessId, minIssuedate, maxIssuedate)

    if (isSearchedDocument.length === 0) return null

    await Promise.all(
      isSearchedDocument.map(async (key) => {
        return this.tradeshiftDTO.getDocument(key.DocumentId)
      })
    ).then(function (result) {
      documents = result
    })

    // エラーを確認する
    for (let i = 0; documents.length > i; i++) {
      if (documents[i] instanceof Error) throw documents
    }

    for (const invoice of documents) {
      const coding = await this.getCoding(isCloedApproval, invoice.documentId)

      if (coding) {
        result.push(new Invoice(invoice, coding))
      }
    }

    if (result.length === 0) return null

    return result
  }

  async getCoding(isCloedApproval, documentId) {
    const coding = await this.contract.getCoding(isCloedApproval, documentId)

    if (coding instanceof Error) throw coding

    return coding
  }
}

module.exports = InvoiceFactory
