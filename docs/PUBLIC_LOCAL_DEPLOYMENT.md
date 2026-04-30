# Public CMS từ máy local (ít lỗi)

Tài liệu này triển khai đúng mô hình:

- CMS chạy local và public qua `cms.<domain>`
- API chạy local và public qua `api.<domain>`
- Không cần mở port router

## 1) Xác nhận cổng local

Dự án hiện tại đang dùng:

- CMS: `http://127.0.0.1:3030` (`PORT=3030` trong `.env`)
- API: `http://127.0.0.1:9999` (`REACT_APP_HOST_API_KEY=http://localhost:9999`)

Kiểm tra nhanh:

```bash
open http://127.0.0.1:3030
curl -I http://127.0.0.1:9999
```

## 2) Chuẩn bị domain trên Cloudflare

Do bạn không can thiệp được router, bắt buộc dùng outbound tunnel.

1. Tạo tài khoản Cloudflare
2. Chuyển DNS domain sang Cloudflare (đổi nameserver tại nơi mua domain)
3. Chờ DNS propagate hoàn tất

### Hướng dẫn trỏ domain về Cloudflare (từ nhà cung cấp DNS hiện tại)

1. Thêm domain vào Cloudflare dashboard (`Add a Site`)
2. Cloudflare sẽ cấp 2 nameserver mới (vd `abby.ns.cloudflare.com`, `mike.ns.cloudflare.com`)
3. Vào trang quản lý domain nơi bạn mua domain (GoDaddy/Namecheap/...):
   - Tìm phần `Nameserver`
   - Chọn `Custom nameserver`
   - Thay nameserver cũ bằng 2 nameserver Cloudflare
4. Lưu thay đổi, chờ propagate từ 5 phút đến 24 giờ (thường 15-60 phút)
5. Xác nhận domain đã về Cloudflare:

```bash
dig NS <domain> +short
```

Nếu kết quả trả về nameserver Cloudflare là thành công.

## 3) Tạo Cloudflare Tunnel

### Cài cloudflared

```bash
brew install cloudflared
```

### Login + tạo tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create cms-local
```

Lệnh tạo tunnel sẽ in ra `TUNNEL_ID`.

### Cấu hình ingress cho CMS/API

1. Copy file mẫu:

```bash
mkdir -p ~/.cloudflared
cp scripts/cloudflared/config.example.yml ~/.cloudflared/config.yml
```

2. Sửa `~/.cloudflared/config.yml`:
- `tunnel: <TUNNEL_ID>`
- `credentials-file: ~/.cloudflared/<TUNNEL_ID>.json`
- `hostname` đúng domain thật:
  - `cms.yourdomain.com`
  - `api.yourdomain.com`

3. Tạo DNS route:

```bash
cloudflared tunnel route dns cms-local cms.yourdomain.com
cloudflared tunnel route dns cms-local api.yourdomain.com
```

### Tùy chọn làm nhanh bằng script tự động

```bash
bash scripts/cloudflared/setup-tunnel.sh
```

Script sẽ:
- login Cloudflare
- tạo tunnel
- sinh `~/.cloudflared/config.yml`
- tạo DNS route cho `cms.<domain>` và `api.<domain>`
- cài service cloudflared

### Chạy tunnel như service

```bash
bash scripts/cloudflared/install-service.sh
```

Hoặc chạy foreground để debug:

```bash
cloudflared tunnel run cms-local
```

## 4) Cấu hình env cho CMS

1. Tạo file production env:

```bash
cp .env.production.example .env.production
```

2. Sửa `.env.production`:
- `REACT_APP_HOST_API_KEY=https://api.<domain>`
- `REACT_APP_BASE_URL=https://api.<domain>`
- `REACT_APP_BASENAME=admin` (giữ nguyên nếu CMS nằm ở `/admin`)

## 5) Build và chạy CMS ổn định

```bash
npm run build
npx serve -s build -l 3030
```

Khuyến nghị chạy bằng process manager (pm2) để auto-restart:

```bash
pm2 start "npx serve -s build -l 3030" --name cms-frontend
pm2 save
```

## 6) CORS/Auth ở API (bắt buộc)

API phải cho phép origin của CMS, không dùng wildcard khi có auth:

- `Access-Control-Allow-Origin: https://cms.<domain>`
- `Access-Control-Allow-Credentials: true` (nếu dùng cookie/session)
- `Allow-Methods`: `GET,POST,PUT,PATCH,DELETE,OPTIONS`
- `Allow-Headers`: `Content-Type,Authorization,X-Requested-With`

Cookie cross-site:

- `Secure=true`
- `SameSite=None`
- Domain cookie phù hợp (thường để host-only là an toàn nhất ban đầu)

Nếu dùng Bearer token (localStorage), vẫn cần CORS chuẩn cho `Authorization`.

## 7) Checklist go-live

- Truy cập được `https://cms.<domain>`
- Login thành công
- CMS gọi API không lỗi CORS
- Upload file thành công
- Refresh trực tiếp route không bị 404
- Restart máy local xong tunnel + CMS tự lên lại

## 8) Lệnh chẩn đoán nhanh

```bash
cloudflared tunnel list
cloudflared tunnel info cms-local
curl -I https://cms.<domain>
curl -I https://api.<domain>
```

Script vận hành nhanh:

```bash
bash scripts/ops/cms-stack.sh start
bash scripts/ops/cms-stack.sh status
bash scripts/ops/cms-stack.sh restart
bash scripts/ops/cms-stack.sh stop
```

Nếu lỗi 502:

- Kiểm tra app local còn chạy ở đúng port `3030/9999`
- Kiểm tra `~/.cloudflared/config.yml` map đúng service URL
- Kiểm tra service `cloudflared` đang chạy
