// Module configuration interface
export interface ModuleConfig {
  id: string
  name: string
  description: string
  icon?: string
  enabled: boolean
  badge?: string | number
}

// Available modules configuration
export const availableModules: ModuleConfig[] = [
  {
    id: 'gamification',
    name: 'Gamification',
    description: 'Hệ thống điểm, huy hiệu và bảng xếp hạng',
    icon: '🎮',
    enabled: true,
    badge: '6'
  },
  {
    id: 'notifications',
    name: 'Thông báo',
    description: 'Cấu hình hệ thống thông báo và nhắc nhở',
    icon: '🔔',
    enabled: true,
    badge: '1'
  },
  {
    id: 'analytics',
    name: 'Phân tích',
    description: 'Theo dõi và phân tích dữ liệu người dùng',
    icon: '📊',
    enabled: true,
    badge: '4'
  },
  {
    id: 'social',
    name: 'Xã hội',
    description: 'Tính năng cộng đồng và tương tác',
    icon: '👥',
    enabled: true,
    badge: '2'
  }
]
