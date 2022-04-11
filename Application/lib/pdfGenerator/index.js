const pug = require('pug')
const pdf = require('html-pdf')
const path = require('path')

function generatePDF(contexts, cb) {
  if (!contexts.title || !contexts.body) return new Error('必須入力要素がありません。')

  // console.log('imagePath: ', dbObject.imagePath)

  pug.renderFile(
    path.join(__dirname, 'invoice.pug'),
    {
      ...contexts,
      imagePath: path.join('file://', __dirname, 'sample.jpg')
    },
    (err, data) => {
      if (err) {
        console.log(`err  ${err}`)
      } else {
        const options = {
          format: 'A4',
          localUrlAccess: true,
        }

        pdf.create(data, options).toBuffer(function (err, buffer) { // PDF file save in PDF folder 
          if (err) {
            console.log(`err  :${err}`)
          } else {
            cb(buffer)
          }
        })
      }
    })
}

module.exports = {
  generatePDF
}
