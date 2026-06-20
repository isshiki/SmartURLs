# 📘 SmartURLs 範本指南 (v1.4.0+)

本指南說明如何使用 SmartURLs 的自訂範本功能。
範本在**單行輸入欄位**中編寫，但可以使用 `$nl` 標記產生多行輸出。

自訂範本功能有意保持輕量。它不會讀取頁面正文或 HTML 中繼資料，而是使用 URL 和瀏覽器分頁資訊工作。

## 1. 基本標記

SmartURLs 嚴格基於分頁中繼資料和目前 URL 替換標記。

| 標記           | 描述                                                                                  | 範例輸出                                                                                |
| -------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `$title`       | 分頁中顯示的頁面標題                                                                  | `Why the Moon?`                                                                         |
| `$title(html)` | HTML 轉義的頁面標題（將 `&`、`<`、`>`、`"`、`'` 轉換為實體）。可安全用於 HTML 標籤/屬性。 | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(標題範例："Rock & Roll \<Best Hits>")* |
| `$url`         | 完整 URL                                                                              | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                           |
| `$domain`    | 僅主機名稱               | `www.youtube.com`                             |
| `$path`      | URL 的路徑部分           | `/watch`                                      |
| `$basename`  | 路徑的最後一段           | `watch`                                       |
| `$idx`       | 分頁索引（從 1 開始）    | `3`                                           |
| `$date`      | 本地日期 (YYYY-MM-DD)    | `2025-01-12`                                  |
| `$time`      | 本地時間 (HH:MM:SS)      | `14:03:55`                                    |
| `$date(utc)` | UTC 日期                 | `2025-01-12`                                  |
| `$time(utc)` | UTC 時間                 | `05:03:55`                                    |
| `$nl`        | 插入換行符               | *(在輸出中產生換行)*                          |

> ⚠️ **關於 `$nl` 的注意事項**：僅在複製自訂範本中受支援。無法在從文字開啟自訂範本中使用。如果您想為複製和開啟重用同一範本，請在開啟範本中避免使用 `$nl` 或改用智慧（自動偵測）模式。

> ⚠️ **關於 `$title(html)` 的注意事項**：僅在複製自訂範本中受支援。從文字開啟自訂範本不處理此標記。對於開啟範本，請改用 `$title`。

### 上面使用的範例 URL 和標題

為了展示標記如何展開，這些範例使用：

📘 **標題**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

從此 URL：

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (查詢參數) → `bmC-FwibsZg`

日期和時間是範例；實際輸出取決於您的系統時鐘。

## 2. 查詢參數標記

SmartURLs 可以直接從 URL 中擷取查詢參數。

🔤 **語法**

```text
$<param>
```

📄 **範例**

URL:

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| 標記 | 輸出          |
| ---- | ------------- |
| `$v` | `bmC-FwibsZg` |
| `$t` | `123`         |

如果參數不存在，其值將變為空字串。

> ⚠️ **關於查詢參數標記的注意事項**：查詢參數標記（例如 `$v`、`$id`、`$tag` 等）僅在複製自訂範本中進行評估。它們不會在從文字開啟自訂範本中進行評估，因此不要在開啟範本中使用它們。

## 3. 條件區塊

條件區塊允許範本**僅在存在特定查詢參數時**輸出某些文字。

🔤 **語法**

🔹 **單一參數**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **多個參數（AND 條件）**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

在條件區塊內：

* `$v`、`$t` 等正常展開
* `$nl`、`$title`、`$domain` 也可以使用
* 不允許巢狀區塊
* 沒有 `else` 可用

如果不滿足條件，整個區塊將從輸出中刪除。

> ⚠️ **關於條件區塊的注意事項**：條件區塊（例如 `{{q=v: ...}}`）僅在複製自訂範本中可用。它們在從文字開啟自訂範本中不起作用。如果您需要在開啟 URL 時進行靈活過濾，請改用智慧（自動偵測）模式。

## 4. 範本範例和模式

範本寫成*一行*，但可以透過 `$nl` 輸出多行。

本節中使用的範例 URL 和標題：

📘 **標題**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: 標題 + URL

🛠 **範本**

```template
$title$nl$url
```

💬 **輸出**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Markdown 清單項目

🛠 **範本**

```template
- [$title]($url)
```

💬 **輸出**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 YouTube 影片 ID（僅在存在時）

🛠 **範本**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **輸出**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

如果缺少 `v=`：

```output
Why the Moon?
https://example.com/page
```

### 4.4 產生 YouTube 縮圖 URL

基於已知的 YouTube 縮圖模式：

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **範本**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **輸出**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 嵌入 YouTube 縮圖 (Markdown)

🛠 **範本**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **輸出**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 時間戳記（如果可用）

🛠 **範本**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **輸出**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 多參數條件

🛠 **範本**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **輸出**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 日誌格式（網域 + 路徑）

🛠 **範本**

```template
[$domain] $path$nl$url
```

💬 **輸出**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 檔案名稱樣式標題

🛠 **範本**

```template
## $basename: $title$nl$url
```

💬 **輸出**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 極簡主義

🛠 **範本**

```template
$title — $url
```

💬 **輸出**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 每日日誌條目

🛠 **範本**

```template
- [$title]($url) — $date $time
```

💬 **輸出**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 帶分隔符的多行

🛠 **範本**

```template
$title$nl$url$nl---$nl$domain
```

💬 **輸出**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. 限制

自訂範本功能有意保持簡單。

❌ 自訂範本功能`不會`：

* 解析頁面正文或 HTML 中繼資料
* 從頁面讀取中繼資料或縮圖
* 在範本中執行任意 JavaScript
* 擷取 OG 標籤、作者或描述
* 支援巢狀條件或 `else`

✔️ 自訂範本功能`僅`使用：

* 分頁標題
* URL 元件
* 查詢參數
* 簡單的標記替換
* 可選的條件區塊

這確保了在所有網站上的一致行為。

## 6. 版本相容性

這些功能適用於：**SmartURLs v1.4.0 及更高版本**

## 7. 回饋

如有功能請求或問題，請在 GitHub 上開 issue：

<https://github.com/isshiki/SmartURLs/issues>
