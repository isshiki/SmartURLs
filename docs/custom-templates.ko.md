# 📘 SmartURLs 템플릿 가이드 (v1.4.0+)

이 가이드는 SmartURLs의 커스텀 템플릿 기능 사용 방법을 설명합니다.
템플릿은 **한 줄 입력 필드**에 작성하지만, `$nl` 토큰을 사용하여 여러 줄 출력을 생성할 수 있습니다.

커스텀 템플릿 기능은 의도적으로 가볍습니다. 페이지 본문이나 HTML 메타데이터를 읽지 않으며, URL과 브라우저 탭 정보를 바탕으로 작동합니다.

## 1. 기본 토큰

SmartURLs는 탭 메타데이터와 현재 URL을 기반으로 토큰을 교체합니다.

| 토큰           | 설명                                                                                          | 출력 예시                                                                             |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `$title`       | 탭에 표시되는 페이지 제목                                                                     | `Why the Moon?`                                                                       |
| `$title(html)` | HTML 이스케이프된 페이지 제목 (`&`, `<`, `>`, `"`, `'`를 엔티티로 변환). HTML 태그/속성에서 안전하게 사용 가능. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(제목 예: "Rock & Roll \<Best Hits>")* |
| `$url`         | 전체 URL                                                                                      | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                         |
| `$domain`    | 호스트명만                     | `www.youtube.com`                             |
| `$path`      | URL의 경로 부분                | `/watch`                                      |
| `$basename`  | 경로의 마지막 세그먼트         | `watch`                                       |
| `$idx`       | 탭 인덱스 (1부터 시작)         | `3`                                           |
| `$date`      | 로컬 날짜 (YYYY-MM-DD)         | `2025-01-12`                                  |
| `$time`      | 로컬 시간 (HH:MM:SS)           | `14:03:55`                                    |
| `$date(utc)` | UTC 날짜                       | `2025-01-12`                                  |
| `$time(utc)` | UTC 시간                       | `05:03:55`                                    |
| `$nl`        | 줄 바꿈 삽입                   | *(출력에 줄 바꿈 생성)*                       |

> ⚠️ **`$nl`에 대한 참고 사항**: 복사 커스텀 템플릿에서만 지원됩니다. 텍스트에서 열기 커스텀 템플릿에서는 사용할 수 없습니다. 복사와 열기에 동일한 템플릿을 재사용하려면 열기 템플릿에서 `$nl`을 피하거나 스마트(자동 감지) 모드를 사용하세요.

> ⚠️ **`$title(html)`에 대한 참고 사항**: 복사 커스텀 템플릿에서만 지원됩니다. 텍스트에서 열기 커스텀 템플릿은 이 토큰을 처리하지 않습니다. 열기 템플릿의 경우 대신 `$title`을 사용하세요.

### 위에서 사용된 예시 URL 및 제목

토큰이 어떻게 확장되는지 보여주기 위해 다음 예시를 사용합니다:

📘 **제목**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

이 URL에서:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (쿼리 매개변수) → `bmC-FwibsZg`

날짜와 시간은 예시이며, 실제 출력은 시스템 시계에 따라 다릅니다.

## 2. 쿼리 매개변수 토큰

SmartURLs는 URL에서 직접 쿼리 매개변수를 추출할 수 있습니다.

🔤 **구문**

```text
$<param>
```

🔗 **URL 예시**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| 토큰 | 출력          |
| ---- | ------------- |
| `$v` | `bmC-FwibsZg` |
| `$t` | `123`         |

매개변수가 존재하지 않으면 그 값은 빈 문자열이 됩니다.

> ⚠️ **쿼리 매개변수 토큰에 대한 참고 사항**: 쿼리 매개변수 토큰(예: `$v`, `$id`, `$tag` 등)은 복사 커스텀 템플릿에서만 평가됩니다. 텍스트에서 열기 커스텀 템플릿에서는 평가되지 않으므로 열기 템플릿에서 사용하지 마세요.

## 3. 조건부 블록

조건부 블록을 사용하면 템플릿이 **특정 쿼리 매개변수가 존재할 때만** 특정 텍스트를 출력할 수 있습니다.

🔤 **구문**

🔹 **단일 매개변수**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **다중 매개변수 (AND 조건)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

조건부 블록 내에서:

* `$v`, `$t` 등은 정상적으로 확장됩니다
* `$nl`, `$title`, `$domain`도 작동합니다
* 중첩된 블록은 허용되지 않습니다
* `else`는 사용할 수 없습니다

조건이 충족되지 않으면 전체 블록이 출력에서 제거됩니다.

> ⚠️ **조건부 블록에 대한 참고 사항**: 조건부 블록(예: `{{q=v: ...}}`)은 복사 커스텀 템플릿에서만 사용할 수 있습니다. 텍스트에서 열기 커스텀 템플릿에서는 작동하지 않습니다. URL을 열 때 유연한 필터링이 필요한 경우 스마트(자동 감지) 모드를 사용하세요.

## 4. 템플릿 예시 및 패턴

템플릿은 *한 줄*로 작성되지만 `$nl`을 통해 여러 줄을 출력할 수 있습니다.

이 섹션에서 사용되는 예시 URL과 제목:

📘 **제목**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: 제목 + URL

🛠 **템플릿**

```template
$title$nl$url
```

💬 **출력**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Markdown 리스트 항목

🛠 **템플릿**

```template
- [$title]($url)
```

💬 **출력**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 YouTube 동영상 ID (존재할 때만)

🛠 **템플릿**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **출력**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

`v=`가 없으면:

```output
Why the Moon?
https://example.com/page
```

### 4.4 YouTube 썸네일 URL 생성

알려진 YouTube 썸네일 패턴 기반:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **템플릿**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **출력**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 YouTube 썸네일 삽입 (Markdown)

🛠 **템플릿**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **출력**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 타임스탬프 (가능한 경우)

🛠 **템플릿**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **출력**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 다중 매개변수 조건

🛠 **템플릿**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **출력**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 로그 형식 (도메인 + 경로)

🛠 **템플릿**

```template
[$domain] $path$nl$url
```

💬 **출력**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 파일 이름 스타일 제목

🛠 **템플릿**

```template
## $basename: $title$nl$url
```

💬 **출력**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 미니멀리스트

🛠 **템플릿**

```template
$title — $url
```

💬 **출력**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 일일 로그 항목

🛠 **템플릿**

```template
- [$title]($url) — $date $time
```

💬 **출력**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 구분자가 있는 여러 줄

🛠 **템플릿**

```template
$title$nl$url$nl---$nl$domain
```

💬 **출력**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. 제한사항

커스텀 템플릿 기능은 의도적으로 단순하게 유지됩니다.

❌ 커스텀 템플릿 기능이 `하지 않는 것`:

* 페이지 본문이나 HTML 메타데이터 구문 분석
* 페이지의 메타데이터 또는 썸네일 읽기
* 템플릿에서 임의의 JavaScript 실행
* OG 태그, 작성자 또는 설명 추출
* 중첩된 조건 또는 `else` 지원

✔️ 커스텀 템플릿 기능이 `오직 사용하는 것`:

* 탭 제목
* URL 구성 요소
* 쿼리 매개변수
* 단순 토큰 교체
* 선택적 조건부 블록

이것은 모든 웹사이트에서 일관된 동작을 보장합니다.

## 6. 버전 호환성

이 기능은 다음에서 사용할 수 있습니다: **SmartURLs v1.4.0 이상**

## 7. 피드백

기능 요청이나 질문이 있으면 여기에서 이슈를 열어주세요:

<https://github.com/isshiki/SmartURLs/issues>
