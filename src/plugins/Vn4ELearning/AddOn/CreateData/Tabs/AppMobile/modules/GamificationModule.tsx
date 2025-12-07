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
import Icon from 'components/atoms/Icon'
import Chip from 'components/atoms/Chip'

interface GamificationConfig {
  enabled: boolean
  pointsPerLesson: number
  pointsPerQuiz: number
  pointsPerAssignment: number
  badgeSystem: boolean
  leaderboard: boolean
  streakRewards: boolean
  dailyChallenges: boolean
}

function GamificationModule({ data }: { data: CreatePostTypeData }) {
  const [config, setConfig] = React.useState<GamificationConfig>({
    enabled: false,
    pointsPerLesson: 10,
    pointsPerQuiz: 20,
    pointsPerAssignment: 50,
    badgeSystem: true,
    leaderboard: true,
    streakRewards: true,
    dailyChallenges: false
  })

  const handleConfigChange = (key: keyof GamificationConfig, value: ANY) => {
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
        backgroundColor: 'primary.light',
        borderRadius: 2,
        color: 'primary.contrastText'
      }}>
        <Icon icon="SportsEsports" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            Cấu hình Gamification
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Thiết lập hệ thống điểm, huy hiệu và bảng xếp hạng để tăng động lực học tập
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
                Cài đặt cơ bản
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
                        Kích hoạt hệ thống Gamification
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bật/tắt toàn bộ hệ thống gamification cho ứng dụng
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
                    Cấu hình điểm số
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Điểm cho bài học"
                    type="number"
                    value={config.pointsPerLesson}
                    onChange={(e) => handleConfigChange('pointsPerLesson', parseInt(e.target.value) || 0)}
                    fullWidth
                    InputProps={{
                      startAdornment: <Icon icon="School" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    helperText="Điểm nhận được khi hoàn thành bài học"
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Điểm cho quiz"
                    type="number"
                    value={config.pointsPerQuiz}
                    onChange={(e) => handleConfigChange('pointsPerQuiz', parseInt(e.target.value) || 0)}
                    fullWidth
                    InputProps={{
                      startAdornment: <Icon icon="Quiz" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    helperText="Điểm nhận được khi làm quiz"
                  />
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Điểm cho bài tập"
                    type="number"
                    value={config.pointsPerAssignment}
                    onChange={(e) => handleConfigChange('pointsPerAssignment', parseInt(e.target.value) || 0)}
                    fullWidth
                    InputProps={{
                      startAdornment: <Icon icon="Assignment" sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    helperText="Điểm nhận được khi nộp bài tập"
                  />
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
                        checked={config.badgeSystem}
                        onChange={(e) => handleConfigChange('badgeSystem', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Hệ thống huy hiệu
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Trao huy hiệu cho thành tích đặc biệt
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
                        checked={config.leaderboard}
                        onChange={(e) => handleConfigChange('leaderboard', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Bảng xếp hạng
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Hiển thị thứ hạng học viên
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
                        checked={config.streakRewards}
                        onChange={(e) => handleConfigChange('streakRewards', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Phần thưởng chuỗi
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Thưởng cho việc học liên tục
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
                        checked={config.dailyChallenges}
                        onChange={(e) => handleConfigChange('dailyChallenges', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Thử thách hàng ngày
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tạo thử thách học tập hàng ngày
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

export default GamificationModule
