# FERAL // HIIT CHALLENGE（月カレンダー版）

黒 × ネオングリーン、発光する猫の視線、ハーフトーン、薄いCRTスキャンラインを組み合わせた1ページの習慣ボード。フレームワーク、外部フォント、外部画像、ビルド工程は不要です。猫の画像は編集可能なオリジナルSVGです。公式ロゴ・缶の意匠は使用していません。

## ファイル

- index.html — ページ本体
- style.css — スマホ／PC対応のスタイル
- script.js — 記録、日付、連続日数、報酬、保存
- cat-watcher.svg — ヘッダーの猫
- cat-stamp.svg — 猫のファビコン。カレンダーは同形のインラインSVG
- .nojekyll — GitHub Pagesで静的ファイルとして配信

## 使い方と計算ルール

初回アクセスの端末のローカル日付を1日目とし、30日分を表示します。「朝やった」「夜やった」を押すとON/OFFが切り替わります。朝か夜の一方でその日は達成、両方でフル達成です。30日経過後も当日の記録と報酬計算は続けられますが、カレンダーは最初の30日間を表示します。

今日が未達成でも、昨日までの連続記録は当日中は維持します。昨日も未達成なら0になります。フル達成の連続日数も同じルールです。

朝夜フル達成が3日続くごとに報酬1回。6日なら2回、9日なら3回です。未達成日を挟むと次の3日分のカウントをやり直します。過去に獲得した回数は残ります。当日の記録をOFFにして条件を満たさなくなった場合は報酬も再計算します。UNLOCKEDは累計1回以上の獲得を示します。購入管理・消費操作はありません。

localStorageのキーは `feral-hiit-v1`、内容は `{ startDate: 'YYYY-MM-DD', records: { 'YYYY-MM-DD': { morning: true, evening: false } } }` です。日付が変わると、フォーカス復帰・再表示・30秒ごとの確認・ボタン操作時に表示を更新します。

保存は同じ端末・同じブラウザ・同じサイトの中のみです。ブラウザのデータ削除で消えます。ローカルプレビューとGitHub Pagesは保存領域が別です。保存不可・保存データ破損時には画面にメッセージを表示します。

## GitHub Pagesへのアップ方法

1. GitHubで公開用リポジトリを作成します。
2. ZIPを解凍し、中の index.html / style.css / script.js / cat-watcher.svg / cat-stamp.svg / .nojekyll をリポジトリのルートに追加してコミットします。ZIPそのものをアップするのではありません。
3. リポジトリの Settings → Pages を開きます。
4. Build and deployment の Source に Deploy from a branch を選択します。
5. Branch を main、フォルダを /(root) にして Save を押します。
6. デプロイ完了後、Pages画面に表示されるURLを開きます。

公式ガイド: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## ローカル確認

このフォルダで `python3 -m http.server 8765 --bind 127.0.0.1` を実行し、http://127.0.0.1:8765 を開きます。ローカルファイルを直接開いた場合はブラウザによって保存挙動が異なるため、HTTP配信をおすすめします。

ロジックテスト: `node tests/challenge.test.cjs`

確認対象: 朝夜ON/OFF、再起動復元、30マス、片方／両方達成、3日／6日の報酬、解除による再計算、途中の空白日、日付更新、年越し、保存エラー。

## 今後の改善候補

- JSON形式のバックアップ／復元
- 次の30日チャレンジの開始と過去チャレンジの閲覧
- PWA化してホーム画面への追加とオフライン利用

## クラウド同期（どの端末でも同じ記録）

記録は非公開リポジトリ `tetsunuja/feral-hiit-data` の `records.json` に保存されます。サイト本体は公開、記録は非公開です。

1. https://github.com/settings/personal-access-tokens/new でキーを作る
   - Repository access: Only select repositories → `feral-hiit-data` だけ
   - Permissions → Repository permissions → Contents: Read and write
2. サイト下部「05 / CLOUD SYNC」→「同期キーの設定」に貼って保存（端末ごとに1回）

同じ日をスマホとPCで別々に押した場合は、後から押した方が残ります。オフライン中の記録は端末に保存され、次に開いた時に同期されます。
