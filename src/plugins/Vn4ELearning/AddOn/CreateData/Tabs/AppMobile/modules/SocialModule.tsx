import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import Box from 'components/atoms/Box'
import Typography from 'components/atoms/Typography'
import Switch from 'components/atoms/Switch'
import FormControlLabel from 'components/atoms/FormControlLabel'
import Grid from 'components/atoms/Grid'
import Card from 'components/atoms/Card'
import CardContent from 'components/atoms/CardContent'
import CardHeader from 'components/atoms/CardHeader'
import MenuItem from 'components/atoms/MenuItem'
import MuiSelect from 'components/atoms/Select'
import { SelectChangeEvent } from '@mui/material'
import Icon from 'components/atoms/Icon'
import Chip from 'components/atoms/Chip'

interface SocialConfig {
  enabled: boolean
  discussionForums: boolean
  studyGroups: boolean
  peerReview: boolean
  socialSharing: boolean
  chatRooms: boolean
  moderationLevel: string
  allowAnonymous: boolean
}

function SocialModule({ data }: { data: CreatePostTypeData }) {
  const [config, setConfig] = React.useState<SocialConfig>({
    enabled: true,
    discussionForums: true,
    studyGroups: true,
    peerReview: false,
    socialSharing: true,
    chatRooms: true,
    moderationLevel: 'medium',
    allowAnonymous: false
  })

  const handleConfigChange = (key: keyof SocialConfig, value: ANY) => {
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
        backgroundColor: 'warning.light',
        borderRadius: 2,
        color: 'warning.contrastText'
      }}>
        <Icon icon="Groups" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            Cấu hình Tính năng xã hội
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Thiết lập các tính năng cộng đồng và tương tác xã hội
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
                Cài đặt cộng đồng
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
                        Kích hoạt tính năng xã hội
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Bật/tắt toàn bộ hệ thống tính năng xã hội
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
                    Tính năng cộng đồng
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    height: '100%'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.discussionForums}
                          onChange={(e) => handleConfigChange('discussionForums', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Diễn đàn thảo luận
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Tạo diễn đàn thảo luận cho học viên
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    height: '100%'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.studyGroups}
                          onChange={(e) => handleConfigChange('studyGroups', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Nhóm học tập
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Tạo nhóm học tập cho học viên
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    height: '100%'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.peerReview}
                          onChange={(e) => handleConfigChange('peerReview', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Đánh giá đồng đẳng
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Cho phép học viên đánh giá lẫn nhau
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    height: '100%'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.socialSharing}
                          onChange={(e) => handleConfigChange('socialSharing', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Chia sẻ xã hội
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Chia sẻ nội dung lên mạng xã hội
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    height: '100%'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.chatRooms}
                          onChange={(e) => handleConfigChange('chatRooms', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Phòng chat
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Tạo phòng chat cho học viên
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    height: '100%'
                  }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.allowAnonymous}
                          onChange={(e) => handleConfigChange('allowAnonymous', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            Cho phép ẩn danh
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            Học viên có thể tham gia ẩn danh
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start' }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Box>
                    <MuiSelect
                      label="Mức độ kiểm duyệt"
                      value={config.moderationLevel}
                      onChange={(event: SelectChangeEvent<string>) => handleConfigChange('moderationLevel', event.target.value)}
                      fullWidth
                      startAdornment={<Icon icon="Security" sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="low">Thấp</MenuItem>
                      <MenuItem value="medium">Trung bình</MenuItem>
                      <MenuItem value="high">Cao</MenuItem>
                    </MuiSelect>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Mức độ kiểm duyệt nội dung trong cộng đồng
                    </Typography>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  )
}

export default SocialModule
