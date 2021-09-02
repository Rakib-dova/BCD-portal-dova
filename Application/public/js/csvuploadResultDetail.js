const $ = (_selector) => {
  const selectorDelimeter = _selector.substr(0, 1)
  const selector = _selector.substr(1, _selector.length)

  switch (selectorDelimeter) {
    case '#':
      return document.getElementById(selector)
    case '.':
      return document.getElementsByClassName(selector)
  }
}

Array.prototype.forEach.call($('.btnDetail'), function (ele) {
  ele.onclick = function () {
    const clickBtn = this
    const tr = clickBtn.parentNode.parentNode
    const td = tr.children

    document.getElementById('invoicesAll').innerHTML = td[4].innerHTML + '件'
    document.getElementById('invoicesCount').innerHTML = td[5].innerHTML + '件'
    document.getElementById('invoicesSuccess').innerHTML = td[6].innerHTML + '件'
    document.getElementById('invoicesSkip').innerHTML = td[7].innerHTML + '件'
    document.getElementById('invoicesFail').innerHTML = td[8].innerHTML + '件'
  }
})
