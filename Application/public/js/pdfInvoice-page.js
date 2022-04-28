// document.getElementById、document.getElementsByClassName省略
const $ = function (tagObjName) {
  const classNamePattern = '\\.+[a-zA-Z0-9]'
  const idNamePatten = '\\#+[a-zA-Z0-9]'
  const classNameReg = new RegExp(classNamePattern)
  const idNameReg = new RegExp(idNamePatten)
  let selectors
  if (classNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)
  } else if (idNameReg.test(tagObjName)) {
    selectors = document.querySelectorAll(tagObjName)[0]
    if (selectors === undefined) return null
  } else {
    return null
  }
  return Object.assign(selectors, Array.prototype, (type, event) => {
    document.addEventListener(type, event)
  })
}

// プラスボタン押下後明細行を追加
$('#btn-plus-invoice-detail').addEventListener('click', () => {
  const table = $('#table-invoice-details')
  const index = table.rows.length
  if (index > 20) return

  const row = table.insertRow(-1)

  const cellElem = document.createElement('th')
  cellElem.className = 'text-center'
  cellElem.innerHTML = index
  row.appendChild(cellElem)

  let addRow = row.insertCell(-1)
  addRow.innerHTML = '<input class="width-320px" name="content" type="text">'
  addRow.className = 'text-center'

  addRow = row.insertCell(-1)
  addRow.innerHTML = '<input name="quantity" type="text">'
  addRow.className = 'text-center'

  addRow = row.insertCell(-1)
  addRow.innerHTML = '<input class="width-80px" name="unit" type="text">'
  addRow.className = 'text-center'

  addRow = row.insertCell(-1)
  addRow.innerHTML = '<input name="unitPrice" type="text">'
  addRow.className = 'text-center'

  addRow = row.insertCell(-1)
  addRow.innerHTML = '<select name="taxType"><option value="freeTax">不課税</option><option value="dutyFree">免税</option><option value="tax10p" selected>消費税 10%</option><option value="tax8p">消費税(軽減税率) 8%</option><option value="otherTax">その他消費税</option></select>'
  addRow.className = 'text-center'

  addRow = row.insertCell(-1)
  addRow.innerHTML = '<td class="text-right">1,111,111,111</td>'
  addRow.className = 'text-right'

  addRow = row.insertCell(-1)
  addRow.innerHTML = '<a class="red-color btn-plus-invoice-detail"><i class="fas fa-minus-circle"></i></a>'
  addRow.className = 'text-center'
})
