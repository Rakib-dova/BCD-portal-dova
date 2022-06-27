'use strict'

module.exports = async (req, res, next) => {
  const oshirase = `<?xml version="1.0" encoding="UTF-8"?>
	<?xml-stylesheet href="xsl/twrss_css.xsl" type="text/xsl" media="screen"?>
	<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
	  <channel rdf:about="http://support.ntt.com/bconnection/information/search/">
	    <title>BConnectionデジタルトレードのお知らせ - NTT Com</title>
	    <link>http://support.ntt.com/bconnection/information/search/</link>
	    <description>NTTコミュニケーションズの最新商品情報をお知らせします。</description>
	    <items>
	      <rdf:Seq>
		<rdf:li rdf:resource="http://support.ntt.com/bconnection/information/detail/pid2500001k9r" />
		<rdf:li rdf:resource="http://support.ntt.com/bconnection/information/detail/pid2500001k9q" />
		<rdf:li rdf:resource="http://support.ntt.com/bconnection/information/detail/pid2500001j9e" />
		<rdf:li rdf:resource="http://support.ntt.com/bconnection/information/detail/pid2500001i8l" />
		<rdf:li rdf:resource="http://support.ntt.com/bconnection/information/detail/pid2500001hbt" />
		<rdf:li rdf:resource="http://support.ntt.com/bconnection/information/detail/pid2500001g3c" />
	      </rdf:Seq>
	    </items>
	  </channel>
	  <item rdf:about="http://support.ntt.com/bconnection/information/detail/pid2500001k9r">
	    <title>BConnectionデジタルトレードアプリケーション　提携サービスにファクタリングサービスを追加</title>
	    <link>http://support.ntt.com/bconnection/information/detail/pid2500001k9r</link>
	    <dc:date>2022-04-19T09:00:00Z</dc:date>
	  </item>
	  <item rdf:about="http://support.ntt.com/bconnection/information/detail/pid2500001k9q">
	    <title>BConnectionデジタルトレードアプリケーション　支払依頼機能追加のお知らせ</title>
	    <link>http://support.ntt.com/bconnection/information/detail/pid2500001k9q</link>
	    <dc:date>2022-04-19T09:00:00Z</dc:date>
	  </item>
	  <item rdf:about="http://support.ntt.com/bconnection/information/detail/pid2500001j9e">
	    <title>BConnectionデジタルトレードアプリケーション機能追加のお知らせ</title>
	    <link>http://support.ntt.com/bconnection/information/detail/pid2500001j9e</link>
	    <dc:date>2022-03-08T09:00:00Z</dc:date>
	  </item>
	  <item rdf:about="http://support.ntt.com/bconnection/information/detail/pid2500001i8l">
	    <title>BConnectionデジタルトレードアプリケーション機能追加のお知らせ</title>
	    <link>http://support.ntt.com/bconnection/information/detail/pid2500001i8l</link>
	    <dc:date>2022-01-24T10:30:00Z</dc:date>
	  </item>
	  <item rdf:about="http://support.ntt.com/bconnection/information/detail/pid2500001hbt">
	    <title>BConnectionデジタルトレード サポートセンタの年末年始の受付時間について</title>
	    <link>http://support.ntt.com/bconnection/information/detail/pid2500001hbt</link>
	    <dc:date>2021-12-09T05:00:00Z</dc:date>
	  </item>
	  <item rdf:about="http://support.ntt.com/bconnection/information/detail/pid2500001g3c">
	    <title>BConnectionデジタルトレードアプリケーション提供開始</title>
	    <link>http://support.ntt.com/bconnection/information/detail/pid2500001g3c</link>
	    <dc:date>2021-10-15T06:00:00Z</dc:date>
	  </item>
	</rdf:RDF>`
  return res.send(oshirase)
}
