# 推奨開発環境

動作確認環境

- OS: Windows10
- IDE: Visual Studio Code
- Terminal: Powershell

以下、グローバルにインストールされていること

- Node.js v14

# ローカル環境での起動手順

## パッケージインストール

```
$ npm install
```

## テストの実行方法

- ./**test**配下の全テストコードの実行（カバレッジ算出なし）

```
$ npm test
```

- 特定のテストコードのみ実行\
  （下記例は routes.index.spec.js のテスト実行）

```
$ npm test -- routes.index.spec.js
```

- カバレッジを算出しながら./**test**配下の全テストコードの実行

```
$ npm run test:coverage
```

- カバレッジを算出しながら特定のテストコードの実行

```
$ npm run test:coverage -- routes.index.spec.js
```

## 設定

- jest.config.js\
  Jest の設定ファイル。カバレッジ計測対象のテストコードなど指定。（collectCoverageFrom）

- config/.env\
  読み込む環境変数を指定。Application で設定しているものと同一。

## コーディング規約

- Javascript Standard Style 準拠
- ESLint 使用（設定値は.eslintrc.json）
- フォーマッターは prettier 使用（設定値は.prettierrc.js）
- モジュールのインポートは Common.js（require）
- 文末セミコロンなし
- 変数名・関数名の命名はローワーキャメルケース（先頭小文字）

VSCode の開発では ESLint および Prettier 拡張機能の使用を推奨（別紙参照）

## インテグレーションテストテストの実行方法

- インテグレーションテストでは、別途 DB＆ローカルサーバを立てておく必要あり

```
$ cd ..\Application\
$ npm run run start:local
```

- ./**integration_tests**配下の全テストコードの実行（カバレッジ算出なし）

```
$ npm run test:integration -- --adminid=xxx@xxx.com --adminsecret=xxx --userid=xxx@xxx.com --usersecret=xxx
```

- インテグレーションテストの jest の設定値はユニットテストと違う設定ファイルを使用

```
jest.config.e2e.js
```

- jest で使っている puppeteer の設定は下記に使用

```
jest-puppeteer.config.js
```
