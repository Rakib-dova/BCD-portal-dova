const validate = require('./validate')
const bconCsvUnitcode = require('../lib/bconCsvUnitcode')
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

    // 支払情報設定
    this.payments = []
    if (!isUndefined(invoice.PaymentTerms) || !isUndefined(invoice.PaymentMeans)) {
      this.setPaymentMeans(invoice.PaymentTerms, invoice.PaymentMeans)
    }

    // 明細部分
    if (!isUndefined(invoice.InvoiceLine) && invoice.InvoiceLine.length !== 0) {
      if (!isUndefined(invoice.AllowanceCharge) && invoice.AllowanceCharge.length !== 0) {
        this.setInvoiceLine(invoice.InvoiceLine, invoice.AllowanceCharge)
      } else {
        this.setInvoiceLine(invoice.InvoiceLine, [])
      }
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

  setPaymentMeans(paymentTerms, paymentMeans) {
    this.payments = []

    // 支払い条件
    if (paymentTerms) {
      paymentTerms.forEach((terms) => {
        // 支払い条件の税コード
        const ID = terms.ID?.value ?? ''
        // 支払い条件の説明
        const note = terms.Note[0]?.value ?? ''
        // 支払い条件の割引率
        const settlementDiscountPercent = terms.SettlementDiscountPercent?.value ?? ''
        // 支払い条件の決済開始日
        const settleStartDate = terms.SettlementPeriod?.StartDate?.value ?? ''
        // 支払い条件の決済終了日
        const settleEndDate = terms.SettlementPeriod?.EndDate?.value ?? ''
        // 支払い条件の割増率
        const penaltySurchargePercent = terms.PenaltySurchargePercent?.value ?? ''
        // 支払い条件の'ペナルティ開始日
        const penaltyStartDate = terms.PenaltyPeriod?.StartDate?.value ?? ''
        // 支払い条件のペナルティ終了日
        const penaltyEndDate = terms.PenaltyPeriod?.EndDate?.value ?? ''

        const paymentTerms = {
          支払い条件: [
            { item: '税コード', value: ID },
            { item: '説明', value: note },
            { item: '割引率', value: settlementDiscountPercent },
            { item: '決済開始日', value: settleStartDate },
            { item: '決済終了日', value: settleEndDate },
            { item: '割増率', value: penaltySurchargePercent },
            { item: 'ペナルティ開始日', value: penaltyStartDate },
            { item: 'ペナルティ終了日', value: penaltyEndDate }
          ]
        }

        // 空欄項目削除
        for (let i = 0; i < paymentTerms.支払い条件.length; i++) {
          if (paymentTerms.支払い条件[i].value === '') {
            paymentTerms.支払い条件.splice(i, 1)
            i--
          }
        }

        this.payments.push(paymentTerms)
      })
    }

    // 支払い手段
    if (paymentMeans) {
      // 支払い方法と条件をcsvに記入
      paymentMeans.forEach((mean) => {
        // 現金払いの場合
        if (mean.PaymentMeansCode?.value === '10') {
          this.payments.push({
            現金払い: {}
          })
        }
        // 小切手払い
        if (mean.PaymentMeansCode?.value === '20') {
          this.payments.push({
            小切手払い: {}
          })
        }
        // BankCard
        if (mean.PaymentMeansCode?.value === '48') {
          this.payments.push({
            'Payment by bank card': {}
          })
        }

        // DirectDebit
        if (mean.PaymentMeansCode?.value === '49') {
          // DirectDebitの銀行名
          const bankName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name.value ?? ''
          // DirectDebitの支店名
          const institutionBranchName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Name?.value ?? ''
          // DirectDebitの科目
          let accountType
          if (mean.PayeeFinancialAccount?.AccountTypeCode?.value === 'Current') {
            accountType = '当座'
          } else if (mean.PayeeFinancialAccount?.AccountTypeCode?.value === 'General') {
            accountType = '普通'
          } else {
            accountType = ''
          }
          // DirectDebitの口座番号
          const accountNumber = mean.PayeeFinancialAccount?.ID?.value ?? ''
          // DirectDebitの口座名義
          const accountName = mean.PayeeFinancialAccount?.Name?.value ?? ''
          // DirectDebitの番地
          const streetName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
          // DirectDebitのビル名 / フロア等
          const additionalStreetName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
          // DirectDebitの家屋番号
          const buildingNumber =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.BuildingNumber?.value ?? ''
          // DirectDebitの市区町村
          const cityName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
          // DirectDebitの都道府県
          const countrySubentity =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
          // DirectDebitの郵便番号
          const postalZone = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.PostalZone?.value ?? ''
          // DirectDebitの所在地
          const addressLine =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
          // DirectDebitの国
          const country =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''

          const directDebitInfo = {
            'Payment by direct debit': [
              { item: '銀行名', value: bankName },
              { item: '支店名', value: institutionBranchName },
              { item: '科目', value: accountType },
              { item: '口座番号', value: accountNumber },
              { item: '口座名義', value: accountName },
              { item: '番地', value: streetName },
              { item: 'ビル名/フロア等', value: additionalStreetName },
              { item: '家屋番号', value: buildingNumber },
              { item: '都道府県', value: cityName },
              { item: '都道府県', value: countrySubentity },
              { item: '郵便番号', value: postalZone },
              { item: '所在地', value: addressLine },
              { item: '国', value: country }
            ]
          }

          // 空欄項目削除
          for (let i = 0; i < directDebitInfo['Payment by direct debit'].length; i++) {
            if (directDebitInfo['Payment by direct debit'][i].value === '') {
              directDebitInfo['Payment by direct debit'].splice(i, 1)
              i--
            }
          }

          this.payments.push(directDebitInfo)
        }

        // 銀行口座
        if (mean.PaymentMeansCode?.value === '42') {
          // 銀行口座の銀行名
          const accountBankName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.Name?.value ?? ''
          // 銀行口座の支店名
          const branchName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Name?.value ?? ''
          // 銀行口座の科目
          let accountType
          if (mean.PayeeFinancialAccount?.AccountTypeCode?.value === 'Current') {
            accountType = '当座'
          } else if (mean.PayeeFinancialAccount?.AccountTypeCode?.value === 'General') {
            accountType = '普通'
          } else {
            accountType = ''
          }
          // 銀行口座の口座番号
          const bankAccountNumber = mean.PayeeFinancialAccount?.ID?.value ?? ''
          // 銀行口座の口座名義
          const bankAccountName = mean.PayeeFinancialAccount?.Name?.value ?? ''
          // 銀行口座の番地
          const bankStreetName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
          // 銀行口座のビル名/フロア等
          const bankAdditionalStreetName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
          // 銀行口座の家屋番号
          const bankBuildingNumber =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch.Address?.BuildingNumber.value ?? ''
          // 銀行口座の市区町村
          const bankCityName = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
          // 銀行口座の都道府県
          const bankCountrySubentity =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
          // 銀行口座の郵便番号
          const bankPostalZone = mean.PayeeFinancialAccount?.FinancialInstitutionBranch.Address?.PostalZone?.value ?? ''
          // 銀行口座の所在地
          const bankAddressLine =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
          // 銀行口座の国
          const bankCountry =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''

          const bankAccountInfo = {
            '銀行口座情報(国内)': [
              { item: '銀行名', value: accountBankName },
              { item: '支店名', value: branchName },
              { item: '科目', value: accountType },
              { item: '口座番号', value: bankAccountNumber },
              { item: '口座名義', value: bankAccountName },
              { item: '番地', value: bankStreetName },
              { item: 'ビル名/フロア等', value: bankAdditionalStreetName },
              { item: '家屋番号', value: bankBuildingNumber },
              { item: '都道府県', value: bankCityName },
              { item: '都道府県', value: bankCountrySubentity },
              { item: '郵便番号', value: bankPostalZone },
              { item: '所在地', value: bankAddressLine },
              { item: '国', value: bankCountry }
            ]
          }

          // 空欄項目削除
          for (let i = 0; i < bankAccountInfo['銀行口座情報(国内)'].length; i++) {
            if (bankAccountInfo['銀行口座情報(国内)'][i].value === '') {
              bankAccountInfo['銀行口座情報(国内)'].splice(i, 1)
              i--
            }
          }

          this.payments.push(bankAccountInfo)
        }

        // IBAN
        if (mean.PaymentChannelCode?.value === 'IBAN') {
          // IBNの銀行識別コード/SWIFTコード
          const ibanFinancialInstitutionId =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.ID?.value ?? ''
          // IBNのIBN
          const iban = mean.PayeeFinancialAccount?.ID?.value ?? ''
          // IBNの説明
          const ibanPaymentNote = mean.PayeeFinancialAccount?.PaymentNote[0]?.value ?? ''

          const ibanInfo = {
            IBANで支払う: [
              { item: '銀行識別コード<br>/SWIFTコード', value: ibanFinancialInstitutionId },
              { item: 'IBAN', value: iban },
              { item: '説明', value: ibanPaymentNote }
            ]
          }

          // 空欄項目削除
          for (let i = 0; i < ibanInfo.IBANで支払う.length; i++) {
            if (ibanInfo.IBANで支払う[i].value === '') {
              ibanInfo.IBANで支払う.splice(i, 1)
              i--
            }
          }

          this.payments.push(ibanInfo)
        }

        // 国際電信送金
        if (mean.PaymentChannelCode?.value === 'SWIFTUS') {
          // 国際電信送金のABAナンバー
          const abaNumber = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.ID?.value ?? ''
          // 国際電信送金のSWIFTコード
          const swiftCode = mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.FinancialInstitution?.ID.value ?? ''
          // 国際電信送金のIBAN
          const internationalIban = mean.PayeeFinancialAccount?.ID?.value ?? ''
          // 国際電信送金の口座名義
          const internationalBankAccountName = mean.PayeeFinancialAccount?.Name?.value ?? ''
          // 国際電信送金の番地
          const internationalStreetName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.StreetName?.value ?? ''
          // 国際電信送金のビル名/フロア等
          const internationalAdditionalStreetName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AdditionalStreetName?.value ?? ''
          // 国際電信送金の家屋番号
          const internationalBuildingNumber =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.BuildingNumber?.value ?? ''
          // 国際電信送金の市区町村
          const internationalCityName =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CityName?.value ?? ''
          // 国際電信送金の都道府県
          const internationalCountrySubentity =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.CountrySubentity?.value ?? ''
          // 国際電信送金の郵便番号
          const internationalPostalZone =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.PostalZone?.value ?? ''
          // 国際電信送金の所在地
          const internationalAddressLine =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.AddressLine[0]?.Line?.value ?? ''
          // 国際電信送金の国
          const internationalCountry =
            mean.PayeeFinancialAccount?.FinancialInstitutionBranch?.Address?.Country?.IdentificationCode?.value ?? ''
          // 国際電信送金の説明
          const internationalPaymentNote = mean.PayeeFinancialAccount?.PaymentNote[0]?.value ?? ''

          const internationalInfo = {
            国際電信送金で支払う: [
              { item: 'ABAナンバー', value: abaNumber },
              { item: 'SWIFTコード', value: swiftCode },
              { item: 'IBAN', value: internationalIban },
              { item: '銀行名', value: '' },
              { item: '口座名義', value: internationalBankAccountName },
              { item: '番地', value: internationalStreetName },
              { item: 'ビル名/フロア等', value: internationalAdditionalStreetName },
              { item: '家屋番号', value: internationalBuildingNumber },
              { item: '都道府県', value: internationalCityName },
              { item: '都道府県', value: internationalCountrySubentity },
              { item: '郵便番号', value: internationalPostalZone },
              { item: '所在地', value: internationalAddressLine },
              { item: '国', value: internationalCountry },
              { item: '説明', value: internationalPaymentNote }
            ]
          }

          // 空欄項目削除（銀行名以外）
          for (let i = 0; i < internationalInfo.国際電信送金で支払う.length; i++) {
            if (
              internationalInfo.国際電信送金で支払う[i].item !== '銀行名' &&
              internationalInfo.国際電信送金で支払う[i].value === ''
            ) {
              internationalInfo.国際電信送金で支払う.splice(i, 1)
              i--
            }
          }

          this.payments.push(internationalInfo)
        }
      })
    }
  }

  setInvoiceLine(invoiceLineContent, allowanceChargeContent) {
    this.invoiceLine = []

    // 明細部分
    invoiceLineContent.forEach((item) => {
      const meisai = {}
      const meisaiDetail = []
      // '明細-項目ID'
      meisai['明細-項目ID'] = item.ID.value

      // 明細-内容の内容
      if (!validate.isUndefined(item.Item.Name.value)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '内容'
        meisaiDetailObject.value = item.Item.Name.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 割引と追加料金
      if (!validate.isUndefined(item.AllowanceCharge)) {
        item.AllowanceCharge.forEach((ac) => {
          // '明細-内容'のobject
          const meisaiDetailObject = {
            item: '',
            value: ''
          }
          // true:追加料金,false:割引
          if (ac.ChargeIndicator.value) {
            meisaiDetailObject.item = '追加料金'
          } else {
            meisaiDetailObject.item = '割引'
          }
          meisaiDetailObject.value = ac.AllowanceChargeReason.value
          meisaiDetail.push(meisaiDetailObject)
        })
      }

      // 部門
      if (!validate.isUndefined(item.AccountingCost)) {
        // '明細-内容'
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '部門'
        meisaiDetailObject.value = item.AccountingCost.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 注文書番号
      if (!validate.isUndefined(item.OrderLineReference)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '注文書番号'
        meisaiDetailObject.value = item.OrderLineReference[0].OrderReference.ID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 注文明細番号
      if (!validate.isUndefined(item.OrderLineReference)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '注文明細番号'
        meisaiDetailObject.value = item.OrderLineReference[0].LineID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 輸送情報,備考
      if (!validate.isUndefined(item.DocumentReference) && item.DocumentReference.length !== 0) {
        item.DocumentReference.forEach((dr) => {
          // '明細-内容'のobject
          const meisaiDetailObject = {
            item: '',
            value: ''
          }
          switch (dr.DocumentTypeCode.value) {
            case 'BOL ID':
              meisaiDetailObject.item = '輸送情報'
              meisaiDetailObject.value = dr.ID.value
              break
            case 'File ID':
              meisaiDetailObject.item = '備考'
              meisaiDetailObject.value = dr.ID.value
              break
            default:
              break
          }
          if (meisaiDetailObject.item !== '') {
            meisaiDetail.push(meisaiDetailObject)
          }
        })
      }

      // 詳細
      if (!validate.isUndefined(item.Item.ModelName)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }

        meisaiDetailObject.item = '詳細'
        meisaiDetailObject.value = item.Item.ModelName[0].value
        meisaiDetail.push(meisaiDetailObject)
      }

      // メーカー名

      // シリアルナンバー
      if (!validate.isUndefined(item.Item.ItemInstance)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = 'シリアルナンバー'
        meisaiDetailObject.value = item.Item.ItemInstance[0].SerialID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // HSN/SAC
      if (!validate.isUndefined(item.Item.AdditionalItemIdentification)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = item.Item.AdditionalItemIdentification[0].ID.schemeID
        meisaiDetailObject.value = item.Item.AdditionalItemIdentification[0].ID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 発注者品番
      if (!validate.isUndefined(item.Item.BuyersItemIdentification)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '発注者品番'
        meisaiDetailObject.value = item.Item.BuyersItemIdentification.ID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 原産国
      if (!validate.isUndefined(item.Item.OriginCountry)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '原産国'
        meisaiDetailObject.value = item.Item.OriginCountry.Name.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // EAN/GTIN
      if (!validate.isUndefined(item.Item.StandardItemIdentification)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = 'EAN/GTIN'
        meisaiDetailObject.value = item.Item.StandardItemIdentification.ID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 納期
      if (!validate.isUndefined(item.DeliveryTerms)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '納期'
        meisaiDetailObject.value = item.DeliveryTerms.ID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 商品分類コード: ECCN: ECCN 商品分類コード: ECCN
      if (!validate.isUndefined(item.Item.CommodityClassification)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '商品分類コード: ECCN'
        meisaiDetailObject.value = item.Item.CommodityClassification[0].ItemClassificationCode.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 非課税/免税の理由
      if (!validate.isUndefined(item.TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxExemptionReason)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '非課税/免税の理由'
        meisaiDetailObject.value = item.TaxTotal[0].TaxSubtotal[0].TaxCategory.TaxExemptionReason.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 貨物注文番号
      if (!validate.isUndefined(item.Delivery)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '貨物注文番号'
        meisaiDetailObject.value = item.Delivery[0].TrackingID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      // 納品日
      if (!validate.isUndefined(item.Delivery)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '納品日'
        let date = item.Delivery[0].ActualDeliveryDate.value
        date = date.replace(/-/g, '/').substring(2)
        meisaiDetailObject.value = date
        meisaiDetail.push(meisaiDetailObject)
      }

      // 配送先
      if (
        !validate.isUndefined(item.Delivery) &&
        !validate.isUndefined(item.Delivery.DeliveryLocation) &&
        !validate.isUndefined(item.Delivery.DeliveryLocation.Address)
      ) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = '配送先'
        meisaiDetailObject.value =
          (item.Delivery[0].DeliveryLocation.Address.Postbox !== undefined
            ? `${item.Delivery[0].DeliveryLocation.Address.Postbox.value}、`
            : '') +
          (item.Delivery[0].DeliveryLocation.Address.StreetName !== undefined
            ? `${item.Delivery[0].DeliveryLocation.Address.StreetName.value}、`
            : '') +
          (item.Delivery[0].DeliveryLocation.Address.AdditionalStreetName !== undefined
            ? `${item.Delivery[0].DeliveryLocation.Address.AdditionalStreetName.value}、`
            : '') +
          (item.Delivery[0].DeliveryLocation.Address.BuildingNumber !== undefined
            ? `${item.Delivery[0].DeliveryLocation.Address.BuildingNumber.value}、`
            : '') +
          (item.Delivery[0].DeliveryLocation.Address.CityName !== undefined
            ? `${item.Delivery[0].DeliveryLocation.Address.CityName.value}、`
            : '') +
          (item.Delivery[0].DeliveryLocation.Address.PostalZone !== undefined
            ? `${item.Delivery[0].DeliveryLocation.Address.PostalZone.value}、`
            : '') +
          (item.Delivery[0].DeliveryLocation.Address.Country !== undefined
            ? `${item.Delivery[0].DeliveryLocation.Address.Country.IdentificationCode.value}、`
            : '')
        meisaiDetail.push(meisaiDetailObject)
      }

      // ロケーションID
      if (!validate.isUndefined(item.Delivery)) {
        // '明細-内容'のobject
        const meisaiDetailObject = {
          item: '',
          value: ''
        }
        meisaiDetailObject.item = 'ロケーションID'
        meisaiDetailObject.value = item.Delivery[0].DeliveryLocation.ID.value
        meisaiDetail.push(meisaiDetailObject)
      }

      meisai['明細-内容'] = meisaiDetail

      // 明細-数量
      const quantityArr = []

      if (!validate.isUndefined(item.InvoicedQuantity)) {
        quantityArr.push(item.InvoicedQuantity.value.toLocaleString('ja-JP'))
      }

      // 割引と追加料金の数量
      if (!validate.isUndefined(item.AllowanceCharge)) {
        item.AllowanceCharge.forEach((ac) => {
          if (ac.MultiplierFactorNumeric.value !== 1) {
            quantityArr.push(ac.MultiplierFactorNumeric.value * 100)
          } else {
            quantityArr.push(1)
          }
        })
      }
      meisai['明細-数量'] = quantityArr

      // 明細-単位
      const unitCodeArr = []
      const unitcodes = Object.entries(bconCsvUnitcode)

      if (!validate.isUndefined(item.InvoicedQuantity)) {
        unitcodes.forEach(([key, value]) => {
          if (item.InvoicedQuantity.unitCode === value) {
            unitCodeArr.push(key)
          }
        })
      }

      // 割引と追加料金の単位
      if (!validate.isUndefined(item.AllowanceCharge)) {
        item.AllowanceCharge.forEach((ac) => {
          if (ac.MultiplierFactorNumeric.value !== 1) {
            unitCodeArr.push('%')
          } else {
            unitCodeArr.push(1)
          }
        })
      }
      meisai['明細-単位'] = unitCodeArr

      // 明細-単価
      const costArr = []

      if (!validate.isUndefined(item.DocumentReference) && item.DocumentReference.length !== 0) {
        item.DocumentReference.forEach((dr) => {
          if (dr.DocumentTypeCode.value === 'LinePrice') {
            const cost = Math.floor(dr.ID.value)
            costArr.push(cost.toLocaleString('ja-JP'))
          }
        })
      } else {
        costArr.push(item.Price.PriceAmount.value.toLocaleString('ja-JP'))
      }

      if (!validate.isUndefined(item.AllowanceCharge)) {
        item.AllowanceCharge.forEach((ac) => {
          if (ac.ChargeIndicator.value) {
            costArr.push(ac.Amount.value.toLocaleString('ja-JP'))
          } else {
            costArr.push('-' + ac.Amount.value.toLocaleString('ja-JP'))
          }
        })
      }

      meisai['明細-単価'] = costArr // 51000
      meisai['明細-税（消費税／軽減税率／不課税／免税／非課税）'] = [
        `${item.TaxTotal[0].TaxSubtotal[0].TaxCategory.Percent.value}%`
      ]
      meisai['明細-小計 (税抜)'] = item.LineExtensionAmount.value.toLocaleString('ja-JP') // ','処理必要
      this.invoiceLine.push(meisai)
    })

    // 共通割引と追加料金
    const discountAndChargeAll = {}
    const discountArr = []
    const chargeArr = []
    if (allowanceChargeContent.length === 0) {
      return
    }

    allowanceChargeContent.forEach((item) => {
      // 割引の場合
      if (!item.ChargeIndicator.value) {
        const discountObject = {}
        discountObject['割引-項目ID'] = '割引'
        discountObject['割引-内容'] = item.AllowanceChargeReason.value
        if (item.MultiplierFactorNumeric.value !== 1) {
          discountObject['割引-数量'] = item.MultiplierFactorNumeric.value * 100
          discountObject['割引-単位'] = '%'
        } else {
          discountObject['割引-数量'] = 1
          discountObject['割引-単位'] = 1
        }
        discountObject['割引-税（消費税／軽減税率／不課税／免税／非課税）'] = `${item.TaxCategory[0].Percent.value}%`
        discountObject['割引-小計（税抜）'] = '-' + item.Amount.value.toLocaleString('ja-JP')
        discountArr.push(discountObject)
      } else {
        // 追加料金の場合
        const chargeObject = {}
        chargeObject['割引-項目ID'] = '追加料金'
        chargeObject['割引-内容'] = item.AllowanceChargeReason.value
        if (item.MultiplierFactorNumeric.value !== 1) {
          chargeObject['割引-数量'] = item.MultiplierFactorNumeric.value * 100
          chargeObject['割引-単位'] = '%'
        } else {
          chargeObject['割引-数量'] = 1
          chargeObject['割引-単位'] = 1
        }
        chargeObject['割引-税（消費税／軽減税率／不課税／免税／非課税）'] = `${item.TaxCategory[0].Percent.value}%`
        chargeObject['割引-小計（税抜）'] = item.Amount.value.toLocaleString('ja-JP')
        chargeArr.push(chargeObject)
      }
    })

    discountAndChargeAll['割引'] = discountArr
    discountAndChargeAll['追加料金'] = chargeArr
    this.invoiceLine.push(discountAndChargeAll)
  }
}
module.exports = InvoiceDetail
