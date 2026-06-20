# 📘 SmartURLs Sjabloonhandleiding (v1.4.0+)

Deze handleiding legt uit hoe u de aangepaste sjabloonfunctie van SmartURLs gebruikt.
Sjablonen worden geschreven in een **invoerveld van één regel**, maar kunnen uitvoer met meerdere regels produceren met behulp van het `$nl`-token.

De aangepaste sjabloonfunctie is opzettelijk lichtgewicht. Deze leest geen pagina-inhoud of HTML-metadata en werkt met de URL en browserTab-informatie.

## 1. Basis-tokens

SmartURLs vervangt tokens strikt gebaseerd op tabmetadata en de huidige URL.

| Token          | Beschrijving                                                                                                                 | Voorbeelduitvoer                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `$title`       | Paginatitel weergegeven in het tabblad                                                                                       | `Why the Moon?`                                                                         |
| `$title(html)` | HTML-ge-escaped paginatitel (converteert `&`, `<`, `>`, `"`, `'` naar entiteiten). Veilig voor HTML-tags/-attributen. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(voor titel: "Rock & Roll \<Best Hits>")* |
| `$url`         | Volledige URL                                                                                                                | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                           |
| `$domain`    | Alleen hostnaam                     | `www.youtube.com`                             |
| `$path`      | Paddeel van de URL                  | `/watch`                                      |
| `$basename`  | Laatste segment van het pad         | `watch`                                       |
| `$idx`       | Tabindex (1-gebaseerd)              | `3`                                           |
| `$date`      | Lokale datum (YYYY-MM-DD)           | `2025-01-12`                                  |
| `$time`      | Lokale tijd (HH:MM:SS)              | `14:03:55`                                    |
| `$date(utc)` | UTC-datum                           | `2025-01-12`                                  |
| `$time(utc)` | UTC-tijd                            | `05:03:55`                                    |
| `$nl`        | Voegt een nieuwe regel in           | *(produceert regeleinden in uitvoer)*         |

> ⚠️ **Opmerking over `$nl`**: Alleen ondersteund in Kopiëren aangepaste sjablonen. Kan niet worden gebruikt in aangepaste sjablonen voor Openen vanuit tekst. Als u dezelfde sjabloon wilt hergebruiken voor zowel Kopiëren als Openen, vermijd dan `$nl` in het Open-sjabloon of gebruik in plaats daarvan de Slimme (automatische detectie)-modus.

> ⚠️ **Opmerking over `$title(html)`**: Alleen ondersteund in Kopiëren aangepaste sjablonen. Aangepaste sjablonen voor Openen vanuit tekst verwerken dit token niet. Gebruik voor Open-sjablonen in plaats daarvan `$title`.

### Voorbeeld URL en titel hierboven gebruikt

Om te laten zien hoe tokens zich uitbreiden, gebruiken deze voorbeelden:

📘 **Titel**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

Uit deze URL:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (queryparameter) → `bmC-FwibsZg`

Data en tijden zijn voorbeelden; de werkelijke uitvoer hangt af van uw systeemklok.

## 2. Queryparameter-tokens

SmartURLs kan queryparameters direct uit de URL extraheren.

🔤 **Syntaxis**

```text
$<param>
```

📄 **Voorbeeld**

URL:

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Token | Uitvoer       |
| ----- | ------------- |
| `$v`  | `bmC-FwibsZg` |
| `$t`  | `123`         |

Als een parameter niet bestaat, wordt de waarde een lege string.

> ⚠️ **Opmerking over queryparameter-tokens**: Queryparameter-tokens (bijvoorbeeld `$v`, `$id`, `$tag`, enz.) worden alleen geëvalueerd in Kopiëren aangepaste sjablonen. Ze worden niet geëvalueerd in aangepaste sjablonen voor Openen vanuit tekst, dus gebruik ze niet in Open-sjablonen.

## 3. Voorwaardelijke blokken

Voorwaardelijke blokken stellen sjablonen in staat om bepaalde tekst **alleen uit te voeren als specifieke queryparameters aanwezig zijn**.

🔤 **Syntaxis**

🔹 **Enkele parameter**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Meerdere parameters (EN-voorwaarde)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

Binnen een voorwaardelijk blok:

* `$v`, `$t`, enz. worden normaal uitgebreid
* `$nl`, `$title`, `$domain` werken ook
* Geneste blokken zijn niet toegestaan
* Geen `else` beschikbaar

Als aan de voorwaarden niet wordt voldaan, wordt het hele blok uit de uitvoer verwijderd.

> ⚠️ **Opmerking over voorwaardelijke blokken**: Voorwaardelijke blokken (bijvoorbeeld `{{q=v: ...}}`) zijn alleen beschikbaar in Kopiëren aangepaste sjablonen. Ze werken niet in aangepaste sjablonen voor Openen vanuit tekst. Als u flexibele filtering nodig heeft bij het openen van URL's, gebruik dan in plaats daarvan de Slimme (automatische detectie)-modus.

## 4. Sjabloonvoorbeelden en patronen

Sjablonen worden geschreven als *één regel*, maar kunnen meerdere regels uitvoeren via `$nl`.

Voorbeeld URL en titel gebruikt in deze sectie:

📘 **Titel**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Titel + URL

🛠 **Sjabloon**

```template
$title$nl$url
```

💬 **Uitvoer**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Markdown lijstitem

🛠 **Sjabloon**

```template
- [$title]($url)
```

💬 **Uitvoer**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 YouTube video-ID (alleen indien aanwezig)

🛠 **Sjabloon**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **Uitvoer**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

Als `v=` ontbreekt:

```output
Why the Moon?
https://example.com/page
```

### 4.4 Genereer YouTube thumbnail-URL

Gebaseerd op het bekende YouTube-thumbnailpatroon:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **Sjabloon**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **Uitvoer**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 Markdown-thumbnail insluiten

🛠 **Sjabloon**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Uitvoer**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Tijdstempel (indien beschikbaar)

🛠 **Sjabloon**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **Uitvoer**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 Multi-parameter voorwaardelijk

🛠 **Sjabloon**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Uitvoer**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Logformaat (domein + pad)

🛠 **Sjabloon**

```template
[$domain] $path$nl$url
```

💬 **Uitvoer**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Bestandsnaam-stijl kop

🛠 **Sjabloon**

```template
## $basename: $title$nl$url
```

💬 **Uitvoer**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Minimalistisch

🛠 **Sjabloon**

```template
$title — $url
```

💬 **Uitvoer**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Dagelijkse logvermelding

🛠 **Sjabloon**

```template
- [$title]($url) — $date $time
```

💬 **Uitvoer**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Meerdere regels met scheidingsteken

🛠 **Sjabloon**

```template
$title$nl$url$nl---$nl$domain
```

💬 **Uitvoer**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. Beperkingen

De aangepaste sjabloonfunctie blijft opzettelijk eenvoudig.

❌ De aangepaste sjabloonfunctie doet `NIET`:

* Pagina-inhoud of HTML-metadata parseren
* Metadata of thumbnails van de pagina lezen
* Willekeurige JavaScript in sjablonen uitvoeren
* OG-tags, auteurs of beschrijvingen extraheren
* Geneste voorwaarden of `else` ondersteunen

✔️ De aangepaste sjabloonfunctie gebruikt `ALLEEN`:

* Tabtitel
* URL-componenten
* Queryparameters
* Eenvoudige tokenvervanging
* Optionele voorwaardelijke blokken

Dit zorgt voor consistent gedrag op alle websites.

## 6. Versiecompatibiliteit

Deze functies zijn beschikbaar in: **SmartURLs v1.4.0 en later**

## 7. Feedback

Voor functieverzoeken of vragen kunt u een issue openen op GitHub:

<https://github.com/isshiki/SmartURLs/issues>
