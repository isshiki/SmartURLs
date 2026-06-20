# 📘 SmartURLs Template Guide (v1.4.0+)

This guide explains how to use the custom template feature of SmartURLs.
Templates are written in a **single-line input field**, but can produce multi-line output using the `$nl` token.

The custom template feature is intentionally lightweight. It does not read page body content or HTML metadata, and works with the URL and browser tab information.

## 1. Basic Tokens

SmartURLs replaces tokens based strictly on tab metadata and the current URL.

| Token          | Description                                                                                                    | Example Output                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `$title`       | Page title shown in the tab                                                                                    | `Why the Moon?`                                                                    |
| `$title(html)` | HTML-escaped page title (converts `&`, `<`, `>`, `"`, `'` to entities). Safe for use in HTML tags/attributes. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(for title: "Rock & Roll \<Best Hits>")* |
| `$url`         | Full URL                                                                                                       | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                      |
| `$domain`    | Hostname only               | `www.youtube.com`                             |
| `$path`      | Path part of the URL        | `/watch`                                      |
| `$basename`  | Last segment of the path    | `watch`                                       |
| `$idx`       | Tab index (1-based)         | `3`                                           |
| `$date`      | Local date (YYYY-MM-DD)     | `2025-01-12`                                  |
| `$time`      | Local time (HH:MM:SS)       | `14:03:55`                                    |
| `$date(utc)` | UTC date                    | `2025-01-12`                                  |
| `$time(utc)` | UTC time                    | `05:03:55`                                    |
| `$nl`        | Inserts a newline           | *(produces line breaks in output)*            |

> ⚠️ **Note about `$nl`**: Only supported in Copy custom templates. Cannot be used in Open from text custom templates. If you want to reuse the same template for both Copy and Open, avoid `$nl` in the Open template or use Smart (auto-detect) mode instead.

> ⚠️ **Note about `$title(html)`**: Only supported in Copy custom templates. Open-from-text custom templates do not process this token. For Open templates, use `$title` instead.

### Example URL and Title Used Above

To show how tokens expand, these examples use:

📘 **Example Title**

```text
Why the Moon?
```

🔗 **Example URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

From this URL:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (query parameter) → `bmC-FwibsZg`

Dates and times are examples; actual output depends on your system clock.

## 2. Query Parameter Tokens

SmartURLs can extract query parameters directly from the URL.

🔤 **Syntax**

```text
$<param>
```

🔗 **Example URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Token | Output        |
| ----- | ------------- |
| `$v`  | `bmC-FwibsZg` |
| `$t`  | `123`         |

If a parameter does not exist, its value becomes an empty string.

> ⚠️ **Note about Query Parameter Tokens**: Query parameter tokens (for example `$v`, `$id`, `$tag`, etc.) are evaluated only in Copy custom templates. They are not evaluated in Open-from-text custom templates, so do not use them in Open templates.

## 3. Conditional Blocks

Conditional blocks allow templates to output certain text **only if specific query parameters are present**.

🔤 **Syntax**

🔹 **Single parameter**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Multiple parameters (AND condition)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

Inside a conditional block:

* `$v`, `$t`, etc. expand normally
* `$nl`, `$title`, `$domain` also work
* Nested blocks are not allowed
* No `else` is available

If conditions are not met, the entire block is removed from output.

> ⚠️ **Note about Conditional Blocks**: Conditional blocks (for example `{{q=v: ...}}`) are available only in Copy custom templates. They do not work in Open-from-text custom templates. If you need flexible filtering when opening URLs, use the Smart (auto-detect) mode instead.

## 4. Template Examples & Patterns

Templates are written as *one line*, but may output multiple lines via `$nl`.

Example URL and title used in this section:

📘 **Title**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Title + URL

🛠 **Template**

```template
$title$nl$url
```

💬 **Output**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Markdown List Item

🛠 **Template**

```template
- [$title]($url)
```

💬 **Output**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 YouTube Video ID (only if present)

🛠 **Template**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **Output**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

If `v=` is missing:

```output
Why the Moon?
https://example.com/page
```

### 4.4 Generate YouTube Thumbnail URL

Based on the known YouTube thumbnail pattern:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **Template**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **Output**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 Embed YouTube Thumbnail (Markdown)

🛠 **Template**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Output**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Timestamp (if available)

🛠 **Template**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **Output**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 Multi-parameter Conditional

🛠 **Template**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Output**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Log Format (domain + path)

🛠 **Template**

```template
[$domain] $path$nl$url
```

💬 **Output**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Filename-style Heading

🛠 **Template**

```template
## $basename: $title$nl$url
```

💬 **Output**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Minimalist

🛠 **Template**

```template
$title — $url
```

💬 **Output**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Daily Log Entry

🛠 **Template**

```template
- [$title]($url) — $date $time
```

💬 **Output**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Multi-line with Separator

🛠 **Template**

```template
$title$nl$url$nl---$nl$domain
```

💬 **Output**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. Limitations

The custom template feature intentionally stays simple.

❌ The custom template feature `DOES NOT`:

* Parse page body content or HTML metadata
* Read metadata or thumbnails from the page
* Execute arbitrary JavaScript in templates
* Extract OG tags, authors, or descriptions
* Support nested conditionals or `else`

✔️ The custom template feature `ONLY` uses:

* Tab title
* URL components
* Query parameters
* Simple token replacement
* Optional conditional blocks

This ensures consistent behavior across all websites.

## 6. Version Compatibility

These features are available in: **SmartURLs v1.4.0 and later**

## 7. Feedback

For feature requests or questions, please open an issue here:

<https://github.com/isshiki/SmartURLs/issues>
