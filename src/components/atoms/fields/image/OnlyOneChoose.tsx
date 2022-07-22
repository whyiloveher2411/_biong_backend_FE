import { Theme } from '@mui/material';
import { ImageProps } from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import CardMedia from 'components/atoms/CardMedia';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import FormLabel from 'components/atoms/FormLabel';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import InputLabel from 'components/atoms/InputLabel';
import { default as LoadingCustom } from 'components/atoms/Loading';
import makeCSS from 'components/atoms/makeCSS';
import OutlinedInput from 'components/atoms/OutlinedInput';
import Slide from 'components/atoms/Slide';
import Typography from 'components/atoms/Typography';
import { default as DialogCustom } from 'components/molecules/Dialog';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { __ } from 'helpers/i18n';
import { ImageObjectProps } from 'helpers/image';
import { convertToURL, validURL } from 'helpers/url';
import useAjax from 'hook/useApi';
import { useSnackbar } from 'notistack';
import React from 'react';
import { FieldFormItemProps } from '../type';
import GoogleDrive, { FileProps } from './GoogleDrive';
import InstructionNotes from './InstructionNotes';


const Transition = React.forwardRef(function Transition(props: { [key: string]: ANY, children: ANY }, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeCSS((theme: Theme) => ({
    appBar: {
        position: 'relative',
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
        color: '#fff'
    },
    removeImg: {
        position: 'absolute',
        top: 3,
        right: 3
    },
    uploadIcon: {
        color: theme.palette.text.secondary
    },
    uploadArea: {
        border: '1px dashed ' + theme.palette.text.secondary,
        height: 160,
        width: 160,
        borderRadius: 8,
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: theme.palette.dividerDark
        }
    }
}));

export default React.memo(function ImageForm(props: FieldFormItemProps) {

    const { config, post, name, onReview } = props;

    const classes = useStyles();

    const [openSourDialog, setOpenSourDialog] = React.useState(false);
    const [openFilemanagerDialog, setOpenFilemanagerDialog] = React.useState(false);

    const { enqueueSnackbar } = useSnackbar();
    const { ajax } = useAjax();

    let valueInital: ImageProps | null = null;

    try {
        if (typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }
    } catch (error) {
        valueInital = null;
    }

    if (!valueInital) valueInital = null;

    post[name] = valueInital;

    const [value] = React.useState(valueInital ? valueInital.link : '');
    const [valueInput, setValueInput] = React.useState(valueInital ? valueInital.link : '');
    const [render, setRender] = React.useState(0);
    const [openLoadingCustom, setOpenLoadingCustom] = React.useState(false);

    const filesActive = React.useState({});

    const handleClickOpenSourceDialog = () => {
        setValueInput(valueInital ? valueInital.link : '');
        setOpenSourDialog(true);
    };

    const handleCloseSourceDialog = () => {
        setOpenSourDialog(false);
    };

    const handleOkSourceDialog = () => {
        validateImage(valueInput, (result?: ImageObjectProps) => {
            console.log(result);
            if (result?.link) {
                post[name] = result;
                onReview(result);
                setOpenSourDialog(false);
                setOpenFilemanagerDialog(false);
            }
        });
    }

    const handleClickOpenFilemanagerDialog = () => {
        setOpenFilemanagerDialog(true);
    };

    const handleCloseFilemanagerDialog = () => {
        setOpenFilemanagerDialog(false);
    };

    const handleClickRemoveImage = () => {
        post[name] = '';
        onReview('');
        setRender(render + 1);
    };

    const validateImage = (linkImage: string, callback: (image?: ImageObjectProps) => void) => {

        // if (linkImage && linkImage.link) {

        setOpenLoadingCustom(true);

        let img = new Image();

        let link = linkImage;
        let src = link;
        let type_link = 'local';

        if (validURL(linkImage)) {
            if (process.env.REACT_APP_BASE_URL) {
                if (link.search(process.env.REACT_APP_BASE_URL) > -1) {
                    src = link;
                    link = link.replace(process.env.REACT_APP_BASE_URL, '/');
                } else {
                    type_link = 'external';
                }
            }
        } else {
            src = convertToURL(process.env.REACT_APP_BASE_URL, link);
            link = link.replace(process.env.REACT_APP_BASE_URL ?? '', '/');
        }


        img.onload = () => {

            let data: ImageObjectProps = {
                link: link,
                type_link: type_link,
                ext: linkImage.split('.').pop() ?? 'undefine',
                width: img.width,
                height: img.height
            };

            const conditionFunc: { [key: string]: (value: string | number) => true | string } = {
                width: (value: string | number): true | string => img.width === value ? true : 'Width: ' + value + 'px',
                minWidth: (value: string | number): true | string => img.width >= value ? true : 'Min Width: ' + value + 'px',
                maxWidth: (value: string | number): true | string => img.width <= value ? true : 'Max Width: ' + value + 'px',
                height: (value: string | number): true | string => img.height === value ? true : 'Height: ' + value + 'px',
                minHeight: (value: string | number): true | string => img.height >= value ? true : 'Min Height: ' + value + 'px',
                maxHeight: (value: string | number): true | string => img.height <= value ? true : 'Max Height: ' + value + 'px',
                ratio: (value: string | number): true | string => {
                    if (typeof value === 'string') {
                        let ratio = value.split(':');
                        if (img.width / img.height !== parseFloat(ratio[0]) / parseFloat(ratio[1])) {
                            return 'Ratio: ' + value;
                        }
                    }
                    return true;
                }
            };

            if (config.size) {

                let messages: string[] = [];

                Object.keys(config.size).forEach(key => {
                    if (conditionFunc[key] instanceof Function) {
                        let value = config.size[key] as (string | number);
                        let check = conditionFunc[key](value);
                        if (check !== true) {
                            messages.push(check);
                        }
                    }
                });

                if (messages.length > 0) {
                    enqueueSnackbar({
                        content: 'The image is not the correct size specified',
                        note: { time: new Date(), content: messages.map((m, index) => <Typography key={index} variant="body1">{m}</Typography>) },
                        type: 'note',
                        options: { preventDuplicate: false, variant: 'error', anchorOrigin: { vertical: 'bottom', horizontal: 'left' } }
                    },
                        { preventDuplicate: false, variant: 'error', anchorOrigin: { vertical: 'bottom', horizontal: 'left' } }
                    );
                    setOpenLoadingCustom(false);
                    callback();
                    return;
                }
            }

            if (config.thumbnail) {

                ajax({
                    url: 'image/thumbnail',
                    method: 'POST',
                    data: {
                        thumbnail: config.thumbnail,
                        data: data,
                    },
                    success: (result: ImageObjectProps) => {
                        if (result.link) {
                            callback(result);
                            setOpenLoadingCustom(false);
                        }
                    }
                });

            } else {
                callback(data);
                setOpenLoadingCustom(false);
            }

        };

        img.onerror = () => {
            setOpenLoadingCustom(false);
        }

        img.src = decodeURIComponent(src);

        // } else {
        //     callback({});
        // }
    }

    const handleChooseFile = (file: FileProps) => {

        validateImage(file.public_path, (result?: ImageObjectProps) => {
            if (result?.link) {
                post[name] = result;
                onReview(result);
                setOpenSourDialog(false);
                setOpenFilemanagerDialog(false);
            }
        });

    };

    React.useEffect(() => {

        if (render > 0) {
            validateImage(value, (data) => {
                post[name] = data;
                onReview(data);
                setRender(render + 1);
            });
        }
        //eslint-disable-next-line
    }, [value]);

    console.log('render IMAGE');
    return (
        <>
            <FormControl fullWidth component="fieldset">

                {
                    config.customUploadArea ?
                        <config.customUploadArea
                            config={config}
                            openDialog={handleClickOpenSourceDialog}
                            post={post}
                            ImageResult={<ImageResult
                                classes={classes}
                                post={post}
                                handleClickRemoveImage={handleClickRemoveImage}
                                name={name}
                                handleClickOpenSourceDialog={handleClickOpenSourceDialog}
                            />}
                            Note={
                                <InstructionNotes {...config} />
                            }
                        />
                        :
                        <>
                            <FormLabel style={{ marginBottom: 5 }} component="legend">{config.title}</FormLabel>
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gridGap: 8
                                }}
                            >

                                {
                                    post[name]?.link ?
                                        <Box
                                            style={{ width: 160 }}
                                            sx={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                flexDirection: "column",
                                                gridGap: 4
                                            }}
                                        >
                                            <ImageResult
                                                classes={classes}
                                                post={post}
                                                handleClickRemoveImage={handleClickRemoveImage}
                                                handleClickOpenSourceDialog={handleClickOpenSourceDialog}
                                                name={name}
                                            />
                                            <Typography onClick={handleClickOpenSourceDialog} variant="body1" color="primary" style={{ cursor: 'pointer' }}>{__('Change image')}</Typography>
                                        </Box>
                                        :
                                        <Box
                                            onClick={handleClickOpenSourceDialog}
                                            sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                padding: 2
                                            }}
                                            className={classes.uploadArea} >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gridGap: 4,
                                                    alignItems: "center"
                                                }}
                                            >
                                                <Icon icon="CloudUpload" className={classes.uploadIcon} fontSize="large" />
                                                <Button color="primary">{__('Choose image')}</Button>
                                            </Box>
                                        </Box>
                                }
                                <InstructionNotes {...config} />
                            </Box>
                        </>
                }
                <FormHelperText>{config.note}</FormHelperText>
            </FormControl>
            <DialogCustom
                open={openSourDialog}
                onClose={handleCloseSourceDialog}
                title="Insert/edit image"
                action={
                    <>
                        <Button onClick={handleCloseSourceDialog} color="inherit">
                            {__('Cancel')}
                        </Button>
                        <Button onClick={handleOkSourceDialog} color="primary">
                            {__('OK')}
                        </Button>
                    </>
                }
            >
                <Typography variant="body2" style={{ marginBottom: '1rem' }}>
                    {__('You can insert a link directly from the input or select an existing file from the system by clicking the button icon at the end of the input field')}
                </Typography>
                <FormControl fullWidth variant="outlined">
                    <InputLabel>{__('Source (URL)')}</InputLabel>
                    <OutlinedInput
                        fullWidth
                        type='text'
                        autoFocus
                        value={decodeURI(valueInput ? valueInput.replaceAll(process.env.REACT_APP_BASE_URL ?? '', '') : '')}
                        onChange={e => setValueInput(e.target.value)}
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="Open Filemanager"
                                    edge="end"
                                    onClick={handleClickOpenFilemanagerDialog}
                                >
                                    <Icon icon="FolderOpenOutlined" />
                                </IconButton>
                            </InputAdornment>
                        }
                        label={__('Source (URL)')}
                    />
                </FormControl>
                <LoadingCustom open={openLoadingCustom} style={{ zIndex: 1301 }} />
            </DialogCustom>

            <DrawerCustom
                open={openFilemanagerDialog}
                onClose={handleCloseFilemanagerDialog}
                TransitionComponent={Transition}
                disableEscapeKeyDown
                title={__('File Mangage')}
                width={1700}
                restDialogContent={{
                    style: {
                        padding: 0
                    }
                }}
            >
                <GoogleDrive
                    values={post[name]}
                    filesActive={filesActive}
                    fileType={['ext_image']}
                    handleChooseFile={handleChooseFile}
                    config={config}
                />
            </DrawerCustom>
        </>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})



interface ImageResultProps {
    classes: ANY,
    post: JsonFormat,
    handleClickRemoveImage: (event: React.MouseEvent<HTMLAnchorElement>) => void,
    handleClickOpenSourceDialog: () => void,
    name: string,
}

const ImageResult = ({ classes, post, handleClickRemoveImage, name, handleClickOpenSourceDialog }: ImageResultProps) => {
    if (post[name].link) {
        return <div style={{ position: 'relative' }} >
            <IconButton style={{ background: 'rgba(32,33,36,0.6)' }} onClick={handleClickRemoveImage} size="small" className={classes.removeImg} aria-label="Remove Image" component="span">
                <Icon icon="HighlightOffOutlined" style={{ color: 'rgba(255,255,255,0.851)' }} />
            </IconButton>
            <CardMedia
                onClick={handleClickOpenSourceDialog}
                style={{ maxWidth: '100%', width: 160, height: 160, cursor: 'pointer', background: 'url(/admin/fileExtension/trans.jpg)' }}
                component="img"
                image={validURL(post[name].link) ? post[name].link : convertToURL(process.env.REACT_APP_BASE_URL, post[name].link)}
            />
        </div>
    }
    return <></>;
};