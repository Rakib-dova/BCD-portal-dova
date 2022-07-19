const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
const config = require('../autotest-script-config');
const path = require('path');
const common = require('./common');

const expect = chai.expect;
chai.use(chaiWithReporting);

let browser;

webdriverUtils.setReporter();

describe('リグレッションテスト', function () {

  beforeAll(async function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 3600000;
  });

  beforeEach(async function () {
  });

  afterEach(async function () {
  });

  afterAll(async function () {
    global.reporter.setCloseDriver(async () => {
      await browser.close();
    });
  });

  it("2. 請求書フォーマットアップロード - 行番号あり（NO.31-43,46-51）", async function () {
    // テストの初期化を実施
    const { browserType, accounts, contextOption } = await common.initTest();
    // ブラウザ変数をグローバルに設定
    browser = browserType;
    // 各アカウントごとにテストを実施
    for (const account of accounts) {
      const context = await browser.newContext(contextOption);
      const page = await context.newPage();

      global.reporter.setBrowserInfo(browser, page);
      if (account.type == 'manager') {
        await comment('---------- 管理者アカウント ----------')
      } else if (account.type == 'user') {
        await comment('---------- 一般ユーザー ----------')
      } else {
        await comment('---------- その他アカウント ----------')
      }

      // ページオブジェクト
      const { loginPage, topPage, tradeShiftTopPage, uploadInvoiceMenuPage, uploadFormatTopPage, uploadFormatCreatePage, uploadFormatSettingPage, uploadFormatConfirmPage }
        = common.getPageObject(browser, page);

      // 指定したURLに遷移する
      await page.goto(config.baseUrl);

      // ログインを行う
      await loginPage.doLogin(account.id, account.password);
      await tradeShiftTopPage.waitForLoading();

      // デジタルトレードアプリをクリックする
      let appName = process.env.APP ? process.env.APP : config.appName;
      appName = appName.replace(/\"/g, '');
      await tradeShiftTopPage.clickBcdApp(appName);
      await topPage.waitForLoading();

      // 請求書一括作成メニューを表示する
      await topPage.openUploadInvoiceMenu();
      await uploadInvoiceMenuPage.waitForLoading();

      // 請求書アップロードフォーマット一覧ページに遷移する
      await uploadInvoiceMenuPage.clickUploadFormat();
      await uploadFormatTopPage.waitForLoading();

      // 新規登録ページに遷移する
      await uploadFormatTopPage.clickRegistBtn();
      await uploadFormatCreatePage.waitForLoading();
      expect(await uploadFormatCreatePage.getTitle()).to.equal('基本情報設定', '基本情報設定画面が表示されること');

      //「設定名称」、「データファイル」、「項目名の行番号」、「項目名の行有無」、「データ開始行番号」のラベルに（必須）の赤文字がついていること。
      expect(await uploadFormatCreatePage.isItemNameRequired()).to.equal(true, '「設定名称」に「（必須）」がついていること');
      expect(await uploadFormatCreatePage.isUploadedFileRequired()).to.equal(true, '「データファイル」に「（必須）」がついていること');
      expect(await uploadFormatCreatePage.isItemNameLineOn()).to.equal(true, '「項目名の行有無」に「（必須）」がついていること');
      expect(await uploadFormatCreatePage.isFormatNumberRequired()).to.equal(true, '「項目名の行番号」に「（必須）」がついていること');
      expect(await uploadFormatCreatePage.isDefaultNumberRequired()).to.equal(true, '「データ開始行番号」に「（必須）」がついていること');

      // ヘルプマークにツールチップが設定されていること
      expect(await uploadFormatCreatePage.getFormatNumberToolTip()).to.equal('取込データに項目名の行がある場合、その行番号を入力して下さい。', '「項目名の行番号」にツールチップが設定されていること');
      expect(await uploadFormatCreatePage.getDefaultNumberToolTip()).to.equal('取込データで、データ内容が始まる行番号を入力します。\n\r 例）1行目が項目名の行で2行目からデータ内容が始まる場合、「2」を入力して下さい。', '「データ開始行番号」にツールチップが設定されていること');
      expect(await uploadFormatCreatePage.getTaxToolTip()).to.equal('「明細-税」を識別する文字を入力して下さい。空欄の場合はその項目を利用しない設定になります。', '「明細-税 識別子」にツールチップが設定されていること');
      expect(await uploadFormatCreatePage.getUnitToolTip()).to.equal('「明細-単位」を識別する文字を入力して下さい。空欄の場合はその項目を利用しない設定になります。', '「明細-単位 識別子」にツールチップが設定されていること');

      // ヘッダーありのフォーマットファイルをアップロードする
      formatPath = path.resolve('testdata', 'upload', 'format_header.csv')
      await uploadFormatCreatePage.uploadFormatFile(formatPath);
      await uploadFormatCreatePage.waitForLoading('"format_header.csv"');
      // アップロードしたファイルのファイル名を確認する
      expect(await uploadFormatCreatePage.getUploadedFileName()).to.equal('format_header.csv', 'アップロードしたフォーマットファイルのファイル名が表示されること');

      // 「項目名の行有無」が「なし」の場合、「項目名の行番号」に「（必須）」がついていないこと
      await uploadFormatCreatePage.setItemNameLine(false);
      expect(await uploadFormatCreatePage.isFormatNumberDisplayed()).to.equal(false, '「項目名の行有無」が「なし」の場合、「項目名の行番号」に「（必須）」がついていないこと');
      // 「項目名の行有無」が「あり」の場合、「項目名の行番号」に「（必須）」がついていること
      await uploadFormatCreatePage.setItemNameLine(true);
      expect(await uploadFormatCreatePage.isFormatNumberDisplayed()).to.equal(true, '「項目名の行有無」が「あり」の場合、「項目名の行番号」に「（必須）」がついていること');

      // 現在の日付を取得する
      const now = new Date();
      const itemName = common.getFormattedDate(now);

      // 各項目に値を設定する
      await uploadFormatCreatePage.setItemName(itemName);
      await uploadFormatCreatePage.setFormatNumber('2');
      await uploadFormatCreatePage.setDefaultNumber('3');
      const taxs = {
        keyConsumptionTax: '消費税2',
        keyReducedTax: '軽減税率2',
        keyFreeTax: '不課税2',
        keyDutyFree: '免税2',
        keyExemptTax: '非課税2'
      }
      await uploadFormatCreatePage.setTaxs(taxs);
      const units = {
        keyManMonth: '人月2',
        keyBottle: 'ボトル2',
        keyCost: 'コスト2',
        keyContainer: 'コンテナ2',
        keyCentilitre: 'センチリットル2',
        keySquareCentimeter: '平方センチメートル2',
        keyCubicCentimeter: '立方センチメートル2',
        keyCentimeter: 'センチメートル2',
        keyCase: 'ケース2',
        keyCarton: 'カートン2',
        keyDay: '日2',
        keyDeciliter: 'デシリットル2',
        keyDecimeter: 'デシメートル2',
        keyGrossKilogram: 'グロス・キログラム2',
        keyPieces: '個2',
        keyFeet: 'フィート2',
        keyGallon: 'ガロン2',
        keyGram: 'グラム2',
        keyGrossTonnage: '総トン2',
        keyHour: '時間2',
        keyKilogram: 'キログラム2',
        keyKilometers: 'キロメートル2',
        keyKilowattHour: 'キロワット時2',
        keyPound: 'ポンド2',
        keyLiter: 'リットル2',
        keyMilligram: 'ミリグラム2',
        keyMilliliter: 'ミリリットル2',
        keyMillimeter: 'ミリメートル2',
        keyMonth: '月2',
        keySquareMeter: '平方メートル2',
        keyCubicMeter: '立方メートル2',
        keyMeter: 'メーター2',
        keyNetTonnage: '純トン2',
        keyPackage: '包2',
        keyRoll: '巻2',
        keyFormula: '式2',
        keyTonnage: 'トン2',
        keyOthers: 'その他2',
      }
      await uploadFormatCreatePage.setUnits(units);

      // 次へをクリックする
      await uploadFormatCreatePage.goNext();
      await uploadFormatSettingPage.waitForLoading('//*[text()="請求書アップロードフォーマット設定"]')
      expect(await uploadFormatSettingPage.getTitle()).to.equal(true, '請求書アップロードフォーマット設定ページに遷移すること');

      // 項目名を取得
      headers = await uploadFormatSettingPage.getHeaders();
      headerTexts = JSON.stringify(headers);
      expectedVal = '["列1","列2","列3","列4","列5","列6","列7","列8","列9","列10","列11","列12","列13","列14","列15","列16","列17","列18","列19","列20","列21","列22","列23","列24","列25","列26"]'
      expect(headerTexts).to.equal(expectedVal, '取り込んだCSVのヘッダーが正しいこと');

      // データ内容を取得
      datas = await uploadFormatSettingPage.getDatas();
      dataTexts = JSON.stringify(datas);
      expectedVal = '["","2022/10/8","A0000125","fcde4039-8d4d-4e3e-8b5c-43fca9d6e113","2022/11/8","2022/9/8","備考あああ","銀行名あああ","支店名あああ","当座","1423123","口座名義あああ","その他特記事項あああ","1","明細１","2","個","10000","消費税","備考あああ","","","","","",""]'
      expect(dataTexts).to.equal(expectedVal, '取り込んだCSVのデータが正しいこと');

      // データ番号の選択肢を取得
      options = await uploadFormatSettingPage.getOptions();
      optionTexts = JSON.stringify(options);
      expectedVal = '["選択してください","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26"]'
      expect(optionTexts).to.equal(expectedVal, 'データ番号の選択肢が正しいこと');

      // 戻るボタンをクリック
      await uploadFormatSettingPage.goBack();
      await uploadFormatCreatePage.waitForLoading();
      expect(await uploadFormatCreatePage.getTitle()).to.equal('基本情報設定', '基本情報設定画面が表示されること');

      // 基本情報設定が保持されていること
      expect(await uploadFormatCreatePage.getItemName()).to.equal(itemName, '「設定名称」が保持されていること');
      expect(await uploadFormatCreatePage.getUploadedType()).to.equal('請求書データ', '「アップロード種別」が保持されていること');

      // expect(await uploadFormatCreatePage.getUploadedFileName()).to.equal('format_header.csv', '「データファイル」が保持されていること');
      await uploadFormatCreatePage.uploadFormatFile(formatPath);
      await uploadFormatCreatePage.waitForLoading('"format_header.csv"');

      expect(await uploadFormatCreatePage.isItemNameLineOn()).to.equal(true, '「項目名の行有無」が保持されていること');
      expect(await uploadFormatCreatePage.getFormatNumber()).to.equal('2', '「項目名の行番号」が保持されていること');
      expect(await uploadFormatCreatePage.getDefaultNumber()).to.equal('3', '「データ開始行番号」が保持されていること');

      // 明細-税 識別子
      taxValues = await uploadFormatCreatePage.getTaxs();
      taxValueTexts = JSON.stringify(taxValues);
      expectedVal = '["消費税2","軽減税率2","不課税2","免税2","非課税2"]'
      expect(taxValueTexts).to.equal(expectedVal, '「明細-税 識別子」の値が保持されていること');

      // 明細-単位 識別子
      unitValues = await uploadFormatCreatePage.getUnits();
      unitValueTexts = JSON.stringify(unitValues);
      expectedVal = '["人月2","ボトル2","コスト2","コンテナ2","センチリットル2","平方センチメートル2","立方センチメートル2","センチメートル2","ケース2","カートン2","日2","デシリットル2","デシメートル2","グロス・キログラム2","個2","フィート2","ガロン2","グラム2","総トン2","時間2","キログラム2","キロメートル2","キロワット時2","ポンド2","リットル2","ミリグラム2","ミリリットル2","ミリメートル2","月2","平方メートル2","立方メートル2","メーター2","純トン2","包2","巻2","式2","トン2","その他2"]'
      expect(unitValueTexts).to.equal(expectedVal, '「明細-単位 識別子」の値が保持されていること');

      // 次へをクリックする
      await uploadFormatCreatePage.goNext();
      await uploadFormatSettingPage.waitForLoading('//*[text()="請求書アップロードフォーマット設定"]')
      expect(await uploadFormatSettingPage.getTitle()).to.equal(true, '請求書アップロードフォーマット設定ページに遷移すること');

      const numbers = {
        issueDate: '2',
        invoiceNumber: '3',
        tenantId: '4',
        paymentDate: '5',
        deliveryDate: '6',
        documentDescription: '7',
        bankName: '8',
        financialName: '9',
        accountType: '10',
        accountId: '11',
        accountName: '12',
        note: '13',
        sellersItemNum: '14',
        itemName: '15',
        quantityValue: '16',
        quantityUnitCode: '17',
        priceValue: '18',
        taxRate: '19',
        description: '20'
      }
      await uploadFormatSettingPage.setNumbers(numbers);

      // 確認ページに遷移する
      await uploadFormatSettingPage.goConfirmPage();
      await uploadFormatConfirmPage.waitForLoading();
      expect(await uploadFormatConfirmPage.getTitle()).to.equal('請求書アップロードフォーマット設定 確認', '請求書アップロードフォーマット設定ページに遷移すること');

      // 基本情報設定が保持されていること
      expect(await uploadFormatConfirmPage.getItemName()).to.equal(itemName, '「設定名称」が保持されていること');
      expect(await uploadFormatConfirmPage.getUploadedType()).to.equal('請求書データ', '「アップロード種別」が保持されていること');

      // 明細-税 識別子
      taxValues = await uploadFormatConfirmPage.getTaxValues();
      taxValueTexts = JSON.stringify(taxValues);
      expectedVal = '["消費税2","軽減税率2","不課税2","免税2","非課税2"]'
      expect(taxValueTexts).to.equal(expectedVal, '「明細-税 識別子」の値が保持されていること');

      // 明細-単位 識別子
      unitValues = await uploadFormatConfirmPage.getUnitValues();
      unitValueTexts = JSON.stringify(unitValues);
      expectedVal = '["人月2","ボトル2","コスト2","コンテナ2","センチリットル2","平方センチメートル2","立方センチメートル2","センチメートル2","ケース2","カートン2","日2","デシリットル2","デシメートル2","グロス・キログラム2","個2","フィート2","ガロン2","グラム2","総トン2","時間2","キログラム2","キロメートル2","キロワット時2","ポンド2","リットル2","ミリグラム2","ミリリットル2","ミリメートル2","月2","平方メートル2","立方メートル2","メーター2","純トン2","包2","巻2","式2","トン2","その他2"]'
      expect(unitValueTexts).to.equal(expectedVal, '「明細-単位 識別子」の値が保持されていること');

      // ユーザフォーマット項目名
      headers = await uploadFormatConfirmPage.getHeaders();
      headerTexts = JSON.stringify(headers);
      expectedVal = '["列2","列3","列4","列5","列6","列7","列8","列9","列10","列11","列12","列13","列14","列15","列16","列17","列18","列19","列20"]'
      expect(headerTexts).to.equal(expectedVal, '「ユーザフォーマット項目名」の値が保持されていること');

      // データ内容
      datas = await uploadFormatConfirmPage.getDatas();
      dataTexts = JSON.stringify(datas);
      expectedVal = '["2022/10/8","A0000125","fcde4039-8d4d-4e3e-8b5c-43fca9d6e113","2022/11/8","2022/9/8","備考あああ","銀行名あああ","支店名あああ","当座","1423123","口座名義あああ","その他特記事項あああ","1","明細１","2","個","10000","消費税","備考あああ"]'
      expect(dataTexts).to.equal(expectedVal, '「データ内容」の値が保持されていること');

      // キャンセルする
      await uploadFormatConfirmPage.cancel();
      await uploadFormatSettingPage.waitForLoading();

      // 対応するデータ番号を取得
      selectNumbers = await uploadFormatSettingPage.getNumbers(); // 表示文字列ではなくValueであることに注意
      selectNumberTexts = JSON.stringify(selectNumbers);
      expectedVal = '["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19"]'
      expect(selectNumberTexts).to.equal(expectedVal, '選択したデータ番号が残っていること');

      // 確認ページに遷移する
      await uploadFormatSettingPage.goConfirmPage();
      await uploadFormatConfirmPage.waitForLoading();

      // 登録する
      await uploadFormatConfirmPage.regist();

      // ポップアップを確認する
      expect(await uploadFormatTopPage.getPopupMsg()).to.equal('フォーマットの登録が完了しました。', '登録完了のポップアップが表示されること');
      expect(await uploadFormatTopPage.getFormatName(1)).to.equal(itemName, '登録したフォーマットデータが一番上に表示されていること。');

      await page.waitForTimeout(1000);
    }
  });
});
