document.addEventListener('DOMContentLoaded', async () => {
  const requestXHR = new XMLHttpRequest()
  requestXHR.open('POST', '/fingerprintVerify/', true)
  requestXHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
  requestXHR.setRequestHeader('csrf-token', document.getElementsByName('_csrf')[0].value)

  const visitorId = await getFingerprintJS()
  if (visitorId instanceof Error) {
    console.log(visitorId)
  } else {
    requestXHR.send('fingerprint=' + visitorId)
  }
})

async function getFingerprintJS() {
  try {
    const FingerprintJS = await import('./fingerprintjs-esm.min.js')
    const fp = await FingerprintJS.load()
    const result = await fp.get()
    // console.log(result)
    // Exclude a couple components
    const { cookiesEnabled, ...components } = result.components

    // Make a visitor identifier from your custom list of components
    const visitorId = FingerprintJS.hashComponents(components)
    console.log('visitorId:', visitorId)
    return visitorId
  } catch (error) {
    console.log(error)
  }
}
