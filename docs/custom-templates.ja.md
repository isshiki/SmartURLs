# 📘 SmartURLs テンプレートガイド (v1.4.0+)

このガイドでは、SmartURLsのカスタムテンプレート機能の使用方法を説明します。
テンプレートは**1行の入力フィールド**に記述しますが、`$nl`トークンを使用して複数行の出力を生成できます。

カスタムテンプレート機能は意図的に軽量です。ページ本文やHTMLメタデータを読み取らず、URLとブラウザのタブ情報をもとに動作します。

## 1. 基本トークン

SmartURLsは、タブのメタデータと現在のURLに基づいてトークンを置き換えます。

| トークン       | 説明                                                                                     | 出力例                                                                                |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `$title`       | タブに表示されるページタイトル                                                           | `Why the Moon?`                                                                       |
| `$title(html)` | HTMLエスケープされたページタイトル（`&`, `<`, `>`, `"`, `'`をエンティティに変換）。HTMLタグ/属性内で安全に使用可能。 | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(タイトル例: "Rock & Roll \<Best Hits>")* |
| `$url`         | 完全なURL                                                                                | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                         |
| `$domain`    | ホスト名のみ                    | `www.youtube.com`                             |
| `$path`      | URLのパス部分                   | `/watch`                                      |
| `$basename`  | パスの最後のセグメント          | `watch`                                       |
| `$idx`       | タブインデックス(1始まり)       | `3`                                           |
| `$date`      | ローカル日付(YYYY-MM-DD)        | `2025-01-12`                                  |
| `$time`      | ローカル時刻(HH:MM:SS)          | `14:03:55`                                    |
| `$date(utc)` | UTC日付                         | `2025-01-12`                                  |
| `$time(utc)` | UTC時刻                         | `05:03:55`                                    |
| `$nl`        | 改行を挿入                      | *(出力に改行を生成)*                          |

> ⚠️ **`$nl`に関する注意**: コピーカスタムテンプレートでのみサポートされています。テキストから開くカスタムテンプレートでは使用できません。コピーとオープンで同じテンプレートを再利用したい場合は、オープンテンプレートで`$nl`を避けるか、スマート(自動検出)モードを使用してください。

> ⚠️ **`$title(html)`に関する注意**: コピーカスタムテンプレートでのみサポートされています。テキストから開くカスタムテンプレートはこのトークンを処理しません。オープンテンプレートでは、代わりに`$title`を使用してください。

### 上記で使用した例のURLとタイトル

トークンがどのように展開されるかを示すため、これらの例では以下を使用します:

📘 **タイトル**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

このURLから:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (クエリパラメータ) → `bmC-FwibsZg`

日付と時刻は例です。実際の出力はシステムクロックに依存します。

## 2. クエリパラメータトークン

SmartURLsは、URLから直接クエリパラメータを抽出できます。

🔤 **構文**

```text
$<param>
```

🔗 **URL例**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| トークン | 出力          |
| -------- | ------------- |
| `$v`     | `bmC-FwibsZg` |
| `$t`     | `123`         |

パラメータが存在しない場合、その値は空文字列になります。

> ⚠️ **クエリパラメータトークンに関する注意**: クエリパラメータトークン(例えば`$v`、`$id`、`$tag`など)は、コピーカスタムテンプレートでのみ評価されます。テキストから開くカスタムテンプレートでは評価されないため、オープンテンプレートでは使用しないでください。

## 3. 条件付きブロック

条件付きブロックを使用すると、**特定のクエリパラメータが存在する場合にのみ**、テンプレートが特定のテキストを出力できます。

🔤 **構文**

🔹 **単一パラメータ**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **複数パラメータ(AND条件)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

条件付きブロック内では:

* `$v`、`$t`などは通常通り展開されます
* `$nl`、`$title`、`$domain`も機能します
* ネストされたブロックは許可されていません
* `else`は使用できません

条件が満たされない場合、ブロック全体が出力から削除されます。

> ⚠️ **条件付きブロックに関する注意**: 条件付きブロック(例えば`{{q=v: ...}}`)は、コピーカスタムテンプレートでのみ利用可能です。テキストから開くカスタムテンプレートでは機能しません。URLを開く際に柔軟なフィルタリングが必要な場合は、スマート(自動検出)モードを使用してください。

## 4. テンプレートの例とパターン

テンプレートは*1行*として記述されますが、`$nl`を使用して複数行を出力できます。

このセクションで使用する例のURLとタイトル:

📘 **タイトル**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: タイトル + URL

🛠 **テンプレート**

```template
$title$nl$url
```

💬 **出力**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Markdownリストアイテム

🛠 **テンプレート**

```template
- [$title]($url)
```

💬 **出力**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 YouTube動画ID(存在する場合のみ)

🛠 **テンプレート**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **出力**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

`v=`が欠けている場合:

```output
Why the Moon?
https://example.com/page
```

### 4.4 YouTubeサムネイルURLを生成

既知のYouTubeサムネイルパターンに基づく:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **テンプレート**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **出力**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 YouTubeサムネイルを埋め込む (Markdown)

🛠 **テンプレート**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **出力**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 タイムスタンプ(利用可能な場合)

🛠 **テンプレート**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **出力**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 複数パラメータ条件

🛠 **テンプレート**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **出力**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 ログ形式(ドメイン + パス)

🛠 **テンプレート**

```template
[$domain] $path$nl$url
```

💬 **出力**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 ファイル名スタイルの見出し

🛠 **テンプレート**

```template
## $basename: $title$nl$url
```

💬 **出力**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 ミニマリスト

🛠 **テンプレート**

```template
$title — $url
```

💬 **出力**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 日次ログエントリ

🛠 **テンプレート**

```template
- [$title]($url) — $date $time
```

💬 **出力**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 セパレータ付き複数行

🛠 **テンプレート**

```template
$title$nl$url$nl---$nl$domain
```

💬 **出力**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. 制限事項

カスタムテンプレート機能は意図的にシンプルなままです。

❌ カスタムテンプレート機能が`行わないこと`:

* ページ本文やHTMLメタデータを解析
* ページ上のメタデータやサムネイルを読み取り
* テンプレート内で任意のJavaScriptを実行
* OGタグ、著者、または説明を抽出
* ネストされた条件や`else`をサポート

✔️ カスタムテンプレート機能が`使用するもののみ`:

* タブのタイトル
* URLコンポーネント
* クエリパラメータ
* シンプルなトークン置換
* オプションの条件付きブロック

これにより、すべてのWebサイトで一貫した動作が保証されます。

## 6. バージョン互換性

これらの機能は以下で利用可能です: **SmartURLs v1.4.0以降**

## 7. フィードバック

機能リクエストや質問については、こちらでイシューを開いてください:

<https://github.com/isshiki/SmartURLs/issues>
