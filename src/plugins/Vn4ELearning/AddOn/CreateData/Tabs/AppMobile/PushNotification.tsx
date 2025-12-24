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
// import PlatformOverrides from './PushNotification/PlatformOverrides'
import TargetingForm from './PushNotification/TargetingForm'
// import AdvancedOptions from './PushNotification/AdvancedOptions'
import Preview from './PushNotification/Preview'
import DeviceTest from './PushNotification/DeviceTest'
import { ComposeState, TargetingState } from './PushNotification/types'
import Campaigns from './Campaigns'
import { Tab, Tabs } from '@mui/material'
import { useSearchParams } from 'react-router-dom'

import { getImageUrl } from 'helpers/image'
import PlatformOverrides from './PushNotification/PlatformOverrides'

function PushNotification({ data }: { data: CreatePostTypeData }) {
  const api = useApi();
  const [searchParams, setSearchParams] = useSearchParams();

  const [compose, setCompose] = React.useState<ComposeState>({
    payload: { title: '', body: '', imageUrl: '', iconUrl: '', data: {} },
    overrides: { ios: {}, android: {} }
  });

  const [targeting, setTargeting] = React.useState<TargetingState>({ type: 'topic', topic: 'all_users' });
  // const [advanced, setAdvanced] = React.useState<AdvancedOptionsState>({ priority: 'high', ttlSeconds: undefined, scheduleAt: null });

  // Đọc tab từ URL params, mặc định là 'compose'
  const tabFromUrl = searchParams.get('tab') as 'compose' | 'campaigns' | 'deviceTest' | null;
  const initialTab = (tabFromUrl === 'compose' || tabFromUrl === 'campaigns' || tabFromUrl === 'deviceTest') 
    ? tabFromUrl 
    : 'compose';

  const [tab, setTab] = React.useState<'compose' | 'campaigns' | 'deviceTest'>(initialTab);

  // Đồng bộ tab với URL params khi URL thay đổi (ví dụ: back/forward button)
  React.useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'compose' | 'campaigns' | 'deviceTest' | null;
    if (tabFromUrl === 'compose' || tabFromUrl === 'campaigns' || tabFromUrl === 'deviceTest') {
      setTab(tabFromUrl);
    } else {
      setTab('compose');
    }
  }, [searchParams]);

  // Hàm để cập nhật tab và URL params
  const handleTabChange = React.useCallback((_: ANY, newTab: 'compose' | 'campaigns' | 'deviceTest') => {
    setTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (newTab === 'compose') {
      // Xóa param tab nếu về compose (mặc định)
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', newTab);
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const isValidToSend = React.useMemo(() => {
    if (!compose.payload.title || !compose.payload.body) return false;
    if (targeting.type === 'single') return !!targeting.token;
    if (targeting.type === 'multicast') return (targeting.tokens?.length || 0) > 0;
    if (targeting.type === 'topic') return !!targeting.topic;
    if (targeting.type === 'deviceGroup') return !!targeting.notificationKey;
    return false;
  }, [compose, targeting]);

  const isValidToTest = React.useMemo(() => {
    return !!(compose.payload.title && compose.payload.body);
  }, [compose.payload.title, compose.payload.body]);

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
        // advanced
      },
      success: (res) => {
        if (res.status === 'success') {
          // Keep title/body empty after success? Original didn't do this for complex state.
          // But might be good to clear.
        }
      }
    })
  }

  const handleTest = () => {
    api.ajax({
      url: 'plugin/vn4-e-learning/app-mobile/push-notification/send',
      method: 'POST',
      data: {
        id: data.post.id,
        title: compose.payload.title,
        body: compose.payload.body,
        imageUrl: getImageUrl(compose.payload.imageUrl),
        iconUrl: getImageUrl(compose.payload.iconUrl),
        compose,
        test: 1
      },
      success: (res) => {
        if (res.status === 'success') {
          // Success handling
        }
      }
    })
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab value='compose' label='Soạn thông báo' />
          <Tab value='deviceTest' label='Device Test' />
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
                {/* {/* <Divider sx={{ my: 3 }} /> */}
                {/* <AdvancedOptions value={advanced} onChange={setAdvanced} /> */}
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
                      variant='outlined'
                      color='primary'
                      fullWidth
                      onClick={handleTest}
                      disabled={!isValidToTest}
                    >
                      Test
                    </LoadingButton>
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
      ) : tab === 'deviceTest' ? (
        <Card>
          <CardContent>
            <DeviceTest post={data.post as PostTypeProps} />
          </CardContent>
        </Card>
      ) : (
        <Campaigns data={data} />
      )}
    </Box>
  )
}

export default PushNotification