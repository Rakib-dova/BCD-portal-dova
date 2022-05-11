const headerErrorDiv = $('#header-error')
const linesErrorDiv = $('#lines-error')
const footerErrorDiv = $('#footer-error')

// eslint-disable-next-line no-unused-vars
const rules = [
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '請求書番号',
    prop: 'invoiceNo',
    regexp: /^([a-zA-Z0-9 -~]{0,32})$/,
    get message() { return `${this.displayName}は半角英数字32桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '通貨',
    prop: 'currency',
    regexp: /^([a-zA-Z0-9]{0,10})$/,
    get message() { return `${this.displayName}は半角英数字10桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '請求日',
    prop: 'billingDate',
    regexp: '',
    get message() { return '' },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '納品日',
    prop: 'deliveryDate',
    regexp: '',
    get message() { return '' },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '支払期日',
    prop: 'paymentDate',
    regexp: '',
    get message() { return '' },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '宛先企業',
    prop: 'recCompany',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,32})+$/,
    get message() { return `${this.displayName}は全角32桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '宛先郵便番号',
    prop: 'recPost',
    regexp: /[0-9]{7}/,
    get message() { return `${this.displayName}は半角数字７桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '都道府県',
    prop: 'recAddr1',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,32})+$/,
    get message() { return `${this.displayName}は全角32桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: '住所',
    prop: 'recAddr2',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,32})+$/,
    get message() { return `${this.displayName}は全角32桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'header',
    displayName: 'ビル名/フロア等',
    prop: 'recAddr3',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,32})+$/,
    get message() { return `${this.displayName}は全角32桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    displayName: '銀行名',
    prop: 'bankName',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,12})+$/,
    get message() { return `${this.displayName}は全角12桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    displayName: '支店名',
    prop: 'branchName',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,12})+$/,
    get message() { return `${this.displayName}は全角12桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    displayName: '科目',
    prop: 'accountType',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,10})+$/,
    get message() { return `${this.displayName}は全角10桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    displayName: '口座名義',
    prop: 'accountName',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,32})+$/,
    get message() { return `${this.displayName}は全角32桁で入力してください。` },
    required: true
  },
  {
    target: 'invoice',
    displayLocation: 'footer',
    displayName: '口座番号',
    prop: 'accountNumber',
    regexp: /^([0-9]{7,7})$/,
    get message() { return `${this.displayName}は半角数字7桁で入力してください。` },
    required: true
  },

  {
    target: 'lines',
    displayLocation: 'lines',
    displayName: '項目ID',
    prop: 'lineId',
    regexp: /^([a-zA-Z0-9 -~]{0,16})$/,
    get message() { return `${this.displayName}は半角英数字16桁で入力してください。` },
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    displayName: '内容',
    prop: 'lineDiscription',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,32})+$/,
    get message() { return `${this.displayName}は全角32桁で入力してください。` },
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    displayName: '数量',
    prop: 'quantity',
    regexp: /[0-9]{1,12}/,
    get message() { return `${this.displayName}は半角数字12桁で入力してください。` },
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    displayName: '単位',
    prop: 'unit',
    regexp: /^([ぁ-んァ-ヶー　－‐―−—・，．＆’０-９\u4E00-\u9FFF\u3005-\u3007]{0,10})+$/,
    get message() { return `${this.displayName}は全角10桁で入力してください。` },
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    displayName: '単価',
    prop: 'unitPrice',
    regexp: /[0-9]{1,20}/,
    get message() { return `${this.displayName}は半角数字20桁で入力してください。` },
    required: true
  },
  {
    target: 'lines',
    displayLocation: 'lines',
    displayName: '税',
    prop: 'taxType',
    regexp: '',
    get message() { return '' },
    required: true
  }
]

// eslint-disable-next-line no-unused-vars
function validate(invoice, lines) {
  let result = true

  while (headerErrorDiv.firstChild) headerErrorDiv.removeChild(headerErrorDiv.firstChild)
  while (linesErrorDiv.firstChild) linesErrorDiv.removeChild(linesErrorDiv.firstChild)
  while (footerErrorDiv.firstChild) footerErrorDiv.removeChild(footerErrorDiv.firstChild)

  rules.forEach((rule) => {
    if (rule.target === 'invoice') {
      if (!invoice[rule.prop] && rule.required) {
        setValidationMessage(`${rule.displayName}が入力されていません`, rule.displayLocation)
        result = false
      } else if (!invoice[rule.prop]) return
      else if (rule.regexp && !rule.regexp.test(invoice[rule.prop])) {
        setValidationMessage(rule.message, rule.displayLocation)
        result = false
      }
    } else if (rule.target === 'lines') {
      lines.forEach((line, i) => {
        if (!line[rule.prop] && rule.required) {
          setValidationMessage(`${i + 1}番目の${rule.displayName}が入力されていません`, rule.displayLocation)
          result = false
        }
        else if (!line[rule.prop]) return
        else if (rule.regexp && !rule.regexp.test(line[rule.prop])) {
          // console.log('=====  バリデーション失敗  ====== ')
          setValidationMessage(`${i + 1}番目の` + rule.message, rule.displayLocation)
          result = false
        }
      })
    }
  })

  if (lines.length < 1) {
    setValidationMessage('明細は１件以上必要です。', 'lines')
    result = false
  }

  console.log('=====  バリデーションの結果: ', result)
  return result
}

// eslint-disable-next-line no-unused-vars
function setValidationMessage(message, displayLocation) {
  const messageP = document.createElement('p')
  messageP.className = 'has-text-danger'
  messageP.textContent = message
  if (displayLocation === 'header') return headerErrorDiv.appendChild(messageP)
  else if (displayLocation === 'lines') return linesErrorDiv.appendChild(messageP)
  else if (displayLocation === 'footer') return footerErrorDiv.appendChild(messageP)
}
