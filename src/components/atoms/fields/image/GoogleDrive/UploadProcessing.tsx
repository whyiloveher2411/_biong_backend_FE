import { Theme } from '@mui/material'
import Avatar from 'components/atoms/Avatar'
import Box from 'components/atoms/Box'
import Card from 'components/atoms/Card'
import CardContent from 'components/atoms/CardContent'
import CardHeader from 'components/atoms/CardHeader'
import CircularProgress from 'components/atoms/CircularProgress'
import Collapse from 'components/atoms/Collapse'
import Icon from 'components/atoms/Icon'
import IconButton from 'components/atoms/IconButton'
import makeCSS from 'components/atoms/makeCSS'
import Skeleton from 'components/atoms/Skeleton'
import Slide from 'components/atoms/Slide'
import Typography from 'components/atoms/Typography'
import { humanFileSize } from 'helpers/file'
import React from 'react'
import { StateFilesUploadProps } from '.'


const useStyles = makeCSS((theme: Theme) => ({
    upload: {
        position: 'absolute', right: 10, bottom: 10, maxWidth: 360, minWidth: 360,
        zIndex: 1301,
        boxShadow: '0 2px 8px 0 rgb(0 0 0 / 20%)',
        '& .MuiCardContent-root': {
            padding: 16
        }
    },
    uploadHeader: {
        backgroundColor: '#323232',
        height: 54,
        '& .MuiCardHeader-title': {
            color: theme.palette.primary.contrastText,
        },
        '& .MuiCardHeader-action': {
            marginTop: -14,
            marginRight: -16,
        }
    },
    circularBottom: {
        color: theme.palette.grey[theme.palette.mode === 'light' ? 200 : 700],
    },
    fileUpload: {
        marginBottom: theme.spacing(1)
    },
    uploadCompleteIconHover: {
        display: 'none !important',
    },
    uploadCompleteIcon: {
        display: 'block !important',
    },
    uploadComplete: {
        color: theme.palette.success.main,
        marginTop: -theme.spacing(1),
        marginBottom: -theme.spacing(1),
        '&:hover': {
            color: 'unset',
        },
        '&:hover $uploadCompleteIcon': {
            display: 'none !important'
        },
        '&:hover $uploadCompleteIconHover': {
            display: 'block !important'
        },
    },
    fileName: {
        lineHeight: '18px', width: '100%',
    },
}));

function UploadProcessing({ filesUpload, setFilesUpload }: {
    filesUpload: StateFilesUploadProps,
    setFilesUpload: React.Dispatch<React.SetStateAction<StateFilesUploadProps>>
}) {

    const classes = useStyles();

    const files = Object.keys(filesUpload.files);

    return (
        <Slide direction="up" in={Boolean(filesUpload.open && files.length)} mountOnEnter unmountOnExit className={classes.upload}>
            <Card  >
                <CardHeader
                    action={
                        <>
                            <IconButton style={{ color: 'white', transition: 'all 0.2s', transform: 'rotate(' + ((filesUpload.openContent) ? '0' : '180') + 'deg)' }} onClick={() => { setFilesUpload(prev => ({ ...prev, openContent: !prev.openContent })) }} aria-label="settings">
                                <Icon icon="ExpandMore" />
                            </IconButton>
                            <IconButton onClick={() => { setFilesUpload(prev => ({ ...prev, files: {}, open: false })) }} style={{ color: 'white' }} aria-label="settings">
                                <Icon icon="ClearRounded" />
                            </IconButton>
                        </>
                    }
                    title={'Uploading ' + files.length + ' item'}
                    className={classes.uploadHeader}
                />
                <Collapse in={Boolean(filesUpload.openContent)}>
                    <CardContent>
                        {
                            files.map(key => (
                                <Box
                                    key={key}
                                    className={classes.fileUpload}
                                    sx={{
                                        display: "flex",
                                        gridGap: 16,
                                        alignItems: "center"
                                    }}
                                >
                                    {
                                        filesUpload.files[key].thumbnail ?
                                            <Avatar
                                                src={filesUpload.files[key].thumbnail}
                                                style={{ flexShrink: 0 }}
                                                variant="square"
                                                name="Upload Thumbnail"
                                            />
                                            :
                                            <Skeleton style={{ flexShrink: 0 }} variant="rectangular" width={40} height={40} />
                                    }
                                    <div style={{ width: '100%' }}>
                                        <Typography noWrap className={classes.fileName}>
                                            {filesUpload.files[key].fileNmae}
                                        </Typography>
                                        <Typography component="span" variant="body2" > ({humanFileSize(filesUpload.files[key].sizeUpload)})</Typography>
                                        {
                                            !filesUpload.files[key].uploadComplete &&
                                            <Typography color="secondary" variant="body2">{filesUpload.files[key].message}</Typography>
                                        }
                                    </div>

                                    {
                                        filesUpload.files[key].uploadComplete !== undefined ?
                                            (
                                                filesUpload.files[key].uploadComplete === true ?
                                                    <IconButton className={classes.uploadComplete}>
                                                        <Icon icon="CheckCircleRounded" className={classes.uploadCompleteIcon} />
                                                        <Icon icon="FolderOpen" className={classes.uploadCompleteIconHover} />
                                                    </IconButton>
                                                    :
                                                    <IconButton
                                                        onClick={() => {
                                                            setFilesUpload(prev => {
                                                                delete prev.files[key];
                                                                return { ...prev };
                                                            })
                                                        }}
                                                        color="secondary"
                                                        style={{ margin: '-8px 0' }}
                                                    >
                                                        <Icon icon="HighlightOffRounded" />
                                                    </IconButton>
                                            )
                                            :
                                            <Box position="relative" style={{ flexShrink: 0, width: 40, height: 40 }} display="inline-flex">
                                                <CircularProgress
                                                    variant="determinate"
                                                    size={40}
                                                    thickness={4}
                                                    className={classes.circularBottom}
                                                    value={100}
                                                    style={{ position: 'absolute', left: 0 }}
                                                />
                                                <CircularProgress
                                                    size={40}
                                                    variant="determinate"
                                                    style={{ position: 'absolute', left: 0 }}
                                                    value={Number(filesUpload.files[key].percentLoaded)}
                                                />
                                                <Box
                                                    top={0}
                                                    left={0}
                                                    bottom={0}
                                                    right={0}
                                                    position="absolute"
                                                    display="flex"
                                                    alignItems="center"
                                                    justifyContent="center"
                                                >
                                                    <Typography variant="caption" component="div" color="textSecondary">
                                                        {`${filesUpload.files[key].percentLoaded}%`}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                    }
                                </Box>
                            ))
                        }
                    </CardContent>
                </Collapse>
            </Card>
        </Slide>
    )
}

export default UploadProcessing
