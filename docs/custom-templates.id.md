# 📘 Panduan Template SmartURLs (v1.4.0+)

Panduan ini menjelaskan cara menggunakan fitur template kustom SmartURLs.
Template ditulis dalam **field input satu baris**, tetapi dapat menghasilkan output multi-baris menggunakan token `$nl`.

Fitur template kustom sengaja dibuat ringan. Fitur ini tidak membaca isi halaman atau metadata HTML, dan bekerja dengan URL serta informasi tab browser.

## 1. Token Dasar

SmartURLs mengganti token berdasarkan metadata tab dan URL saat ini.

| Token          | Deskripsi                                                                                                                  | Contoh Output                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `$title`       | Judul halaman di tab                                                                                                       | `Why the Moon?`                                                                         |
| `$title(html)` | Judul halaman yang di-escape HTML (mengonversi `&`, `<`, `>`, `"`, `'` menjadi entitas). Aman untuk tag/atribut HTML. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(untuk judul: "Rock & Roll \<Best Hits>")* |
| `$url`         | URL lengkap                                                                                                                | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                           |
| `$domain`    | Hanya hostname                   | `www.youtube.com`                             |
| `$path`      | Bagian path dari URL             | `/watch`                                      |
| `$basename`  | Segmen terakhir dari path        | `watch`                                       |
| `$idx`       | Indeks tab (basis 1)             | `3`                                           |
| `$date`      | Tanggal lokal (YYYY-MM-DD)       | `2025-01-12`                                  |
| `$time`      | Waktu lokal (HH:MM:SS)           | `14:03:55`                                    |
| `$date(utc)` | Tanggal UTC                      | `2025-01-12`                                  |
| `$time(utc)` | Waktu UTC                        | `05:03:55`                                    |
| `$nl`        | Menyisipkan baris baru           | *(menghasilkan pemisah baris dalam output)*  |

> ⚠️ **Catatan tentang `$nl`**: Hanya didukung dalam template kustom Salin. Tidak dapat digunakan dalam template kustom Buka dari teks. Jika Anda ingin menggunakan kembali template yang sama untuk Salin dan Buka, hindari `$nl` dalam template buka atau gunakan mode Pintar (deteksi otomatis) sebagai gantinya.

> ⚠️ **Catatan tentang `$title(html)`**: Hanya didukung dalam template kustom Salin. Template kustom Buka dari teks tidak memproses token ini. Untuk template buka, gunakan `$title` sebagai gantinya.

### Contoh URL dan Judul yang Digunakan di Atas

Untuk menunjukkan bagaimana token diperluas, contoh ini menggunakan:

📘 **Judul**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

Dari URL ini:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (parameter query) → `bmC-FwibsZg`

Tanggal dan waktu adalah contoh; output aktual bergantung pada jam sistem Anda.

## 2. Token Parameter Query

SmartURLs dapat mengekstrak parameter query langsung dari URL.

🔤 **Sintaks**

```text
$<param>
```

🔗 **Contoh URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Token | Output        |
| ----- | ------------- |
| `$v`  | `bmC-FwibsZg` |
| `$t`  | `123`         |

Jika parameter tidak ada, nilainya menjadi string kosong.

> ⚠️ **Catatan tentang token parameter query**: Token parameter query (misalnya `$v`, `$id`, `$tag`, dll.) hanya dievaluasi dalam template kustom Salin. Mereka tidak dievaluasi dalam template kustom Buka dari teks, jadi jangan gunakan dalam template buka.

## 3. Blok Kondisional

Blok kondisional memungkinkan template menghasilkan teks tertentu **hanya jika parameter query tertentu ada**.

🔤 **Sintaks**

🔹 **Parameter tunggal**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Beberapa parameter (kondisi DAN)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

Di dalam blok kondisional:

* `$v`, `$t`, dll. diperluas secara normal
* `$nl`, `$title`, `$domain` juga berfungsi
* Blok bersarang tidak diizinkan
* Tidak ada `else` yang tersedia

Jika kondisi tidak terpenuhi, seluruh blok dihapus dari output.

> ⚠️ **Catatan tentang blok kondisional**: Blok kondisional (misalnya `{{q=v: ...}}`) hanya tersedia dalam template kustom Salin. Mereka tidak berfungsi dalam template kustom Buka dari teks. Jika Anda memerlukan pemfilteran fleksibel saat membuka URL, gunakan mode Pintar (deteksi otomatis) sebagai gantinya.

## 4. Contoh & Pola Template

Template ditulis sebagai *satu baris*, tetapi dapat menghasilkan beberapa baris melalui `$nl`.

Contoh URL dan judul yang digunakan di bagian ini:

📘 **Judul**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Judul + URL

🛠 **Template**

```template
$title$nl$url
```

💬 **Output**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Item Daftar Markdown

🛠 **Template**

```template
- [$title]($url)
```

💬 **Output**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 ID Video YouTube (hanya jika ada)

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

Jika `v=` tidak ada:

```output
Why the Moon?
https://example.com/page
```

### 4.4 Hasilkan URL Thumbnail YouTube

Berdasarkan pola thumbnail YouTube yang dikenal:

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

### 4.5 Sematkan Thumbnail YouTube (Markdown)

🛠 **Template**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Output**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Timestamp (jika tersedia)

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

### 4.7 Kondisional Multi-parameter

🛠 **Template**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Output**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Format Log (domain + path)

🛠 **Template**

```template
[$domain] $path$nl$url
```

💬 **Output**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Heading bergaya nama file (menggunakan $basename)

🛠 **Template**

```template
## $basename: $title$nl$url
```

💬 **Output**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Minimalis

🛠 **Template**

```template
$title — $url
```

💬 **Output**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Entri Log Harian

🛠 **Template**

```template
- [$title]($url) — $date $time
```

💬 **Output**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Multi-baris dengan Pemisah

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

## 5. Keterbatasan

Fitur template kustom sengaja tetap sederhana.

❌ Fitur template kustom `TIDAK`:

* Mengurai isi halaman atau metadata HTML
* Membaca metadata atau thumbnail dari halaman
* Menjalankan JavaScript arbitrer dalam template
* Mengekstrak tag OG, penulis, atau deskripsi
* Mendukung kondisional bersarang atau `else`

✔️ Fitur template kustom `HANYA` menggunakan:

* Judul tab
* Komponen URL
* Parameter query
* Penggantian token sederhana
* Blok kondisional opsional

Ini memastikan perilaku konsisten di semua situs web.

## 6. Kompatibilitas Versi

Fitur-fitur ini tersedia di: **SmartURLs v1.4.0 dan yang lebih baru**

## 7. Umpan Balik

Untuk permintaan fitur atau pertanyaan, silakan buka issue di sini:

<https://github.com/isshiki/SmartURLs/issues>
