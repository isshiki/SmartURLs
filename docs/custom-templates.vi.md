# 📘 Hướng dẫn mẫu SmartURLs (v1.4.0+)

Hướng dẫn này giải thích cách sử dụng tính năng mẫu tùy chỉnh của SmartURLs.
Các mẫu được viết trong **trường nhập một dòng**, nhưng có thể tạo ra đầu ra nhiều dòng bằng cách sử dụng token `$nl`.

Tính năng mẫu tùy chỉnh cố tình nhẹ. Tính năng này không đọc nội dung trang hoặc siêu dữ liệu HTML, và hoạt động với URL cùng thông tin tab trình duyệt.

## 1. Token cơ bản

SmartURLs thay thế token dựa trên siêu dữ liệu tab và URL hiện tại.

| Token          | Mô tả                                                                                                                      | Ví dụ đầu ra                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `$title`       | Tiêu đề trang hiển thị trong tab                                                                                          | `Why the Moon?`                                                                         |
| `$title(html)` | Tiêu đề trang được escape HTML (chuyển đổi `&`, `<`, `>`, `"`, `'` thành thực thể). An toàn cho thẻ/thuộc tính HTML. | `Rock &amp; Roll &lt;Best Hits&gt;`<br>*(cho tiêu đề: "Rock & Roll \<Best Hits>")* |
| `$url`         | URL đầy đủ                                                                                                                 | `https://www.youtube.com/watch?v=bmC-FwibsZg`                                           |
| `$domain`    | Chỉ tên máy chủ                   | `www.youtube.com`                             |
| `$path`      | Phần đường dẫn của URL            | `/watch`                                      |
| `$basename`  | Phân đoạn cuối cùng của đường dẫn | `watch`                                       |
| `$idx`       | Chỉ số tab (bắt đầu từ 1)        | `3`                                           |
| `$date`      | Ngày địa phương (YYYY-MM-DD)      | `2025-01-12`                                  |
| `$time`      | Giờ địa phương (HH:MM:SS)         | `14:03:55`                                    |
| `$date(utc)` | Ngày UTC                          | `2025-01-12`                                  |
| `$time(utc)` | Giờ UTC                           | `05:03:55`                                    |
| `$nl`        | Chèn dòng mới                     | *(tạo ngắt dòng trong đầu ra)*               |

> ⚠️ **Lưu ý về `$nl`**: Chỉ được hỗ trợ trong các mẫu tùy chỉnh Sao chép. Không thể sử dụng trong các mẫu tùy chỉnh Mở từ văn bản. Nếu bạn muốn tái sử dụng cùng một mẫu cho cả Sao chép và Mở, hãy tránh `$nl` trong mẫu mở hoặc sử dụng chế độ Thông minh (tự động phát hiện) thay thế.

> ⚠️ **Lưu ý về `$title(html)`**: Chỉ được hỗ trợ trong các mẫu tùy chỉnh Sao chép. Các mẫu tùy chỉnh Mở từ văn bản không xử lý token này. Đối với các mẫu mở, hãy sử dụng `$title` thay thế.

### Ví dụ URL và Tiêu đề được sử dụng ở trên

Để cho thấy cách token mở rộng, các ví dụ này sử dụng:

📘 **Tiêu đề**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg
```

Từ URL này:

* `$domain` → `www.youtube.com`
* `$path` → `/watch`
* `$basename` → `watch`
* `$v` (tham số truy vấn) → `bmC-FwibsZg`

Ngày và giờ là ví dụ; đầu ra thực tế phụ thuộc vào đồng hồ hệ thống của bạn.

## 2. Token tham số truy vấn

SmartURLs có thể trích xuất tham số truy vấn trực tiếp từ URL.

🔤 **Cú pháp**

```text
$<param>
```

📄 **Ví dụ**

URL:

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

| Token | Đầu ra        |
| ----- | ------------- |
| `$v`  | `bmC-FwibsZg` |
| `$t`  | `123`         |

Nếu tham số không tồn tại, giá trị của nó trở thành chuỗi rỗng.

> ⚠️ **Lưu ý về token tham số truy vấn**: Các token tham số truy vấn (ví dụ `$v`, `$id`, `$tag`, v.v.) chỉ được đánh giá trong các mẫu tùy chỉnh Sao chép. Chúng không được đánh giá trong các mẫu tùy chỉnh Mở từ văn bản, vì vậy đừng sử dụng chúng trong các mẫu mở.

## 3. Khối có điều kiện

Các khối có điều kiện cho phép mẫu xuất ra văn bản nhất định **chỉ khi có các tham số truy vấn cụ thể**.

🔤 **Cú pháp**

🔹 **Tham số đơn**

```text
{% raw %}{{q=v: ... }}{% endraw %}
```

🔸 **Nhiều tham số (điều kiện VÀ)**

```text
{% raw %}{{q=v,t: ... }}{% endraw %}
```

Bên trong khối có điều kiện:

* `$v`, `$t`, v.v. mở rộng bình thường
* `$nl`, `$title`, `$domain` cũng hoạt động
* Không cho phép khối lồng nhau
* Không có `else`

Nếu điều kiện không được đáp ứng, toàn bộ khối sẽ bị xóa khỏi đầu ra.

> ⚠️ **Lưu ý về khối có điều kiện**: Các khối có điều kiện (ví dụ `{{q=v: ...}}`) chỉ có sẵn trong các mẫu tùy chỉnh Sao chép. Chúng không hoạt động trong các mẫu tùy chỉnh Mở từ văn bản. Nếu bạn cần lọc linh hoạt khi mở URL, hãy sử dụng chế độ Thông minh (tự động phát hiện) thay thế.

## 4. Ví dụ về mẫu và mẫu thực tế

Các mẫu được viết dưới dạng *một dòng*, nhưng có thể xuất ra nhiều dòng thông qua `$nl`.

Ví dụ URL và tiêu đề được sử dụng trong phần này:

📘 **Tiêu đề**

```text
Why the Moon?
```

🔗 **URL**

```text
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.1 Markdown: Tiêu đề + URL

🛠 **Mẫu**

```template
$title$nl$url
```

💬 **Đầu ra**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.2 Mục danh sách Markdown

🛠 **Mẫu**

```template
- [$title]($url)
```

💬 **Đầu ra**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.3 ID video YouTube (chỉ khi có)

🛠 **Mẫu**

```template
{% raw %}{{q=v:Video ID: $v$nl}}{% endraw %}$title$nl$url
```

💬 **Đầu ra**

```output
Video ID: bmC-FwibsZg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

Nếu thiếu `v=`:

```output
Why the Moon?
https://example.com/page
```

### 4.4 Tạo URL hình thu nhỏ YouTube

Dựa trên mẫu hình thu nhỏ YouTube đã biết:

```text
https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
```

🛠 **Mẫu**

```template
{% raw %}{{q=v:Thumbnail: https://img.youtube.com/vi/$v/maxresdefault.jpg$nl}}{% endraw %}$title$nl$url
```

💬 **Đầu ra**

```output
Thumbnail: https://img.youtube.com/vi/bmC-FwibsZg/maxresdefault.jpg
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.5 Nhúng hình thu nhỏ YouTube (Markdown)

🛠 **Mẫu**

```template
{% raw %}{{q=v:![thumb](https://img.youtube.com/vi/$v/mqdefault.jpg)$nl}}{% endraw %}[$title]($url)
```

💬 **Đầu ra**

```output
![thumb](https://img.youtube.com/vi/bmC-FwibsZg/mqdefault.jpg)
[Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123)
```

### 4.6 Dấu thời gian (nếu có)

🛠 **Mẫu**

```template
{% raw %}{{q=t:Timestamp: $t sec$nl}}{% endraw %}$title$nl$url
```

💬 **Đầu ra**

```output
Timestamp: 123 sec
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.7 Điều kiện đa tham số

🛠 **Mẫu**

```template
{% raw %}{{q=v,t:Video: $v ($t sec)$nl}}{% endraw %}$url
```

💬 **Đầu ra**

```output
Video: bmC-FwibsZg (123 sec)
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.8 Định dạng nhật ký (tên miền + đường dẫn)

🛠 **Mẫu**

```template
[$domain] $path$nl$url
```

💬 **Đầu ra**

```output
[www.youtube.com] /watch
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.9 Tiêu đề kiểu tên tệp

🛠 **Mẫu**

```template
## $basename: $title$nl$url
```

💬 **Đầu ra**

```output
## watch: Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.10 Tối giản

🛠 **Mẫu**

```template
$title — $url
```

💬 **Đầu ra**

```output
Why the Moon? — https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
```

### 4.11 Mục nhật ký hàng ngày

🛠 **Mẫu**

```template
- [$title]($url) — $date $time
```

💬 **Đầu ra**

```output
- [Why the Moon?](https://www.youtube.com/watch?v=bmC-FwibsZg&t=123) — 2025-01-12 14:03:55
```

### 4.12 Nhiều dòng với dấu phân cách

🛠 **Mẫu**

```template
$title$nl$url$nl---$nl$domain
```

💬 **Đầu ra**

```output
Why the Moon?
https://www.youtube.com/watch?v=bmC-FwibsZg&t=123
---
www.youtube.com
```

## 5. Giới hạn

Tính năng mẫu tùy chỉnh cố tình giữ đơn giản.

❌ Tính năng mẫu tùy chỉnh `KHÔNG`:

* Phân tích nội dung trang hoặc siêu dữ liệu HTML
* Đọc siêu dữ liệu hoặc hình thu nhỏ từ trang
* Thực thi JavaScript tùy ý trong mẫu
* Trích xuất thẻ OG, tác giả hoặc mô tả
* Hỗ trợ điều kiện lồng nhau hoặc `else`

✔️ Tính năng mẫu tùy chỉnh `CHỈ` sử dụng:

* Tiêu đề tab
* Thành phần URL
* Tham số truy vấn
* Thay thế token đơn giản
* Khối có điều kiện tùy chọn

Điều này đảm bảo hành vi nhất quán trên tất cả các trang web.

## 6. Khả năng tương thích phiên bản

Các tính năng này có sẵn trong: **SmartURLs v1.4.0 trở lên**

## 7. Phản hồi

Đối với yêu cầu tính năng hoặc câu hỏi, vui lòng mở issue trên GitHub:

<https://github.com/isshiki/SmartURLs/issues>
