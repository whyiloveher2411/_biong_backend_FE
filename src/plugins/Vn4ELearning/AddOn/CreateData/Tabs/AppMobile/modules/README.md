# Modules Management System

Hệ thống quản lý modules cho ứng dụng e-learning với giao diện tab dọc dễ sử dụng.

## Cấu trúc

```
modules/
├── GamificationModule.tsx    # Module gamification
├── NotificationModule.tsx    # Module thông báo
├── AnalyticsModule.tsx       # Module phân tích
├── SocialModule.tsx          # Module xã hội
├── modulesConfig.tsx         # Cấu hình modules
└── README.md                # Tài liệu này
```

## Các Module hiện có

### 1. Gamification Module (🎮)
- **Chức năng**: Hệ thống điểm, huy hiệu và bảng xếp hạng
- **Tính năng**:
  - Cấu hình điểm cho bài học, quiz, bài tập
  - Hệ thống huy hiệu
  - Bảng xếp hạng
  - Phần thưởng chuỗi học tập
  - Thử thách hàng ngày

### 2. Notification Module (🔔)
- **Chức năng**: Cấu hình hệ thống thông báo và nhắc nhở
- **Tính năng**:
  - Thông báo đẩy, email, SMS
  - Cấu hình thời gian nhắc nhở
  - Tần suất thông báo
  - Các loại thông báo khác nhau

### 3. Analytics Module (📊)
- **Chức năng**: Theo dõi và phân tích dữ liệu người dùng
- **Tính năng**:
  - Theo dõi hành vi người dùng
  - Theo dõi hiệu suất
  - Theo dõi tương tác
  - Phân tích thời gian thực
  - Sự kiện tùy chỉnh

### 4. Social Module (👥)
- **Chức năng**: Tính năng cộng đồng và tương tác
- **Tính năng**:
  - Diễn đàn thảo luận
  - Nhóm học tập
  - Đánh giá đồng đẳng
  - Chia sẻ xã hội
  - Phòng chat

## Cách thêm Module mới

1. Tạo file component mới trong folder `modules/`
2. Thêm cấu hình module vào `modulesConfig.tsx`
3. Import và thêm vào `Modules.tsx`

### Ví dụ:

```tsx
// modules/NewModule.tsx
import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'

function NewModule({ data }: { data: CreatePostTypeData }) {
  return (
    <Box>
      <Typography variant="h6">New Module</Typography>
      {/* Nội dung module */}
    </Box>
  )
}

export default NewModule
```

```tsx
// modulesConfig.tsx
export const availableModules: ModuleConfig[] = [
  // ... existing modules
  {
    id: 'newmodule',
    name: 'New Module',
    description: 'Mô tả module mới',
    icon: '🆕',
    enabled: true
  }
]
```

## Giao diện

- **Tab dọc**: Dễ dàng điều hướng giữa các modules
- **Responsive**: Tự động điều chỉnh theo kích thước màn hình
- **Icon**: Mỗi module có icon riêng để dễ nhận biết
- **Mô tả**: Hiển thị mô tả ngắn gọn cho mỗi module

## Lưu ý

- Tất cả modules đều nhận prop `data` từ `CreatePostTypeData`
- Mỗi module nên có state management riêng
- Sử dụng Material-UI components để đảm bảo tính nhất quán
- Thêm validation cho các input fields
