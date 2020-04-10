# vs-covid19-line-bot
- VS COVID-19のLINE BOT版です

## 利用しているデータ
  - 支援情報（行政→企業）
    - [プレスリリース](https://www.soumu.go.jp/menu_news/s-news/01ryutsu06_02000243.html)
    - [データ](https://docs.google.com/spreadsheets/d/1R1tS27iOfJe0fryN6mc_0Sz6lkE3846_jWEeVlz9cpc/edit?usp=sharing)
  -  支援情報（行政→個人）
    - ※公表待ち
  - 支援情報（企業→個人）
    - [プレスリリース](https://www.soumu.go.jp/menu_news/s-news/01ryutsu02_02000267.html)
    - [データ](https://docs.google.com/spreadsheets/d/1IiHUk3D_b6e5BfqFG3ZBxQ8X-QVACdY7CeQeG6C7S1w/edit#gid=0)

## 貢献の仕方
- 整備中

### 環境構築の手順
```
$ yarn
$ yarn clasp login
```
`.clasp.json` をもらう(ワークフロー整備中)

### GASを更新させるとき
```
$ yarn clasp push
```

### LINE botへの反映
```
$ yarn clasp deploy
$ yarn clasp open
```
- `公開 -> ウェブアプリケーションとして導入 -> Project versionを指定 -> 更新`
- ※ Who has access to the app: Anyone, even anonymous-
