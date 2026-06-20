# 📘 Guia de modelos SmartURLs (v1.4.0+)

Este guia explica como usar o recurso de modelo personalizado do SmartURLs.
Os modelos são escritos em um **campo de entrada de linha única**, mas podem produzir saída de várias linhas usando o token `$nl`.

O recurso de modelo personalizado é intencionalmente leve. Ele não lê o conteúdo da página nem metadados HTML, e funciona com a URL e as informações da guia do navegador.

## 1. Tokens básicos

O SmartURLs substitui tokens estritamente com base nos metadados da guia e na URL atual.

| Token          | Descrição                                                                                                                   | Exemplo de saída                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `$title`       | Título da página mostrado na guia                                                                                           | `Why the Moon?`                                                                         |
| `$title(html)` | Título de página com escape HTML (converte `&`, `<`, `>`, `"`, `'` em entidades). Seguro para uso em tags/atributos HTML. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(para título: "Rock & Roll \<Best Hits>")* |
| `$url`         | URL completa                                                                                                                | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                           |
| `$domain`    | Apenas nome do host               | `www.youtube.com`                             |
| `$path`      | Parte do caminho da URL           | `/watch`                                      |
| `$basename`  | Último segmento do caminho        | `watch`                                       |
| `$idx`       | Índice da guia (base 1)           | `3`                                           |
| `$date`      | Data local (YYYY-MM-DD)           | `2025-01-12`                                  |
| `$time`      | Hora local (HH:MM:SS)             | `14:03:55`                                    |
| `$date(utc)` | Data UTC                          | `2025-01-12`                                  |
| `$time(utc)` | Hora UTC                          | `05:03:55`                                    |
| `$nl`        | Insere uma quebra de linha        | *(produz quebras de linha na saída)*         |

> ⚠️ **Nota sobre `$nl`**: Suportado apenas em modelos personalizados de Copiar. Não pode ser usado em modelos personalizados de Abrir do texto. Se você deseja reutilizar o mesmo modelo para Copiar e Abrir, evite `$nl` no modelo de Abrir ou use o modo Inteligente (detecção automática).

> ⚠️ **Nota sobre `$title(html)`**: Suportado apenas em modelos personalizados de Copiar. Modelos personalizados de Abrir do texto não processam este token. Para modelos de Abrir, use `$title` em vez disso.

### Exemplo de URL e título usados acima

Para mostrar como os tokens se expandem, estes exemplos usam:

📘 **Título**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

Desta URL:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (parâmetro de consulta) → `bmC-FwibsZg`

Datas e horários são exemplos; a saída real depende do relógio do seu sistema.

## 2. Tokens de parâmetros de consulta

O SmartURLs pode extrair parâmetros de consulta diretamente da URL.

🔤 **Sintaxe**

```text
$<param>
```

🔗 **URL de exemplo**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Token | Saída         |
| ----- | ------------- |
| `$v`  | `bmC-FwibsZg` |
| `$t`  | `123`         |

Se um parâmetro não existir, seu valor se torna uma string vazia.

> ⚠️ **Nota sobre tokens de parâmetros de consulta**: Tokens de parâmetros de consulta (por exemplo, `$v`, `$id`, `$tag`, etc.) são avaliados apenas em modelos personalizados de Copiar. Eles não são avaliados em modelos personalizados de Abrir do texto, portanto não os use em modelos de Abrir.

## 3. Blocos condicionais

Os blocos condicionais permitem que os modelos produzam determinado texto **somente se parâmetros de consulta específicos estiverem presentes**.

🔤 **Sintaxe**

🔹 **Parâmetro único**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Múltiplos parâmetros (condição E)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

Dentro de um bloco condicional:

* `$v`, `$t`, etc. se expandem normalmente
* `$nl`, `$title`, `$domain` também funcionam
* Blocos aninhados não são permitidos
* Nenhum `else` está disponível

Se as condições não forem atendidas, o bloco inteiro é removido da saída.

> ⚠️ **Nota sobre blocos condicionais**: Blocos condicionais (por exemplo, `{{q=v: ...}}`) estão disponíveis apenas em modelos personalizados de Copiar. Eles não funcionam em modelos personalizados de Abrir do texto. Se você precisa de filtragem flexível ao abrir URLs, use o modo Inteligente (detecção automática).

## 4. Exemplos e padrões de modelos

Os modelos são escritos como *uma linha*, mas podem produzir várias linhas via `$nl`.

URL e título de exemplo usados nesta seção:

📘 **Título**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Título + URL

🛠 **Modelo**

```template
$title$nl$url
```

💬 **Saída**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Item de lista Markdown

🛠 **Modelo**

```template
- [$title]($url)
```

💬 **Saída**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 ID do vídeo do YouTube (somente se presente)

🛠 **Modelo**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **Saída**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

Se `v=` estiver faltando:

```output
Why the Moon?
https://example.com/page
```

### 4.4 Gerar URL da miniatura do YouTube

Baseado no padrão de miniatura conhecido do YouTube:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **Modelo**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **Saída**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 Incorporar miniatura do YouTube (Markdown)

🛠 **Modelo**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Saída**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Timestamp (se disponível)

🛠 **Modelo**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **Saída**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 Condicional multi-parâmetro

🛠 **Modelo**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Saída**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Formato de log (domínio + caminho)

🛠 **Modelo**

```template
[$domain] $path$nl$url
```

💬 **Saída**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Resumo estilo nome de arquivo

🛠 **Modelo**

```template
## $basename: $title$nl$url
```

💬 **Saída**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Minimalista

🛠 **Modelo**

```template
$title — $url
```

💬 **Saída**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Entrada de log diário

🛠 **Modelo**

```template
- [$title]($url) — $date $time
```

💬 **Saída**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Multilinha com separador

🛠 **Modelo**

```template
$title$nl$url$nl---$nl$domain
```

💬 **Saída**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. Limitações

O recurso de modelo personalizado permanece intencionalmente simples.

❌ O recurso de modelo personalizado `NÃO`:

* Analisa o conteúdo da página ou metadados HTML
* Lê metadados ou miniaturas da página
* Executa JavaScript arbitrário nos modelos
* Extrai tags OG, autores ou descrições
* Suporta condicionais aninhados ou `else`

✔️ O recurso de modelo personalizado usa `APENAS`:

* Título da guia
* Componentes de URL
* Parâmetros de consulta
* Substituição simples de tokens
* Blocos condicionais opcionais

Isso garante comportamento consistente em todos os sites.

## 6. Compatibilidade de versão

Estes recursos estão disponíveis em: **SmartURLs v1.4.0 e posterior**

## 7. Feedback

Para solicitações de recursos ou perguntas, por favor abra uma issue aqui:

<https://github.com/isshiki/SmartURLs/issues>
