import { Box, Checkbox, FormControl, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import MoreButton from 'components/atoms/MoreButton'
import { __ } from 'helpers/i18n'

function S3Store() {
  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100vh - 64px)',
      }}
    >
      <TableContainer sx={{ maxHeight: 700 }} className="custom_scroll">
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <FormControl>
                  <Checkbox
                    checked={false}
                    color="primary"
                    indeterminate={false}
                    onClick={() => {
                      // 
                    }}
                  />
                </FormControl>
              </TableCell>
              <TableCell padding="checkbox">

              </TableCell>
              <TableCell align="left">{__('Name')}</TableCell>
              <TableCell align="left">{__('Type')}</TableCell>
              <TableCell align="left">{__('Last Modified')}</TableCell>
              <TableCell align="left">{__('Size')}</TableCell>
              <TableCell align="left">{__('Actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody sx={{ maxHeight: 700 }} className="custom_scroll">
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell padding="checkbox">
                  <FormControl>
                    <Checkbox
                      checked={false}
                      color="primary"
                      onClick={() => {
                        // Handle checkbox click
                      }}
                    />
                  </FormControl>
                </TableCell>
                <TableCell padding="checkbox"></TableCell>
                <TableCell align="left">{`File_${index + 1}.jpg`}</TableCell>
                <TableCell align="left">Image</TableCell>
                <TableCell align="left">{`${(Math.random() * 100).toFixed(2)} MB`}</TableCell>
                <TableCell align="left">{new Date(Date.now() - Math.random() * 10000000000).toLocaleDateString()}</TableCell>
                <TableCell align="left">
                  <MoreButton
                    actions={[
                      {
                        review: {
                          title: __('Review'),
                          action: () => {
                            // Handle review action
                          }
                        },
                        change_name: {
                          title: __('Change Name'),
                          action: () => {
                            // Handle change action
                          }
                        },
                      },
                      {
                        delete: {
                          title: __('Delete'),
                          action: () => {
                            // Handle delete action
                          }
                        }
                      }
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default S3Store
