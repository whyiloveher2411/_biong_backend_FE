import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import Box from 'components/atoms/Box'
import Typography from 'components/atoms/Typography'
import Switch from 'components/atoms/Switch'
import FormControlLabel from 'components/atoms/FormControlLabel'
import TextField from 'components/atoms/TextField'
import Grid from 'components/atoms/Grid'
import Card from 'components/atoms/Card'
import CardContent from 'components/atoms/CardContent'
import CardHeader from 'components/atoms/CardHeader'
import MenuItem from 'components/atoms/MenuItem'
import MuiSelect from 'components/atoms/Select'
import Icon from 'components/atoms/Icon'
import Chip from 'components/atoms/Chip'

interface AnalyticsConfig {
  enabled: boolean
  trackUserBehavior: boolean
  trackPerformance: boolean
  trackEngagement: boolean
  dataRetentionDays: number
  exportFormat: string
  realTimeAnalytics: boolean
  customEvents: boolean
}

function AnalyticsModule({ data }: { data: CreatePostTypeData }) {
  const [config, setConfig] = React.useState<AnalyticsConfig>({
    enabled: true,
    trackUserBehavior: true,
    trackPerformance: true,
    trackEngagement: true,
    dataRetentionDays: 365,
    exportFormat: 'csv',
    realTimeAnalytics: false,
    customEvents: false
  })

  const handleConfigChange = (key: keyof AnalyticsConfig, value: ANY) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <Box sx={{ p: 2, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 3,
        p: 3,
        backgroundColor: 'success.light',
        borderRadius: 2,
        color: 'success.contrastText'
      }}>
        <Icon icon="Analytics" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            Cấu hình Phân tích dữ liệu
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Thiết lập hệ thống theo dõi và phân tích dữ liệu người dùng
          </Typography>
        </Box>
      </Box>

      {/* Status Indicator */}
      <Box sx={{ mb: 3 }}>
        <Chip
          icon={<Icon icon={config.enabled ? "CheckCircle" : "Cancel"} />}
          label={config.enabled ? "Đã kích hoạt" : "Chưa kích hoạt"}
          color={config.enabled ? "success" : "default"}
          variant="outlined"
          sx={{ 
            fontWeight: 600,
            '& .MuiChip-icon': { fontSize: 18 }
          }}
        />
      </Box>
      
      {/* Basic Settings Card */}
      <Card sx={{ 
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none'
      }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon icon="Settings" sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Cài đặt phân tích
              </Typography>
            </Box>
          }
          sx={{ 
            backgroundColor: 'grey.50',
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        />
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{
                p: 2,
                backgroundColor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enabled}
                      onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Kích hoạt hệ thống phân tích
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bật/tắt toàn bộ hệ thống phân tích dữ liệu
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
              </Box>
            </Grid>
            
            {config.enabled && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ 
                    fontWeight: 600, 
                    mb: 2,
                    color: 'text.primary'
                  }}>
                    Loại dữ liệu theo dõi
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.trackUserBehavior}
                          onChange={(e) => handleConfigChange('trackUserBehavior', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Hành vi người dùng
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Theo dõi cách người dùng tương tác
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.trackPerformance}
                          onChange={(e) => handleConfigChange('trackPerformance', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Hiệu suất hệ thống
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Theo dõi hiệu suất ứng dụng
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.trackEngagement}
                          onChange={(e) => handleConfigChange('trackEngagement', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Mức độ tương tác
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Theo dõi mức độ tham gia
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Thời gian lưu trữ (ngày)"
                    type="number"
                    value={config.dataRetentionDays}
                    onChange={(e) => handleConfigChange('dataRetentionDays', parseInt(e.target.value) || 0)}
                    fullWidth
                    InputProps={{
                      startAdornment: <Icon icon="Storage" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    helperText="Số ngày lưu trữ dữ liệu phân tích"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <MuiSelect
                    label="Định dạng xuất dữ liệu"
                    value={config.exportFormat}
                    onChange={(e) => handleConfigChange('exportFormat', e.target.value)}
                    fullWidth
                    startAdornment={<Icon icon="Download" sx={{ mr: 1, color: 'text.secondary' }} />}
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="xlsx">Excel</MenuItem>
                  </MuiSelect>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Advanced Features Card */}
      {config.enabled && (
        <Card sx={{ 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: 'none'
        }}>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon icon="Star" sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Tính năng nâng cao
                </Typography>
              </Box>
            }
            sx={{ 
              backgroundColor: 'grey.50',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          />
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper'
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.realTimeAnalytics}
                        onChange={(e) => handleConfigChange('realTimeAnalytics', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Phân tích thời gian thực
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Hiển thị dữ liệu ngay lập tức
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper'
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.customEvents}
                        onChange={(e) => handleConfigChange('customEvents', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Sự kiện tùy chỉnh
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Theo dõi các sự kiện đặc biệt
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default AnalyticsModule
