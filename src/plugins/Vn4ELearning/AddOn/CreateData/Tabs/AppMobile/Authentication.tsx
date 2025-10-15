import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import Box from 'components/atoms/Box'
import Typography from 'components/atoms/Typography'

function Authentication({ data }: { data: CreatePostTypeData })  {
  return (
    <>
        <Box>
            <Typography>Authentication</Typography>
        </Box>
    </>
  )
}

export default Authentication