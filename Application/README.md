# 推奨開発環境

動作確認環境

- OS: Windows10
- IDE: Visual Studio Code
- Terminal: Powershell

以下、グローバルにインストールされていること

- Node.js v14
- docker
- Python v2.7

# ローカル環境での起動手順

## パッケージインストール

```
$ npm install
```

## ローカル DB の立ち上げ

localdb ディレクトリ配下に移動し、docker-compose

```
$ cd localdb
$ docker-compose up

Creating network "localdb_default" with the default driver
Creating volume "localdb_mssql-db" with local driver
Creating sqlserver ... done
Attaching to sqlserver
sqlserver    | SQL Server 2019 will run as non-root by default.
sqlserver    | This container is running as user mssql.
sqlserver    | To learn more visit https://go.microsoft.com/fwlink/?linkid=2099216.
sqlserver    | importing data will start in 30s...
```

SQL サーバーが立ち上がるのを待つため 30 秒遅延してから、初期データ（テーブル）がインポートされる。\
データインポートに成功した場合、以下の出力で終了する。

```
2021-01-03 22:39:33.90 spid12s     The tempdb database has 8 data file(s).
importing data...
sqlserver    | import:  ./init-data/01_createDatabase.sql
sqlserver    | 2021-01-03 22:39:39.61 spid51      [5]. Feature Status: PVS: 0. CTR: 0. ConcurrentPFSUpdate: 1.
2021-01-03 22:39:39.66 spid51      Starting up database 'PortalAppDB'.
2021-01-03 22:39:39.96 spid51      Parallel redo is started for database 'PortalAppDB' with worker pool size [4].
2021-01-03 22:39:40.01 spid51      Parallel redo is shutdown for database 'PortalAppDB' with worker pool size [4].
Name
sqlserver    | ---------------------------------------------------------------------------------------------------
sqlserver    | master
sqlserver    | tempdb
sqlserver    | model
sqlserver    | msdb
sqlserver    | PortalAppDB
sqlserver    |
sqlserver    | (5 rows affected)
```

PC スペック等の要因で立ち上がりが遅い場合、データのインポートが失敗する。\
インポートのタイミング棋院で失敗した場合、下記のエラーが出力されている。

```
sqlserver    | import:  ./init-data/01_createDatabase.sql
sqlserver    | Sqlcmd: Error: Microsoft ODBC Driver 17 for SQL Server : Login timeout expired.
sqlserver    | Sqlcmd: Error: Microsoft ODBC Driver 17 for SQL Server : TCP Provider: Error code 0x2749.
sqlserver    | Sqlcmd: Error: Microsoft ODBC Driver 17 for SQL Server : A network-related or instance-specific error has occurred while establishing a connection to SQL Server. Server is not found or not accessible. Check if instance name is correct and if SQL Server is configured to allow remote connections. For more information see SQL Server Books Online..
```

遅延時間を 30 秒以上にする場合、localdb 配下の`start-up.sh`を編集する

```shell:start-up.sh
#!/bin/bash
# wait_time=30s
wait_time=60s

# wait for SQL Server to come up
echo importing data will start in $wait_time...
```

DB データは docker の volume で永続化しているため、docker を落としても再度
`docker-compose up`で\
データは失われずにデータベースを利用できる。

volume も削除して DB を初期化する場合は以下を実行する

```
$ docker-compose down --volume
```

## DB マイグレーション

docker-compose 時のデータインポートではテーブルのみを作成した状態のため\
DB マイグレーションでスキーマを作成する。

Application ディレクトリ配下で以下を実行。

```
$ npx sequelize db:migrate --env development
```

DB マイグレーション時の接続情報は config/config.json を参照、\
マイグレーションの中身は migrations 配下の js ファイル参照のこと。

## Web アプリの起動

```
$ npm run start:local
```

# トレードシフト sandbox 環境での動作確認

## 前提条件

- 上記手順により Web アプリが起動されていること（localhost:3000）
- トレードシフトの sandbox 環境にアカウントを作成しておくこと\
  https://sandbox.tradeshift.com/

## アプリの有効化

以下 URL からローカル環境開発用のデジタルトレードポータルアプリを有効化する
https://sandbox.tradeshift.com/#/apps/Tradeshift.AppStore/apps/BCDdev.PortalAppL

トレードシフトのアプリ一覧からデジタルトレードアプリを選択、\
または以下の URL にアクセスし、利用登録画面が表示されることを確認する
https://sandbox.tradeshift.com/#/BCDdev.PortalAppL

## localhost では自己署名証明書を使っていることの留意点

- ブラウザで sandbox 環境でアプリを開いた際に localhost に接続できない場合、\
  一度、localhost:3000 で自己署名証明書のエラーを解消してからアクセスすると表示される

- 利用規約 pdf のダウンロードは自己署名証明書を使っているため不可。\
  （Azure 環境にデプロイしてから確認すること）

# コーディング規約

- Javascript Standard Style 準拠
- ESLint 使用（設定値は.eslintrc.json）
- フォーマッターは prettier 使用（設定値は.prettierrc.js）
- モジュールのインポートは Common.js（require）
- 文末セミコロンなし
- 変数名・関数名の命名はローワーキャメルケース（先頭小文字）

VSCode の開発では ESLint および Prettier 拡張機能の使用を推奨（別紙参照）

# 用語集

- テナント ID, Tenant ID\
  各企業を示す ID。\
  トレードシフトのアカウント作成時にユニークな ID が登録企業について付与される

- ユーザ ID, User ID\
  企業内の個々のユーザに対して付与されるユニークな ID。\
  アカウント作成時に作成したユーザに付与されるか、またはアカウント管理者が会社プロフィールで追加したユーザに対して付与される。

- ユーザ権限, User Role\
  大別して、アカウント管理者と一般ユーザ（閲覧のみユーザ含む）に分類される。\
  アカウント管理者は以下の一意の値となる。\
  `a6a3edcd-00d9-427c-bf03-4ef0112ba16d`\
  \
  一般ユーザは上記アカウント管理者以外のユーザとなる。\
  アカウントを作成したユーザは、最初のアカウント管理者となる。それ以外のユーザは会社プロフィールでユーザ追加時に設定する。\
  ユーザ追加時にユーザの権限としてアカウント管理者を設定すると、一つのテナントに対して複数のアカウント管理者が存在することもある。
