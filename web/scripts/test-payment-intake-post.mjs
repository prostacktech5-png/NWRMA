import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const png = path.join(__dirname, '..', 'public', 'image-removebg-preview.png')
const buf = readFileSync(png)

const body = new FormData()
body.append('formSlug', 'water-drilling-licence')
body.append('organizationName', 'Hope Poultry Farm')
body.append('email', 'hopepoultryfarm58@gmail.com')
body.append('phone', '+23279759996')
body.append('contactPersonName', 'Hope Poultry Farm')
body.append(
  'acknowledgements',
  JSON.stringify({ readInstructions: true, feesUnderstood: true })
)
body.append('doc_bankReceipt', new Blob([buf], { type: 'image/png' }), 'receipt.png')

const res = await fetch('http://localhost:3000/api/public/online-forms/payment-intake', {
  method: 'POST',
  body,
})
const text = await res.text()
console.log('status', res.status)
console.log(text)
