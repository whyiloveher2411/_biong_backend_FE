# Mẫu cấu hình CORS/Auth cho API (CMS khác domain)

Áp dụng khi:

- CMS: `https://cms.yourdomain.com`
- API: `https://api.yourdomain.com`

## Nguyên tắc

- Không dùng `*` cho `Access-Control-Allow-Origin` nếu có cookie hoặc header `Authorization`.
- Chỉ whitelist domain CMS thật.

## Ví dụ Node.js (Express)

```js
import cors from "cors";

app.use(cors({
  origin: ["https://cms.yourdomain.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
```

Nếu dùng cookie session:

```js
res.cookie("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
});
```

## Ví dụ Laravel

Trong `config/cors.php`:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => ['https://cms.yourdomain.com'],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

Nếu dùng Sanctum/session cross-domain, cần kiểm tra thêm:

- `SESSION_SECURE_COOKIE=true`
- `SESSION_SAME_SITE=none`
- Danh sách domain trusted/stateful đúng môi trường.
