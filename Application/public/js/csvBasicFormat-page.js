document.getElementById('checkItemNameLineOn').onclick = function () {
  document.getElementById('itemNameLineNumber').readOnly = false
}

document.getElementById('checkItemNameLineOff').onclick = function () {
  document.getElementById('itemNameLineNumber').readOnly = true
}

document.getElementById('dataFile').addEventListener('change', function (e) {
  document.getElementById('dataFileName').value = this.files.item(0).name
})
