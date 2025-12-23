import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import React from 'react'
import Box from 'components/atoms/Box'
import Grid from 'components/atoms/Grid'
import Card from 'components/atoms/Card'
import CardContent from 'components/atoms/CardContent'
import Typography from 'components/atoms/Typography'
import LoadingButton from 'components/atoms/LoadingButton'
import useApi from 'hook/useApi'
import Preview from './PushNotification/Preview'
import Campaigns from './Campaigns'
import { Tab, Tabs, TextField } from '@mui/material'

function PushNotification({ data }: { data: CreatePostTypeData }) {
  const api = useApi();

  const [form, setForm] = React.useState({
    title: '',
    body: '',
    topic: 'all_users',
    fcm_token: ''
  });

  const [tab, setTab] = React.useState<'compose' | 'campaigns'>('compose');

  const isValidToSend = React.useMemo(() => {
    return !!(form.title && form.body && (form.topic || form.fcm_token));
  }, [form]);

  const handleSend = () => {
    api.ajax({
      url: 'plugin/vn4-e-learning/app-mobile/push-notification/send',
      method: 'POST',
      data: {
        id: data.post.id,
        ...form
      },
      success: (res) => {
        if (res.status === 'success') {
          setForm({ ...form, title: '', body: '' });
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
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Soạn nội dung
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Title"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Body"
                      value={form.body}
                      onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Topic"
                      value={form.topic}
                      onChange={(e) => setForm(prev => ({ ...prev, topic: e.target.value }))}
                      helperText="Gửi đến topic này (mặc định: all_users)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="FCM Token"
                      placeholder="Nhập FCM token của thiết bị cụ thể"
                      value={form.fcm_token}
                      onChange={(e) => setForm(prev => ({ ...prev, fcm_token: e.target.value }))}
                      helperText="Gửi đến một thiết bị cụ thể qua token này"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'sticky', top: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Preview title={form.title} body={form.body} />
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
                      Nhập Title, Body và ít nhất một mục tiêu (Topic hoặc FCM Token) để gửi
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