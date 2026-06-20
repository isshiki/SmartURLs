# 📘 SmartURLs Şablon Kılavuzu (v1.4.0+)

Bu kılavuz, SmartURLs'nin özel şablon özelliğinin nasıl kullanılacağını açıklar.
Şablonlar **tek satırlık bir giriş alanında** yazılır, ancak `$nl` belirteci kullanılarak çok satırlı çıktı üretebilir.

Özel şablon özelliği kasıtlı olarak hafiftir. Sayfa içeriğini veya HTML meta verilerini okumaz; URL ve tarayıcı sekmesi bilgileriyle çalışır.

## 1. Temel Belirteçler

SmartURLs, belirteçleri kesinlikle sekme meta verilerine ve geçerli URL'ye göre değiştirir.

| Belirteç       | Açıklama                                                                                                                 | Örnek Çıktı                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `$title`       | Sekmede gösterilen sayfa başlığı                                                                                         | `Why the Moon?`                                                                         |
| `$title(html)` | HTML ile kaçışlı sayfa başlığı (`&`, `<`, `>`, `"`, `'` karakterlerini varlıklara dönüştürür). HTML etiketleri/öznitelikleri için güvenli. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(başlık için: "Rock & Roll \<Best Hits>")* |
| `$url`         | Tam URL                                                                                                                  | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                           |
| `$domain`    | Yalnızca ana bilgisayar adı       | `www.youtube.com`                             |
| `$path`      | URL'nin yol kısmı                 | `/watch`                                      |
| `$basename`  | Yolun son segmenti                | `watch`                                       |
| `$idx`       | Sekme dizini (1 tabanlı)          | `3`                                           |
| `$date`      | Yerel tarih (YYYY-MM-DD)          | `2025-01-12`                                  |
| `$time`      | Yerel saat (HH:MM:SS)             | `14:03:55`                                    |
| `$date(utc)` | UTC tarihi                        | `2025-01-12`                                  |
| `$time(utc)` | UTC saati                         | `05:03:55`                                    |
| `$nl`        | Yeni satır ekler                  | *(çıktıda satır sonları üretir)*             |

> ⚠️ **`$nl` hakkında not**: Yalnızca Kopyalama özel şablonlarında desteklenir. Metinden aç özel şablonlarında kullanılamaz. Aynı şablonu hem Kopyalama hem de Açma için yeniden kullanmak istiyorsanız, açma şablonunda `$nl`'den kaçının veya Akıllı (otomatik algılama) modunu kullanın.

> ⚠️ **`$title(html)` hakkında not**: Yalnızca Kopyalama özel şablonlarında desteklenir. Metinden aç özel şablonları bu belirteci işlemez. Açma şablonları için bunun yerine `$title` kullanın.

### Yukarıda Kullanılan Örnek URL ve Başlık

Belirteçlerin nasıl genişlediğini göstermek için bu örnekler şunları kullanır:

📘 **Başlık**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

Bu URL'den:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (sorgu parametresi) → `bmC-FwibsZg`

Tarihler ve saatler örnektir; gerçek çıktı sistem saatinize bağlıdır.

## 2. Sorgu Parametresi Belirteçleri

SmartURLs, sorgu parametrelerini doğrudan URL'den çıkarabilir.

🔤 **Sözdizimi**

```text
$<param>
```

📄 **Örnek**

URL:

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Belirteç | Çıktı         |
| -------- | ------------- |
| `$v`     | `bmC-FwibsZg` |
| `$t`     | `123`         |

Bir parametre mevcut değilse, değeri boş bir dize olur.

> ⚠️ **Sorgu parametresi belirteçleri hakkında not**: Sorgu parametresi belirteçleri (örneğin `$v`, `$id`, `$tag` vb.) yalnızca Kopyalama özel şablonlarında değerlendirilir. Metinden aç özel şablonlarında değerlendirilmez, bu nedenle bunları açma şablonlarında kullanmayın.

## 3. Koşullu Bloklar

Koşullu bloklar, şablonların **yalnızca belirli sorgu parametreleri mevcutsa** belirli metni çıkarmasına olanak tanır.

🔤 **Sözdizimi**

🔹 **Tek parametre**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Çoklu parametreler (VE koşulu)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

Koşullu bir blok içinde:

* `$v`, `$t` vb. normal şekilde genişler
* `$nl`, `$title`, `$domain` da çalışır
* İç içe bloklar izin verilmez
* `else` kullanılamaz

Koşullar karşılanmazsa, bloğun tamamı çıktıdan kaldırılır.

> ⚠️ **Koşullu bloklar hakkında not**: Koşullu bloklar (örneğin `{{q=v: ...}}`) yalnızca Kopyalama özel şablonlarında kullanılabilir. Metinden aç özel şablonlarında çalışmaz. URL açarken esnek filtrelemeye ihtiyacınız varsa, Akıllı (otomatik algılama) modunu kullanın.

## 4. Şablon Örnekleri ve Kalıpları

Şablonlar *tek satır* olarak yazılır, ancak `$nl` aracılığıyla birden çok satır çıkarabilir.

Bu bölümde kullanılan örnek URL ve başlık:

📘 **Başlık**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Başlık + URL

🛠 **Şablon**

```template
$title$nl$url
```

💬 **Çıktı**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Markdown Liste Öğesi

🛠 **Şablon**

```template
- [$title]($url)
```

💬 **Çıktı**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 YouTube Video ID'si (yalnızca mevcutsa)

🛠 **Şablon**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **Çıktı**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

`v=` eksikse:

```output
Why the Moon?
https://example.com/page
```

### 4.4 YouTube Küçük Resim URL'si Oluştur

Bilinen YouTube küçük resim desenine dayalı:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **Şablon**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **Çıktı**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 YouTube Küçük Resmi Yerleştir (Markdown)

🛠 **Şablon**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Çıktı**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Zaman Damgası (varsa)

🛠 **Şablon**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **Çıktı**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 Çok Parametreli Koşul

🛠 **Şablon**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Çıktı**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Günlük Formatı (alan adı + yol)

🛠 **Şablon**

```template
[$domain] $path$nl$url
```

💬 **Çıktı**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Dosya adı tarzı başlık

🛠 **Şablon**

```template
## $basename: $title$nl$url
```

💬 **Çıktı**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Minimalist

🛠 **Şablon**

```template
$title — $url
```

💬 **Çıktı**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Günlük Günlük Girişi

🛠 **Şablon**

```template
- [$title]($url) — $date $time
```

💬 **Çıktı**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Ayırıcılı Çok Satırlı

🛠 **Şablon**

```template
$title$nl$url$nl---$nl$domain
```

💬 **Çıktı**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. Sınırlamalar

Özel şablon özelliği kasıtlı olarak basit kalır.

❌ Özel şablon özelliği `YAPMAZ`:

* Sayfa içeriğini veya HTML meta verilerini ayrıştırma
* Sayfadaki meta verileri veya küçük resimleri okuma
* Şablonlarda rastgele JavaScript yürütme
* OG etiketlerini, yazarları veya açıklamaları çıkarma
* İç içe koşulları veya `else`'i destekleme

✔️ Özel şablon özelliği `YALNIZCA` şunları kullanır:

* Sekme başlığı
* URL bileşenleri
* Sorgu parametreleri
* Basit belirteç değiştirme
* İsteğe bağlı koşullu bloklar

Bu, tüm web sitelerinde tutarlı davranış sağlar.

## 6. Sürüm Uyumluluğu

Bu özellikler şurada kullanılabilir: **SmartURLs v1.4.0 ve sonrası**

## 7. Geri Bildirim

Özellik istekleri veya sorular için lütfen GitHub'da bir issue açın:

<https://github.com/isshiki/SmartURLs/issues>
