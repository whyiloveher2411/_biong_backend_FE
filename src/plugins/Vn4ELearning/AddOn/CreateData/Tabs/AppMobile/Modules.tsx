import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import Box from 'components/atoms/Box'
import Icon from 'components/atoms/Icon'
import { Grid, List, ListItem, ListItemButton, ListItemText } from '@mui/material'
import { useSearchParams } from 'react-router-dom';
import Asset from './Asset';
import AppLocalNotification from './AppLocalNotification';
import { availableModules, ModuleConfig } from './modules/modulesConfig'
import Typography from 'components/atoms/Typography'

function Modules({ data }: { data: CreatePostTypeData }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedModule = searchParams.get('module') || 'assets';

  const setSelectedModule = (moduleId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('module', moduleId);
    setSearchParams(newParams, { replace: true });
  }

  const renderModuleContent = (moduleId: string) => {
    switch (moduleId) {
      case 'assets':
        return <Asset data={data} />
      case 'local_notification':
        return <AppLocalNotification data={data} />
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
      case 'assets':
        return 'FolderZip'
      case 'local_notification':
        return 'Notifications'
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
              <Typography variant="subtitle1" sx={{ color: isSelected ? 'primary.contrastText' : 'text.primary' }} fontWeight="bold">
                {module.name.toUpperCase()}
              </Typography>
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
      {/* Header Section Removed */}

      {/* Main Content */}
      <Box sx={{ flex: 1 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          <Grid item xs={12} md={2}>
            <Box sx={{ height: '100%' }}>
              <List>
                {availableModules.map((m) => renderModuleItem(m, selectedModule === m.id))}
              </List>
            </Box>
          </Grid>
          <Grid item xs={12} md={10}>
            {renderModuleContent(selectedModule)}
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default Modules