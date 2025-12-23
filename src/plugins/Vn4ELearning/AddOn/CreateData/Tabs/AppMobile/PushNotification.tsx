import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import React from 'react'
import Box from 'components/atoms/Box'
import Grid from 'components/atoms/Grid'
import Card from 'components/atoms/Card'
import CardContent from 'components/atoms/CardContent'
import Divider from 'components/atoms/Divider'
import Typography from 'components/atoms/Typography'
import LoadingButton from 'components/atoms/LoadingButton'
import useApi from 'hook/useApi'
import ComposeForm from './PushNotification/ComposeForm'
import PlatformOverrides from './PushNotification/PlatformOverrides'
import TargetingForm from './PushNotification/TargetingForm'
import AdvancedOptions from './PushNotification/AdvancedOptions'
import Preview from './PushNotification/Preview'
import { AdvancedOptionsState, ComposeState, TargetingState } from './PushNotification/types'
import Campaigns from './Campaigns'
import { Tab, Tabs } from '@mui/material'

import { getImageUrl } from 'helpers/image'

function PushNotification({ data }: { data: CreatePostTypeData }) {
  const api = useApi();

  const [compose, setCompose] = React.useState<ComposeState>({
    payload: { title: '', body: '', imageUrl: '', iconUrl: '', data: {} },
    overrides: { ios: {}, android: {} }
  });

  const [targeting, setTargeting] = React.useState<TargetingState>({ type: 'topic', topic: 'all_users' });
  const [advanced, setAdvanced] = React.useState<AdvancedOptionsState>({ priority: 'high', ttlSeconds: undefined, scheduleAt: null });

  const [tab, setTab] = React.useState<'compose' | 'campaigns'>('compose');

  const isValidToSend = React.useMemo(() => {
    if (!compose.payload.title || !compose.payload.body) return false;
    if (targeting.type === 'single') return !!targeting.token;
    if (targeting.type === 'multicast') return (targeting.tokens?.length || 0) > 0;
    if (targeting.type === 'topic') return !!targeting.topic;
    if (targeting.type === 'deviceGroup') return !!targeting.notificationKey;
    return false;
  }, [compose, targeting]);

  const handleSend = () => {
    api.ajax({
      url: 'plugin/vn4-e-learning/app-mobile/push-notification/send',
      method: 'POST',
      data: {
        id: data.post.id,
        title: compose.payload.title,
        body: compose.payload.body,
        topic: targeting.topic,
        fcm_token: targeting.token,
        imageUrl: getImageUrl(compose.payload.imageUrl),
        iconUrl: getImageUrl(compose.payload.iconUrl),
        compose,
        targeting,
        advanced
      },
      success: (res) => {
        if (res.status === 'success') {
          // Keep title/body empty after success? Original didn't do this for complex state.
          // But might be good to clear.
        }
      }
    })
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value='compose' label='Soạn thông báo' />
          <Tab value='campaigns' label='Campaigns' />
        </Tabs>
      </Box>

      {tab === 'compose' ? (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <ComposeForm value={compose.payload} onChange={(payload) => setCompose(prev => ({ ...prev, payload }))} />
                <Divider sx={{ my: 3 }} />
                <PlatformOverrides value={compose.overrides} onChange={(overrides) => setCompose(prev => ({ ...prev, overrides }))} />
                <Divider sx={{ my: 3 }} />
                <TargetingForm value={targeting} onChange={setTargeting} />
                <Divider sx={{ my: 3 }} />
                <AdvancedOptions value={advanced} onChange={setAdvanced} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'sticky', top: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Preview compose={compose} />
              <Card>
                <CardContent>
                  <Typography variant='subtitle1' fontWeight={700} gutterBottom>
                    Hành động
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <LoadingButton
                      loading={api.open}
                      variant='contained'
                      color='success'
                      fullWidth
                      onClick={handleSend}
                      disabled={!isValidToSend}
                    >
                      Gửi thông báo
                    </LoadingButton>
                  </Box>
                  {!isValidToSend && (
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
                      Nhập Title, Body và cấu hình mục tiêu hợp lệ để gửi
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      ) : (
        <Campaigns data={data} />
      )}
    </Box>
  )
}

export default PushNotification