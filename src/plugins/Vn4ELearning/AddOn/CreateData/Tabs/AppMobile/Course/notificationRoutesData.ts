export interface RouteArgument {
  [key: string]: ANY;
}

export interface NotificationRoute {
  name: string;
  path: string;
  description: string;
  arguments: RouteArgument;
  defaultValues?: { [key: string]: string };
}

export interface NotificationRoutesData {
  [category: string]: NotificationRoute[];
}

export const notificationRoutes: NotificationRoutesData = {
  "main": [
    {
      "name": "home-tab-0",
      "path": "/",
      "description": "Tab Trang chủ",
      "arguments": {},
      "defaultValues": {
        "tab": "0"
      }
    },
    {
      "name": "home-tab-1",
      "path": "/",
      "description": "Tab Cửa hàng",
      "arguments": {},
      "defaultValues": {
        "tab": "1"
      }
    },
    {
      "name": "home-tab-2",
      "path": "/",
      "description": "Tab Bảng xếp hạng",
      "arguments": {},
      "defaultValues": {
        "tab": "2"
      }
    },
    {
      "name": "home-tab-3",
      "path": "/",
      "description": "Tab Hồ sơ",
      "arguments": {},
      "defaultValues": {
        "tab": "3"
      }
    },
    {
      "name": "pro-upgrade",
      "path": "/pro-upgrade",
      "description": "Màn hình Nâng cấp Pro",
      "arguments": {}
    },
    {
      "name": "daily-gift",
      "path": "/daily-gift",
      "description": "Màn hình Quà tặng hàng ngày",
      "arguments": {}
    },
    {
      "name": "help-center",
      "path": "/help-center",
      "description": "Trung tâm trợ giúp",
      "arguments": {}
    },
    {
      "name": "maintenance",
      "path": "/maintenance",
      "description": "Màn hình bảo trì",
      "arguments": {}
    },
    {
      "name": "course-selection",
      "path": "/course-selection",
      "description": "Màn hình chọn khóa học",
      "arguments": {}
    },
    {
      "name": "streak-detail",
      "path": "/streak-detail",
      "description": "Chi tiết Streak (Chuỗi ngày học)",
      "arguments": {}
    },
    {
      "name": "xp-detail",
      "path": "/xp-detail",
      "description": "Chi tiết XP (Kinh nghiệm)",
      "arguments": {}
    },
    {
      "name": "heart-detail",
      "path": "/heart-detail",
      "description": "Chi tiết Tim (Mạng sống)",
      "arguments": {}
    }
  ],
  "auth": [
    {
      "name": "login",
      "path": "/login",
      "description": "Màn hình đăng nhập",
      "arguments": {}
    },
    {
      "name": "otp-verification",
      "path": "/otp-verification",
      "description": "Xác thực OTP",
      "arguments": {
        "phoneNumber": "String (bắt buộc) - Số điện thoại cần xác thực"
      }
    }
  ],
  "content": [
    {
      "name": "terms-of-use",
      "path": "/content/terms-of-use",
      "description": "Điều khoản sử dụng",
      "arguments": {}
    },
    {
      "name": "privacy-policy",
      "path": "/content/privacy-policy",
      "description": "Chính sách bảo mật",
      "arguments": {}
    },
    {
      "name": "lesson-detail",
      "path": "/lesson/detail",
      "description": "Chi tiết bài học",
      "arguments": {
        "title": "String (mặc định: 'bài học') - Tiêu đề bài học",
        "description": "String (tùy chọn) - Mô tả bài học",
        "courseId": "String (mặc định: '') - ID khóa học"
      }
    },
    {
      "name": "flashcard-review",
      "path": "/flashcard/review",
      "description": "Ôn tập Flashcard",
      "arguments": {
        "courseId": "String (tùy chọn) - ID khóa học để ôn tập cụ thể"
      }
    }
  ],
  "profile": [
    {
      "name": "profile-language",
      "path": "/profile/language",
      "description": "Cài đặt ngôn ngữ",
      "arguments": {}
    },
    {
      "name": "profile-notification",
      "path": "/profile/notification",
      "description": "Cài đặt thông báo",
      "arguments": {}
    },
    {
      "name": "profile-premium-management",
      "path": "/profile/premium-management",
      "description": "Quản lý gói Premium",
      "arguments": {}
    },
    {
      "name": "profile-setting",
      "path": "/profile/setting",
      "description": "Cài đặt hồ sơ chung",
      "arguments": {}
    },
    {
      "name": "profile-feedback",
      "path": "/profile/feedback",
      "description": "Gửi phản hồi",
      "arguments": {}
    }
  ],
  "debug": [
    {
      "name": "debug",
      "path": "/debug",
      "description": "Màn hình Debug chính",
      "arguments": {}
    },
    {
      "name": "debug-setting",
      "path": "/debug/setting",
      "description": "Cài đặt Debug",
      "arguments": {}
    }
  ]
};
