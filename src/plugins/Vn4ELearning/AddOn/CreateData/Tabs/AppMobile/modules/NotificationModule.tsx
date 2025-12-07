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
import { SelectChangeEvent } from '@mui/material'
import Icon from 'components/atoms/Icon'
import Chip from 'components/atoms/Chip'

interface NotificationConfig {
  enabled: boolean
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  reminderTime: string
  frequency: string
  lessonReminders: boolean
  assignmentDeadlines: boolean
  achievementAlerts: boolean
}

function NotificationModule({ data }: { data: CreatePostTypeData }) {
  const [config, setConfig] = React.useState<NotificationConfig>({
    enabled: true,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    reminderTime: '09:00',
    frequency: 'daily',
    lessonReminders: true,
    assignmentDeadlines: true,
    achievementAlerts: true
  })

  const handleConfigChange = (key: keyof NotificationConfig, value: ANY) => {
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
        backgroundColor: 'info.light',
        borderRadius: 2,
        color: 'info.contrastText'
      }}>
        <Icon icon="Notifications" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            Cấu hình Thông báo
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Thiết lập hệ thống thông báo và nhắc nhở cho người dùng
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
                Cài đặt thông báo
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
                        Kích hoạt hệ thống thông báo
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bật/tắt toàn bộ hệ thống thông báo cho ứng dụng
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
                    Kênh thông báo
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
                          checked={config.pushNotifications}
                          onChange={(e) => handleConfigChange('pushNotifications', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Thông báo đẩy
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Thông báo trực tiếp trên thiết bị
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
                          checked={config.emailNotifications}
                          onChange={(e) => handleConfigChange('emailNotifications', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Thông báo email
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Gửi thông báo qua email
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
                          checked={config.smsNotifications}
                          onChange={(e) => handleConfigChange('smsNotifications', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            Thông báo SMS
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Gửi thông báo qua SMS
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Thời gian nhắc nhở"
                    type="time"
                    value={config.reminderTime}
                    onChange={(e) => handleConfigChange('reminderTime', e.target.value)}
                    fullWidth
                    InputProps={{
                      startAdornment: <Icon icon="Schedule" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    helperText="Thời gian gửi thông báo nhắc nhở hàng ngày"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <MuiSelect
                    label="Tần suất"
                    value={config.frequency}
                    onChange={(event: SelectChangeEvent<string>) => handleConfigChange('frequency', event.target.value)}
                    fullWidth
                    startAdornment={<Icon icon="Repeat" sx={{ mr: 1, color: 'text.secondary' }} />}
                  >
                    <MenuItem value="daily">Hàng ngày</MenuItem>
                    <MenuItem value="weekly">Hàng tuần</MenuItem>
                    <MenuItem value="monthly">Hàng tháng</MenuItem>
                  </MuiSelect>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Notification Types Card */}
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
                <Icon icon="Category" sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Loại thông báo
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
                        checked={config.lessonReminders}
                        onChange={(e) => handleConfigChange('lessonReminders', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Nhắc nhở bài học
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Thông báo về bài học mới
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
                        checked={config.assignmentDeadlines}
                        onChange={(e) => handleConfigChange('assignmentDeadlines', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Hạn nộp bài tập
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Nhắc nhở về deadline bài tập
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
                        checked={config.achievementAlerts}
                        onChange={(e) => handleConfigChange('achievementAlerts', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Thông báo thành tích
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Thông báo khi đạt thành tích
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

export default NotificationModule
