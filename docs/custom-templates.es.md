# 📘 Guía de plantillas de SmartURLs (v1.4.0+)

Esta guía explica cómo usar la función de plantilla personalizada de SmartURLs.
Las plantillas se escriben en un **campo de entrada de una sola línea**, pero pueden producir salida de varias líneas usando el token `$nl`.

La función de plantilla personalizada es intencionalmente ligera. No lee el contenido del cuerpo de la página ni metadatos HTML, y funciona con la URL y la información de la pestaña del navegador.

## 1. Tokens básicos

SmartURLs reemplaza tokens basándose estrictamente en los metadatos de la pestaña y la URL actual.

| Token          | Descripción                                                                                                               | Ejemplo de salida                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `$title`       | Título de la página en la pestaña                                                                                         | `Why the Moon?`                                                                        |
| `$title(html)` | Título de página con escape HTML (convierte `&`, `<`, `>`, `"`, `'` a entidades). Seguro para usar en etiquetas/atributos HTML. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(para título: "Rock & Roll \<Best Hits>")* |
| `$url`         | URL completa                                                                                                              | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                          |
| `$domain`    | Solo nombre de host              | `www.youtube.com`                             |
| `$path`      | Parte de ruta de la URL          | `/watch`                                      |
| `$basename`  | Último segmento de la ruta       | `watch`                                       |
| `$idx`       | Índice de pestaña (base 1)       | `3`                                           |
| `$date`      | Fecha local (YYYY-MM-DD)         | `2025-01-12`                                  |
| `$time`      | Hora local (HH:MM:SS)            | `14:03:55`                                    |
| `$date(utc)` | Fecha UTC                        | `2025-01-12`                                  |
| `$time(utc)` | Hora UTC                         | `05:03:55`                                    |
| `$nl`        | Inserta un salto de línea        | *(produce saltos de línea en la salida)*     |

> ⚠️ **Nota sobre `$nl`**: Solo compatible con plantillas personalizadas de Copiar. No se puede usar en plantillas personalizadas de Abrir desde texto. Si desea reutilizar la misma plantilla tanto para Copiar como para Abrir, evite `$nl` en la plantilla de Abrir o use el modo Inteligente (detección automática) en su lugar.

> ⚠️ **Nota sobre `$title(html)`**: Solo compatible con plantillas personalizadas de Copiar. Las plantillas personalizadas de Abrir desde texto no procesan este token. Para plantillas de Abrir, use `$title` en su lugar.

### Ejemplo de URL y título usados arriba

Para mostrar cómo se expanden los tokens, estos ejemplos usan:

📘 **Título**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

De esta URL:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (parámetro de consulta) → `bmC-FwibsZg`

Las fechas y horas son ejemplos; la salida real depende del reloj de su sistema.

## 2. Tokens de parámetros de consulta

SmartURLs puede extraer parámetros de consulta directamente de la URL.

🔤 **Sintaxis**

```text
$<param>
```

🔗 **Ejemplo de URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Token | Salida        |
| ----- | ------------- |
| `$v`  | `bmC-FwibsZg` |
| `$t`  | `123`         |

Si un parámetro no existe, su valor se convierte en una cadena vacía.

> ⚠️ **Nota sobre tokens de parámetros de consulta**: Los tokens de parámetros de consulta (por ejemplo `$v`, `$id`, `$tag`, etc.) se evalúan solo en plantillas personalizadas de Copiar. No se evalúan en plantillas personalizadas de Abrir desde texto, por lo que no los use en plantillas de Abrir.

## 3. Bloques condicionales

Los bloques condicionales permiten que las plantillas generen cierto texto **solo si están presentes parámetros de consulta específicos**.

🔤 **Sintaxis**

🔹 **Parámetro único**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Múltiples parámetros (condición Y)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

Dentro de un bloque condicional:

* `$v`, `$t`, etc. se expanden normalmente
* `$nl`, `$title`, `$domain` también funcionan
* No se permiten bloques anidados
* No hay `else` disponible

Si no se cumplen las condiciones, el bloque completo se elimina de la salida.

> ⚠️ **Nota sobre bloques condicionales**: Los bloques condicionales (por ejemplo `{{q=v: ...}}`) están disponibles solo en plantillas personalizadas de Copiar. No funcionan en plantillas personalizadas de Abrir desde texto. Si necesita filtrado flexible al abrir URL, use el modo Inteligente (detección automática) en su lugar.

## 4. Ejemplos de plantillas y patrones

Las plantillas se escriben como *una línea*, pero pueden generar múltiples líneas a través de `$nl`.

Ejemplo de URL y título usados en esta sección:

📘 **Título**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Título + URL

🛠 **Plantilla**

```template
$title$nl$url
```

💬 **Salida**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Elemento de lista Markdown

🛠 **Plantilla**

```template
- [$title]($url)
```

💬 **Salida**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 ID de video de YouTube (solo si está presente)

🛠 **Plantilla**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **Salida**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

Si falta `v=`:

```output
Why the Moon?
https://example.com/page
```

### 4.4 Generar URL de miniatura de YouTube

Basado en el patrón conocido de miniaturas de YouTube:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **Plantilla**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **Salida**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 Incrustar miniatura de YouTube (Markdown)

🛠 **Plantilla**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Salida**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Marca de tiempo (si está disponible)

🛠 **Plantilla**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **Salida**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 Condicional de múltiples parámetros

🛠 **Plantilla**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Salida**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Formato de registro (dominio + ruta)

🛠 **Plantilla**

```template
[$domain] $path$nl$url
```

💬 **Salida**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Encabezado estilo nombre de archivo

🛠 **Plantilla**

```template
## $basename: $title$nl$url
```

💬 **Salida**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Minimalista

🛠 **Plantilla**

```template
$title — $url
```

💬 **Salida**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Entrada de registro diaria

🛠 **Plantilla**

```template
- [$title]($url) — $date $time
```

💬 **Salida**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Multilínea con separador

🛠 **Plantilla**

```template
$title$nl$url$nl---$nl$domain
```

💬 **Salida**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. Limitaciones

La función de plantilla personalizada se mantiene intencionalmente simple.

❌ La función de plantilla personalizada `NO`:

* Analiza el contenido del cuerpo de la página o metadatos HTML
* Lee metadatos o miniaturas desde la página
* Ejecuta JavaScript arbitrario en las plantillas
* Extrae etiquetas OG, autores o descripciones
* Soporta condicionales anidados o `else`

✔️ La función de plantilla personalizada `SOLO` usa:

* Título de la pestaña
* Componentes de URL
* Parámetros de consulta
* Reemplazo simple de tokens
* Bloques condicionales opcionales

Esto asegura un comportamiento consistente en todos los sitios web.

## 6. Compatibilidad de versiones

Estas funciones están disponibles en: **SmartURLs v1.4.0 y posterior**

## 7. Comentarios

Para solicitudes de funciones o preguntas, abra un issue aquí:

<https://github.com/isshiki/SmartURLs/issues>
