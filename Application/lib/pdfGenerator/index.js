const pug = require('pug')
// const pdf = require('html-pdf')
const html_to_pdf = require('html-pdf-node')
const path = require('path')
const fs = require('fs')
const express = require('express')
const app = express()
const port = 3001

function generatePDF(contexts, cb) {
  if (!contexts.title || !contexts.body) return new Error('必須入力要素がありません。')

  // console.log('imagePath: ', dbObject.imagePath)
  // const template = fs.readFileSync(path.resolve(__dirname, "./index.html"), 'utf8')
  // const html = pug.render(template, { title: "テストPDFタイトル" })

  console.log('レンダリングします: ')
  pug.renderFile(
    path.join(__dirname, 'invoice.pug'),
    {
      ...contexts,
      imagePath: path.join('file://', __dirname, 'sample.jpg')
    },
    (err, html) => {
      console.log('レンダリング完了: ', html)
      if (err) {
        console.log(`err  ${err}`)
      } else {

        fs.writeFile(path.resolve(__dirname, "./public/index.html"), html, () => {
          app.use(express.static('src/public'))
      
          const server = app.listen(port, async () => {
            const url = `http://localhost:${port}`
            const options = { format: 'A4'}
            const file = { url }
            await html_to_pdf.generatePdf(file, options, (err, buffer) => {
              console.log('PDF生成完了: ')
              if (err) {
                console.log(`err  :${err}`)
              } else {
                cb(buffer)
              }
            })
      
            server.close()
          })
        })

        // const options = {
        //   format: 'A4',
        //   localUrlAccess: true,
        // }

        // html_to_pdf.generatePdf(html, options, (err, buffer) => {
        //   if (err) {
        //     console.log(`err  :${err}`)
        //   } else {
        //     cb(buffer)
        //   }
        // })

        // pdf.create(data, options).toBuffer(function (err, buffer) { // PDF file save in PDF folder 
        //   if (err) {
        //     console.log(`err  :${err}`)
        //   } else {
        //     cb(buffer)
        //   }
        // })
      }
    })
}

module.exports = {
  generatePDF
}
