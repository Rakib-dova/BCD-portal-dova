const axios = require('axios')
const qs = require('qs')
const logger = require('./logger')

exports.accessTradeshift = async (accessToken, refreshToken, method, query, body = {}) => {
  // アクセスは2回試す
  // 1回目は受け取ったアクセストークンで試行
  // 2回目は1回目でアクセストークンの期限が切れていた場合、リフレッシュして再試行
  let retryCount = 0

  const access = async (_accessToken, _method, _query, _body = {}) => {
    try {
      if (_method === 'get') {
        const res = await axios.get(`https://${process.env.TS_API_HOST}/tradeshift/rest/external${_query}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${_accessToken}`
          }
        })
        return res.data
      } else {
        // TODO: get以外は動くか試していない

        const res = await axios[_method](
          `https://${process.env.TS_API_HOST}/tradeshift/rest/external${_query}`,
          qs.stringify(_body),
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${_accessToken}`
            }
          }
        )
        return res.data
      }
    } catch (error) {
      retryCount++
      if (error.response?.status === '401' && Number(retryCount) === 1) {
        // リフレッシュを試行するフロー
        const appToken = Buffer.from(`${process.env.TS_CLIENT_ID}:${process.env.TS_CLIENT_SECRET}`).toString('base64')

        // console.log('Tradeshift API Access: try token refresh...')
        try {
          const refreshed = await axios.post(
            `https://${process.env.TS_API_HOST}/tradeshift/auth/token`,
            qs.stringify({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              scope: process.env.TS_CLIENT_ID + '.' + process.env.TS_APP_VERSION
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${appToken}`
              }
            }
          )

          return access(refreshed.data.access_token, _method, _query, _body)
        } catch (error) {
          // リフレッシュトークンのresponseが200以外で返ってきた
          // console.log('Tradeshift API Access: refresh failure')
          logger.error({ stack: error.stack }, 'Tradeshift API Access: refresh failure')
          return null
        }
      } else {
        // アクセストークンのresponseが401以外で返ってきた or リフレッシュ後のアクセストークンでもアクセス失敗
        // console.log('Tradeshift API Access: access failure')
        logger.error({ stack: error.stack }, 'Tradeshift API Access: access failure')
        return null
      }
    }
  }

  return await access(accessToken, method, query, body)
}
