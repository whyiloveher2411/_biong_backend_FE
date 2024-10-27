import { LoadingButton } from '@mui/lab';
import { Alert, Box, Button, CircularProgress, Fade, IconButton, OutlinedInput, Paper, Popper, Skeleton, Tooltip, Typography } from '@mui/material';
import Icon from 'components/atoms/Icon';
import React from 'react'
import useAjax from '../../../hook/useApi';
import CodeBlock from '../CodeBlock';

interface TooltipAiSuggestProps {
  onAccept: (result: string) => void,
  textSelected: string,
  setTextSelected: (value: string) => void,
  name: string,
  post: ANY,
  children: React.ReactNode,
  open: boolean,
  onClose: () => void,
  config: JsonFormat,
  dataPostType?: JsonFormat
}


function TooltipAiSuggest({ onAccept, textSelected, setTextSelected, name, post, children, open, onClose, config, dataPostType }: TooltipAiSuggestProps) {

  const [resultSuggest, setResultSuggest] = React.useState('');
  const anchorEl = React.useRef<HTMLDivElement | null>(null);
  const ajaxSuggest = useAjax();
  const [prompt, setPrompt] = React.useState('');

  const handleSubmit = () => {
    ajaxSuggest.ajax({
      method: 'POST',
      url: '/ai/sugges-text',
      data: {
        prompt: prompt,
        textSelected: textSelected,
        title: post[name],
        data: dataPostType ? dataPostType : post,
      },
      success: (res: { result: string }) => {
        setResultSuggest(res.result);
      }
    });
  }

  const promptAfter = textSelected ? prompt.replace('{{textSelected}}', textSelected) : prompt;

  return (
    <Box
      sx={(theme) => ({
        width: '100%',
        '.tooltip-suggest': {
          zIndex: 1301,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: theme.palette.mode === 'dark'
            ? '0px 4px 20px rgba(255, 255, 255, 0.2), 0px 0px 40px rgba(255, 255, 255, 0.1)'
            : '0px 4px 20px rgba(0, 0, 0, 0.2), 0px 0px 40px rgba(0, 0, 0, 0.1)',
        }
      })}
      ref={anchorEl}
    >
      {children}
      <Popper
        disablePortal
        // Note: The following zIndex style is specifically for documentation purposes and may not be necessary in your application.
        open={open}
        anchorEl={anchorEl.current}
        placement={'bottom'}
        transition
        className='tooltip-suggest'
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={300}  >
            <Paper sx={{ p: 3, width: anchorEl.current?.clientWidth, zIndex: 1301, backgroundColor: 'background.paper', position: 'relative' }} variant='outlined' >
              <IconButton
                onClick={onClose}
                size='small'
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  transform: 'translate(50%, -50%)',
                  backgroundColor: 'background.paper',
                  zIndex: 1301,
                  '&:hover': {
                    backgroundColor: 'background.paper',
                  },
                }}
              >
                <Icon icon="Close" />
              </IconButton>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <CodeBlock sx={{ flexShrink: 0, mb: 1, color: 'secondary.main' }} html={textSelected} />
                {
                  textSelected ?
                    <Button onClick={() => {
                      setTextSelected('');
                      setPrompt(textSelected ? prompt.replace('{{textSelected}}', '{{title}}') : prompt);
                    }}>Xóa</Button>
                    :
                    null
                }
              </Box>
              <OutlinedInput
                fullWidth
                value={promptAfter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setPrompt(e.currentTarget.value);
                }}
                placeholder='Nhập yêu cầu của bạn'
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
                endAdornment={
                  ajaxSuggest.open ?
                    <CircularProgress size={20} />
                    :
                    <LoadingButton
                      color='primary'
                      loading={ajaxSuggest.open}
                      sx={{
                        borderRadius: '50%',
                        backgroundColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                        width: 36,
                        minWidth: 36,
                      }}
                      onClick={handleSubmit}>
                      <Icon sx={{ color: 'white' }} icon="ArrowUpwardRounded" />
                    </LoadingButton>
                }
              />
              {
                config.prompts ?
                  config.prompts.map((prompt: string, index: number) => (
                    <Typography variant='body2' key={index} sx={{}}>
                      {textSelected ? prompt.replace('{{title}}', `{{textSelected}}`) : prompt} <Button onClick={() => {
                        setPrompt(textSelected ? prompt.replace('{{title}}', '{{textSelected}}') : prompt);
                      }}>Chọn</Button>
                    </Typography>
                  ))
                  :
                  null
              }
              {
                ajaxSuggest.open ?
                  <Skeleton variant='text' />
                  :
                  resultSuggest && <Alert
                    severity="success"
                    icon={false}
                    action={
                      <Button color="inherit" size="small"
                        onClick={() => {
                          onAccept(resultSuggest);
                          onClose();
                        }}
                      >
                        Chấp nhận
                      </Button>
                    }
                  >
                    <CodeBlock
                      html={resultSuggest.replaceAll('\n', '<br>')}
                    />
                  </Alert>

                // <Alert> <Typography >Kết quả: <strong> {resultSuggest} </strong> <Button onClick={() => {
                //   onAccept(resultSuggest);
                //   onClose();
                // }}>Chấp nhận</Button></Typography>
                // </Alert>
              }
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  )
}

export default TooltipAiSuggest

export function useTooltipAiSuggest({ onAccept, name, post, config, dataPostType }: {
  onAccept: (result: string) => void,
  name: string,
  post: ANY,
  config: JsonFormat,
  dataPostType?: JsonFormat
}): {
  open: boolean,
  onClose: () => void,
  onToggle: (value?: React.MouseEvent | boolean) => void,
  textSelected: string,
  startAdornment: React.ReactNode,
  setTextSelected: (value: string) => void,
  tooltipAiSuggestProps: Omit<TooltipAiSuggestProps, 'children'>,
} {
  const [openSuggest, setOpenSuggest] = React.useState(false);

  const [textSelected, setTextSelected] = React.useState('');

  const onToggle = (open?: boolean | React.MouseEvent) => {
    setOpenSuggest(prev => typeof open === 'boolean' ? open : !prev);
  }

  return {
    open: openSuggest,
    onClose: () => {
      setOpenSuggest(false);
    },
    onToggle,
    startAdornment: <>
      {config.suggest_ai ?
        <Tooltip title='Sử dụng AI'>
          <IconButton onClick={onToggle}>
            <Icon icon="AutoAwesomeRounded" />
          </IconButton>
        </Tooltip>
        :
        null
      }
      {config.inputProps?.startAdornment}
    </>,
    textSelected,
    setTextSelected: (value: string) => {
      setTextSelected(value);
    },
    tooltipAiSuggestProps: {
      onAccept,
      textSelected,
      setTextSelected,
      open: openSuggest,
      onClose: () => {
        setOpenSuggest(false);
      },
      config,
      name,
      post,
      dataPostType,
    }
  }
}

