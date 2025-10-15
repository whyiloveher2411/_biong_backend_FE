import React from 'react'
import Box from 'components/atoms/Box'
import Typography from 'components/atoms/Typography'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'

function Config({ data }: { data: CreatePostTypeData }) {
  return (
    <>
        <Box>
            <Typography>Config</Typography>
        </Box>
    </>
  )
}

export default Config