import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import React from 'react'
import Box from 'components/atoms/Box'
import Typography from 'components/atoms/Typography'

function PushNotification({ data }: { data: CreatePostTypeData }) {
  return (
    <>
        <Box>
            <Typography>PushNotification</Typography>
        </Box>
    </>
  )
}

export default PushNotification 