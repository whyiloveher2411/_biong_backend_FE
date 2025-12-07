import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import Box from 'components/atoms/Box'
import Typography from 'components/atoms/Typography'
import Divider from 'components/atoms/Divider'
import Icon from 'components/atoms/Icon'
import { Grid, Card, CardContent, List, ListItem, ListItemButton, ListItemText, Chip } from '@mui/material'
import GamificationModule from './modules/GamificationModule'
import NotificationModule from './modules/NotificationModule'
import AnalyticsModule from './modules/AnalyticsModule'
import SocialModule from './modules/SocialModule'
import { availableModules, ModuleConfig } from './modules/modulesConfig'

function Modules({ data }: { data: CreatePostTypeData }) {
  const [selectedModule, setSelectedModule] = React.useState<string>(availableModules[0]?.id || 'gamification')
  const renderModuleContent = (moduleId: string) => {
    switch (moduleId) {
      case 'gamification':
        return <GamificationModule data={data} />
      case 'notifications':
        return <NotificationModule data={data} />
      case 'analytics':
        return <AnalyticsModule data={data} />
      case 'social':
        return <SocialModule data={data} />
      default:
        return (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Icon icon="Error" sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Module không được tìm thấy
            </Typography>
          </Box>
        )
    }
  }

  const getModuleIcon = (moduleId: string) => {
    switch (moduleId) {
      case 'gamification':
        return 'SportsEsports'
      case 'notifications':
        return 'Notifications'
      case 'analytics':
        return 'Analytics'
      case 'social':
        return 'Groups'
      default:
        return 'Settings'
    }
  }

  const renderModuleItem = (module: ModuleConfig, isSelected: boolean) => (
    <ListItem key={module.id} disablePadding>
      <ListItemButton
        selected={isSelected}
        onClick={() => setSelectedModule(module.id)}
        sx={{
          borderRadius: 1,
          mb: 1,
          '&.Mui-selected': {
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
            '& .MuiListItemText-primary': {
              color: 'white',
            },
            '& .MuiListItemText-secondary': {
              color: 'rgba(255,255,255,0.7)',
            },
            '& .MuiChip-root': {
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
            }
          }
        }}
      >
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 1,
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'primary.light',
                color: isSelected ? 'white' : 'primary.contrastText'
              }}>
                <Icon icon={getModuleIcon(module.id)} sx={{ fontSize: 16 }} />
              </Box>
              <Typography variant="subtitle1" sx={{color: isSelected ? 'primary.contrastText' : 'text.primary'}} fontWeight="bold">
                {module.name.toUpperCase()}
              </Typography>
              <Chip 
                label={module.badge || 0} 
                size="small" 
                color={isSelected ? 'default' : 'primary'}
                variant={isSelected ? 'filled' : 'outlined'}
              />
            </Box>
          }
          secondary={
            <Typography variant="body2" color={isSelected ? 'rgba(255,255,255,0.7)' : 'text.secondary'}>
              {module.description}
            </Typography>
          }
        />
      </ListItemButton>
    </ListItem>
  )

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Section */}
      <Box sx={{ 
        mb: 3,
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: 'primary.main',
            color: 'primary.contrastText'
          }}>
            <Icon icon="Settings" sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 700,
              color: 'text.primary',
              mb: 0.5
            }}>
              Quản lý Modules
            </Typography>
            <Typography variant="body1" sx={{ 
              color: 'text.secondary',
              fontSize: '1rem'
            }}>
              Cấu hình và quản lý các chức năng khác nhau của ứng dụng
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mt: 2 }} />
      </Box>
      
      {/* Main Content */}
      <Box sx={{ flex: 1 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ height: '100%' }}>
              <List>
                {availableModules.map((m) => renderModuleItem(m, selectedModule === m.id))}
              </List>
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom>
                    {availableModules.find(m => m.id === selectedModule)?.name || ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {availableModules.find(m => m.id === selectedModule)?.description || ''}
                  </Typography>
                  <Divider />
                </Box>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {renderModuleContent(selectedModule)}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default Modules