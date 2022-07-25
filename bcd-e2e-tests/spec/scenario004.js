const webdriverUtils = require('../utils/webdriver-utils');
const chai = require('chai');
const chaiWithReporting = require('../utils/chai-with-reporting').chaiWithReporting;
const comment = require('../utils/chai-with-reporting').comment;
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

  it("4. 請求書フォーマットアップロード - 更新（NO.52-63）", async function () {
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
      const { topPage, uploadInvoiceMenuPage, uploadFormatTopPage, uploadFormatSettingPage, uploadFormatConfirmPage, uploadFormatModPage }
        = common.getPageObject(browser, page);

      // デジタルトレードアプリのトップページを表示する
      await common.gotoTop(page, account);

      // 請求書フォーマットをアップロードする
      let formatPath = path.resolve('testdata', 'upload', 'format_header.csv')
      let itemName = await common.uploadFormat(formatPath, true, 2, 3, 2)

      // 請求書一括作成メニューを表示する
      await topPage.openUploadInvoiceMenu();
      await uploadInvoiceMenuPage.waitForLoading();

      // 請求書アップロードフォーマット一覧ページに遷移する
      await uploadInvoiceMenuPage.clickUploadFormat();
      await uploadFormatTopPage.waitForLoading();

      // 「確認・変更する」ボタンをクリックする
      await uploadFormatTopPage.clickComfirmBtn(itemName);
      await uploadFormatSettingPage.waitForLoading();
      expect(await uploadFormatSettingPage.getTitle()).to.equal(true, '請求書アップロードフォーマット設定ページに遷移すること');

      // 対応するデータ番号を取得
      selectNumbers = await uploadFormatSettingPage.getNumbers();// 表示文字列ではなくValueであることに注意
      selectNumberTexts = JSON.stringify(selectNumbers);
      expectedVal = '["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"]'
      expect(selectNumberTexts).to.equal(expectedVal, '登録したデータ番号が残っていること');

      // 戻るボタンをクリック
      await uploadFormatSettingPage.goBack();
      await uploadFormatTopPage.waitForLoading();
      expect(await uploadFormatTopPage.getTitle()).to.equal('アップロードフォーマット一覧', 'アップロードフォーマット一覧ページに遷移すること');

      // 「確認・変更する」ボタンをクリックする
      await uploadFormatTopPage.clickComfirmBtn(itemName);
      await uploadFormatSettingPage.waitForLoading();

      // 「基本情報を確認・変更する」ボタンをクリックする
      await uploadFormatSettingPage.goBasicPage(itemName);
      await uploadFormatModPage.waitForLoading();
      expect(await uploadFormatModPage.getTitle()).to.equal('基本情報設定 確認', '基本情報設定確認画面が表示されること');

      // 基本情報設定が保持されていること
      expect(await uploadFormatModPage.getItemName()).to.equal(itemName, '「設定名称」が保持されていること');
      expect(await uploadFormatModPage.getUploadedType()).to.equal('請求書データ', '「アップロード種別」が保持されていること');
      expect(await uploadFormatModPage.getUploadedFileName()).to.equal('format_header.csv', '「データファイル」が保持されていること');
      expect(await uploadFormatModPage.isItemNameLineOn()).to.equal(true, '「項目名の行有無」が保持されていること');
      expect(await uploadFormatModPage.getFormatNumber()).to.equal('2', '「項目名の行番号」が保持されていること');
      expect(await uploadFormatModPage.getDefaultNumber()).to.equal('3', '「データ開始行番号」が保持されていること');

      // 明細-税 識別子
      taxValues = await uploadFormatModPage.getTaxs();
      taxValueTexts = JSON.stringify(taxValues);
      expectedVal = '["消費税2","軽減税率2","不課税2","免税2","非課税2"]'
      expect(taxValueTexts).to.equal(expectedVal, '「明細-税 識別子」の値が保持されていること');

      // 明細-単位 識別子
      unitValues = await uploadFormatModPage.getUnits();
      unitValueTexts = JSON.stringify(unitValues);
      expectedVal = '["人月2","ボトル2","コスト2","コンテナ2","センチリットル2","平方センチメートル2","立方センチメートル2","センチメートル2","ケース2","カートン2","日2","デシリットル2","デシメートル2","グロス・キログラム2","個2","フィート2","ガロン2","グラム2","総トン2","時間2","キログラム2","キロメートル2","キロワット時2","ポンド2","リットル2","ミリグラム2","ミリリットル2","ミリメートル2","月2","平方メートル2","立方メートル2","メーター2","純トン2","包2","巻2","式2","トン2","その他2"]'
      expect(unitValueTexts).to.equal(expectedVal, '「明細-単位 識別子」の値が保持されていること');

      // ヘルプマークにツールチップが設定されていること
      expect(await uploadFormatModPage.getFormatNumberToolTip()).to.equal('取込データに項目名の行がある場合、その行番号を入力して下さい。', '「項目名の行番号」にツールチップが設定されていること');
      expect(await uploadFormatModPage.getDefaultNumberToolTip()).to.equal('取込データで、データ内容が始まる行番号を入力します。\n\r 例）1行目が項目名の行で2行目からデータ内容が始まる場合、「2」を入力して下さい。', '「データ開始行番号」にツールチップが設定されていること');
      expect(await uploadFormatModPage.getTaxToolTip()).to.equal('「明細-税」を識別する文字を入力して下さい。空欄の場合はその項目を利用しない設定になります。', '「明細-税 識別子」にツールチップが設定されていること');
      expect(await uploadFormatModPage.getUnitToolTip()).to.equal('「明細-単位」を識別する文字を入力して下さい。空欄の場合はその項目を利用しない設定になります。', '「明細-単位 識別子」にツールチップが設定されていること');

      // キャンセルをクリックする    
      await uploadFormatModPage.cancel();
      await uploadFormatSettingPage.waitForLoading('//*[text()="請求書アップロードフォーマット設定"]')
      expect(await uploadFormatSettingPage.getTitle()).to.equal(true, '請求書アップロードフォーマット設定ページに遷移すること');

      // 「基本情報を確認・変更する」ボタンをクリックする
      await uploadFormatSettingPage.goBasicPage(itemName);
      await uploadFormatModPage.waitForLoading();

      // 各項目に値を設定する
      itemName = itemName + 'MOD';
      await uploadFormatModPage.setItemName(itemName);
      const taxsMod = {
        keyConsumptionTax: '消費税2MOD',
        keyReducedTax: '軽減税率2MOD',
        keyFreeTax: '不課税2MOD',
        keyDutyFree: '免税2MOD',
        keyExemptTax: '非課税2MOD'
      }
      await uploadFormatModPage.setTaxs(taxsMod);
      const unitsMod = {
        keyManMonth: '人月2MOD',
        keyBottle: 'ボトル2MOD',
        keyCost: 'コスト2MOD',
        keyContainer: 'コンテナ2MOD',
        keyCentilitre: 'センチリットル2MOD',
        keySquareCentimeter: '平方センチメートル2MOD',
        keyCubicCentimeter: '立方センチメートル2MOD',
        keyCentimeter: 'センチメートル2MOD',
        keyCase: 'ケース2MOD',
        keyCarton: 'カートン2MOD',
        keyDay: '日2MOD',
        keyDeciliter: 'デシリットル2MOD',
        keyDecimeter: 'デシメートル2MOD',
        keyGrossKilogram: 'グロス・キログラム2MOD',
        keyPieces: '個2MOD',
        keyFeet: 'フィート2MOD',
        keyGallon: 'ガロン2MOD',
        keyGram: 'グラム2MOD',
        keyGrossTonnage: '総トン2MOD',
        keyHour: '時間2MOD',
        keyKilogram: 'キログラム2MOD',
        keyKilometers: 'キロメートル2MOD',
        keyKilowattHour: 'キロワット時2MOD',
        keyPound: 'ポンド2MOD',
        keyLiter: 'リットル2MOD',
        keyMilligram: 'ミリグラム2MOD',
        keyMilliliter: 'ミリリットル2MOD',
        keyMillimeter: 'ミリメートル2MOD',
        keyMonth: '月2MOD',
        keySquareMeter: '平方メートル2MOD',
        keyCubicMeter: '立方メートル2MOD',
        keyMeter: 'メーター2MOD',
        keyNetTonnage: '純トン2MOD',
        keyPackage: '包2MOD',
        keyRoll: '巻2MOD',
        keyFormula: '式2MOD',
        keyTonnage: 'トン2MOD',
        keyOthers: 'その他2MOD',
      }
      await uploadFormatModPage.setUnits(unitsMod);

      // 「変更」ボタンをクリックする
      await uploadFormatModPage.change();
      await uploadFormatSettingPage.waitForLoading();

      const numbersMod = {
        issueDate: '1',
        invoiceNumber: '2',
        tenantId: '3',
        paymentDate: '4',
        deliveryDate: '5',
        documentDescription: '6',
        mailAddress: '7',
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
      await uploadFormatSettingPage.setNumbers(numbersMod);

      // 確認ページに遷移する
      await uploadFormatSettingPage.goConfirmPage();
      await uploadFormatConfirmPage.waitForLoading();
      expect(await uploadFormatConfirmPage.getTitle()).to.equal('請求書アップロードフォーマット設定 確認', '請求書アップロードフォーマット設定ページに遷移すること');

      // 基本情報設定が保持されていること
      expect(await uploadFormatConfirmPage.getItemName()).to.equal(itemName, '「設定名称」が保持されていること');
      expect(await uploadFormatConfirmPage.getUploadedType()).to.equal('請求書データ', '「アップロード種別」が保持されていること');

      // 明細-税 識別子
      taxValues = await uploadFormatConfirmPage.getTaxValuesMod();
      taxValueTexts = JSON.stringify(taxValues);
      expectedVal = '["消費税2MOD","軽減税率2MOD","不課税2MOD","免税2MOD","非課税2MOD"]'
      expect(taxValueTexts).to.equal(expectedVal, '「明細-税 識別子」の値が保持されていること');

      // 明細-単位 識別子
      unitValues = await uploadFormatConfirmPage.getUnitValuesMod();
      unitValueTexts = JSON.stringify(unitValues);
      expectedVal = '["人月2MOD","ボトル2MOD","コスト2MOD","コンテナ2MOD","センチリットル2MOD","平方センチメートル2MOD","立方センチメートル2MOD","センチメートル2MOD","ケース2MOD","カートン2MOD","日2MOD","デシリットル2MOD","デシメートル2MOD","グロス・キログラム2MOD","個2MOD","フィート2MOD","ガロン2MOD","グラム2MOD","総トン2MOD","時間2MOD","キログラム2MOD","キロメートル2MOD","キロワット時2MOD","ポンド2MOD","リットル2MOD","ミリグラム2MOD","ミリリットル2MOD","ミリメートル2MOD","月2MOD","平方メートル2MOD","立方メートル2MOD","メーター2MOD","純トン2MOD","包2MOD","巻2MOD","式2MOD","トン2MOD","その他2MOD"]'
      expect(unitValueTexts).to.equal(expectedVal, '「明細-単位 識別子」の値が保持されていること');

      // ユーザフォーマット項目名
      headers = await uploadFormatConfirmPage.getHeaders();
      headerTexts = JSON.stringify(headers);
      expectedVal = '["列1","列2","列3","列4","列5","列6","列7","列8","列9","列10","列11","列12","列13","列14","列15","列16","列17","列18","列19",""]'
      expect(headerTexts).to.equal(expectedVal, '「ユーザフォーマット項目名」の値が保持されていること');

      // データ内容
      datas = await uploadFormatConfirmPage.getDatas();
      dataTexts = JSON.stringify(datas);
      expectedVal = '["","2022/10/8","A0000125","fcde4039-8d4d-4e3e-8b5c-43fca9d6e113","2022/11/8","2022/9/8","備考あああ","aaa@example.com","銀行名あああ","支店名あああ","当座","1423123","口座名義あああ","その他特記事項あああ","1","明細１","2","個","10000",""]'
      expect(dataTexts).to.equal(expectedVal, '「データ内容」の値が保持されていること');

      // キャンセルする
      await uploadFormatConfirmPage.cancel();
      await uploadFormatSettingPage.waitForLoading();

      // 対応するデータ番号を取得
      selectNumbers = await uploadFormatSettingPage.getNumbers(); // 表示文字列ではなくValueであることに注意
      selectNumberTexts = JSON.stringify(selectNumbers);
      expectedVal = '["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19"]'
      expect(selectNumberTexts).to.equal(expectedVal, '選択したデータ番号が残っていること');

      // 確認ページに遷移する
      await uploadFormatSettingPage.goConfirmPage();
      await uploadFormatConfirmPage.waitForLoading();

      // 登録する
      await uploadFormatConfirmPage.regist();

      // ポップアップを確認する
      expect(await uploadFormatTopPage.getPopupMsg()).to.equal('フォーマットの変更が完了しました。', '変更完了のポップアップが表示されること');

      // 「削除」ボタンをクリックする
      await uploadFormatTopPage.clickDeleteBtn(itemName);
      expect(await uploadFormatTopPage.getDeleteDialogMsg()).to.equal('削除しますか？', '削除確認ダイアログが表示されること');
      expect(await uploadFormatTopPage.isDialogCancelBtnDisplayed()).to.equal(true, '削除確認ダイアログの「キャンセル」ボタンが存在すること');
      expect(await uploadFormatTopPage.isDialogDeleteBtnDisplayed()).to.equal(true, '削除確認ダイアログの「削除」ボタンが存在すること');

      // 削除ダイアログの「キャンセル」ボタンをクリックする
      await uploadFormatTopPage.clickDialogCancelBtn();
      expect(await uploadFormatTopPage.isDialogDeleteBtnDisplayed()).to.equal(true, '削除確認ダイアログが閉じられること');

      // 「削除」ボタンをクリックする
      await uploadFormatTopPage.clickDeleteBtn(itemName);
      // 削除ダイアログの「削除」ボタンをクリックする
      await uploadFormatTopPage.clickDialogDeleteBtn();

      // ポップアップを確認する
      expect(await uploadFormatTopPage.getPopupMsg()).to.equal('フォーマットを削除しました。', '削除完了のポップアップが表示されること');
      // 削除されたか確認する
      expect(await uploadFormatTopPage.isFormatDataExist(itemName)).to.equal(false, 'フォーマットが削除されていること。');

      await page.waitForTimeout(1000);
    }
  });
});
