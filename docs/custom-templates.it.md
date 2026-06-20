# 📘 Guida ai modelli SmartURLs (v1.4.0+)

Questa guida spiega come utilizzare la funzione modello personalizzato di SmartURLs.
I modelli sono scritti in un **campo di input a riga singola**, ma possono produrre output su più righe usando il token `$nl`.

La funzione modello personalizzato è intenzionalmente leggera. Non legge il contenuto della pagina o i metadati HTML e funziona con l'URL e le informazioni della scheda del browser.

## 1. Token di base

SmartURLs sostituisce i token basandosi strettamente sui metadati della scheda e sull'URL corrente.

| Token          | Descrizione                                                                                                                  | Esempio di output                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `$title`       | Titolo della pagina nella scheda                                                                                             | `Why the Moon?`                                                                         |
| `$title(html)` | Titolo di pagina con escape HTML (converte `&`, `<`, `>`, `"`, `'` in entità). Sicuro per tag/attributi HTML. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(per titolo: "Rock & Roll \<Best Hits>")* |
| `$url`         | URL completo                                                                                                                 | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                           |
| `$domain`    | Solo hostname                    | `www.youtube.com`                             |
| `$path`      | Parte del percorso dell'URL      | `/watch`                                      |
| `$basename`  | Ultimo segmento del percorso     | `watch`                                       |
| `$idx`       | Indice scheda (base 1)           | `3`                                           |
| `$date`      | Data locale (YYYY-MM-DD)         | `2025-01-12`                                  |
| `$time`      | Ora locale (HH:MM:SS)            | `14:03:55`                                    |
| `$date(utc)` | Data UTC                         | `2025-01-12`                                  |
| `$time(utc)` | Ora UTC                          | `05:03:55`                                    |
| `$nl`        | Inserisce un'interruzione di riga| *(produce interruzioni di riga nell'output)*  |

> ⚠️ **Nota su `$nl`**: Supportato solo nei modelli personalizzati di Copia. Non può essere utilizzato nei modelli personalizzati Apri da testo. Se si desidera riutilizzare lo stesso modello sia per Copia che per Apri, evitare `$nl` nel modello di apertura o utilizzare la modalità Intelligente (rilevamento automatico) invece.

> ⚠️ **Nota su `$title(html)`**: Supportato solo nei modelli personalizzati di Copia. I modelli personalizzati Apri da testo non elaborano questo token. Per i modelli di apertura, utilizzare invece `$title`.

### Esempio di URL e titolo usati sopra

Per mostrare come i token si espandono, questi esempi usano:

📘 **Titolo**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

Da questo URL:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (parametro query) → `bmC-FwibsZg`

Date e ore sono esempi; l'output effettivo dipende dall'orologio del sistema.

## 2. Token dei parametri query

SmartURLs può estrarre i parametri query direttamente dall'URL.

🔤 **Sintassi**

```text
$<param>
```

📄 **Esempio**

URL:

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Token | Output        |
| -- | - |
| `$v`  | `bmC-FwibsZg` |
| `$t`  | `123`         |

Se un parametro non esiste, il suo valore diventa una stringa vuota.

> ⚠️ **Nota sui token dei parametri query**: I token dei parametri query (ad esempio `$v`, `$id`, `$tag`, ecc.) vengono valutati solo nei modelli personalizzati di Copia. Non vengono valutati nei modelli personalizzati Apri da testo, quindi non utilizzarli nei modelli di apertura.

## 3. Blocchi condizionali

I blocchi condizionali consentono ai modelli di produrre determinati testi **solo se sono presenti parametri query specifici**.

🔤 **Sintassi**

🔹 **Parametro singolo**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Parametri multipli (condizione AND)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

All'interno di un blocco condizionale:

* `$v`, `$t`, ecc. si espandono normalmente
* `$nl`, `$title`, `$domain` funzionano anche
* I blocchi annidati non sono consentiti
* Non è disponibile `else`

Se le condizioni non sono soddisfatte, l'intero blocco viene rimosso dall'output.

> ⚠️ **Nota sui blocchi condizionali**: I blocchi condizionali (ad esempio `{{q=v: ...}}`) sono disponibili solo nei modelli personalizzati di Copia. Non funzionano nei modelli personalizzati Apri da testo. Se è necessario un filtro flessibile durante l'apertura di URL, utilizzare la modalità Intelligente (rilevamento automatico) invece.

## 4. Esempi di modelli e modelli pratici

I modelli sono scritti come *una riga*, ma possono produrre più righe tramite `$nl`.

Esempio di URL e titolo usati in questa sezione:

📘 **Titolo**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Titolo + URL

🛠 **Modello**

```template
$title$nl$url
```

💬 **Output**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Elemento elenco Markdown

🛠 **Modello**

```template
- [$title]($url)
```

💬 **Output**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 ID video YouTube (solo se presente)

🛠 **Modello**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **Output**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

Se `v=` manca:

```output
Why the Moon?
https://example.com/page
```

### 4.4 Genera URL miniatura YouTube

Basato sul modello di miniatura YouTube noto:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **Modello**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **Output**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 Incorpora miniatura YouTube (Markdown)

🛠 **Modello**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Output**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Timestamp (se disponibile)

🛠 **Modello**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **Output**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 Condizionale multi-parametro

🛠 **Modello**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Output**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Formato log (dominio + percorso)

🛠 **Modello**

```template
[$domain] $path$nl$url
```

💬 **Output**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Intestazione stile nome file

🛠 **Modello**

```template
## $basename: $title$nl$url
```

💬 **Output**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Minimalista

🛠 **Modello**

```template
$title — $url
```

💬 **Output**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Voce log giornaliera

🛠 **Modello**

```template
- [$title]($url) — $date $time
```

💬 **Output**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Multi-riga con separatore

🛠 **Modello**

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

## 5. Limitazioni

La funzione modello personalizzato rimane intenzionalmente semplice.

❌ La funzione modello personalizzato `NON`:

* Analizza il contenuto della pagina o i metadati HTML
* Legge metadati o miniature dalla pagina
* Esegue JavaScript arbitrario nei modelli
* Estrae tag OG, autori o descrizioni
* Supporta condizionali annidati o `else`

✔️ La funzione modello personalizzato usa `SOLO`:

* Titolo della scheda
* Componenti URL
* Parametri query
* Semplice sostituzione di token
* Blocchi condizionali opzionali

Questo garantisce un comportamento coerente su tutti i siti web.

## 6. Compatibilità versione

Queste funzionalità sono disponibili in: **SmartURLs v1.4.0 e successive**

## 7. Feedback

Per richieste di funzionalità o domande, apri un issue su GitHub:

<https://github.com/isshiki/SmartURLs/issues>
