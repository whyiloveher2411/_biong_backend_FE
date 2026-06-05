# Cấu hình Cloudflare không cache cho domain local

Áp dụng cho:

- `local-cms.spacedev.vn`
- `local-api.spacedev.vn`

Mục tiêu: luôn lấy nội dung mới nhất từ máy local qua tunnel, tránh bị giữ bundle/API cũ.

## 1) Tự động bằng script (khuyến nghị)

1. Copy token mẫu:

```bash
cp .env.cloudflare.example .env.cloudflare
```

2. Điền `CLOUDFLARE_API_TOKEN` trong `.env.cloudflare`

3. Chạy:

```bash
bash scripts/cloudflared/setup-cache-bypass.sh
```

Script sẽ:

- tạo/cập nhật Cache Rule bypass cho `local-cms.spacedev.vn` và `local-api.spacedev.vn`
- purge toàn bộ cache zone một lần
- chạy lại `check-cache-status.sh` để xác nhận

## 2) Tạo Cache Rule thủ công trên Dashboard

Trong Cloudflare Dashboard:

1. Chọn zone `spacedev.vn`
2. Vào `Rules` -> `Cache Rules` -> `Create rule`
3. Tạo rule với expression:

```txt
(http.host eq "local-cms.spacedev.vn" or http.host eq "local-api.spacedev.vn")
```

4. Action:
   - `Cache eligibility` -> `Bypass cache`
5. Save + Deploy

Lưu ý: đặt rule này ở vị trí ưu tiên cao hơn các cache rule khác.

## 3) Purge cache sau khi tạo rule

Sau khi rule được apply, purge một lần để xóa cache cũ:

- `Caching` -> `Purge Cache` -> `Purge Everything`

Hoặc purge theo URL cụ thể của bundle/API nếu bạn muốn hạn chế phạm vi.

## 4) Kiểm tra đã bypass cache hay chưa

Chạy script:

```bash
bash scripts/cloudflared/check-cache-status.sh
```

Kỳ vọng:

- `cf-cache-status` không còn `HIT` cho 2 hostname local
- thường sẽ là `DYNAMIC` hoặc `BYPASS`

## 5) Header chống cache ở origin (đã cấu hình)

Dev server CMS đã set header chống cache qua `craco.config.js`:

```txt
Cache-Control: no-store, no-cache, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

Nếu backend/frontend khác cũng tự set header, nên dùng cùng bộ header:

Nếu backend/frontend của bạn tự set header, nên cấu hình:

```txt
Cache-Control: no-store, no-cache, must-revalidate, max-age=0
Pragma: no-cache
Expires: 0
```

Phần này không thay thế Cache Rule, nhưng giúp tránh cache ở nhiều lớp.
