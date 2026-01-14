// Module configuration interface
export interface ModuleConfig {
  id: string
  name: string
  description: string
  icon?: string
  enabled: boolean
}

// Available modules configuration
export const availableModules: ModuleConfig[] = [
  {
    id: 'assets',
    name: 'Asset',
    description: 'Quản lý tài nguyên ứng dụng',
    icon: 'folder_zip',
    enabled: true,
  }
]
