# CMS Frontend

## Chạy local

```bash
npm install
npm start
```

Mặc định app chạy ở cổng `3030` theo file `.env`.

## Build production

```bash
npm run build
npx serve -s build -l 3030
```

## Public từ máy local ra Internet

Xem hướng dẫn đầy đủ tại:

- `docs/PUBLIC_LOCAL_DEPLOYMENT.md`
- `docs/API_CORS_AUTH_TEMPLATE.md`

Các file hỗ trợ triển khai tunnel:

- `scripts/cloudflared/config.example.yml`
- `scripts/cloudflared/install-service.sh`
- `scripts/cloudflared/setup-tunnel.sh`
- `.env.production.example`
