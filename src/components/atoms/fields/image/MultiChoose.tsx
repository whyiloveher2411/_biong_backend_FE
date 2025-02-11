import { Theme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import FormControl from 'components/atoms/FormControl';
import FormHelperText from 'components/atoms/FormHelperText';
import FormLabel from 'components/atoms/FormLabel';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import InputLabel from 'components/atoms/InputLabel';
import { default as LoadingCustom } from 'components/atoms/Loading';
import OutlinedInput from 'components/atoms/OutlinedInput';
import Slide from 'components/atoms/Slide';
import Typography from 'components/atoms/Typography';
import { default as DialogCustom } from 'components/molecules/Dialog';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { addClasses } from 'helpers/dom';
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

const useStyles = makeStyles((theme: Theme) => ({

    removeImg: {
        position: 'absolute',
        top: 3,
        right: 3,
        zIndex: 2,
        background: 'rgba(32,33,36,0.6)',
        '&:hover': {
            background: 'rgba(32,33,36,0.8)',
        }
    },
    gridList: {
        padding: "0",
        listStyle: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        userSelect: "none",
        display: "grid",
        gridGap: "5px",
        gridTemplateColumns: "repeat(auto-fill, var(--widthThumbnail, 160px))",
        gridAutoFlow: "row dense",
        '& .ghost': {
            border: '1px dashed #000',
            backgroundColor: '#ececec',
            '& *': {
                opacity: '0'
            }
        }
    },
    noGrid: {
        display: 'block',
    },
    gridListItem: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        border: '1px solid transparent',
        position: 'relative',
        '&:first-child': {
            gridArea: 'span 2/span 2',
        },
        '& .inside': {
            paddingTop: '100%',
        },
        '&:not(.uploadFile)': {
            cursor: 'move'
        }
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        bottom: 0,
        right: 0,
        zIndex: 1,
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        backgroundImage: 'url(/admin/fileExtension/trans.jpg)'
    },
    uploadIcon: {
        color: theme.palette.text.secondary
    },
    uploadArea: {
        border: '1px dashed ' + theme.palette.text.secondary,
        minHeight: 'var(--widthThumbnail, 160px)',
        minWidth: 'var(--widthThumbnail, 160px)',
        padding: 16,
        borderRadius: 8,
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: theme.palette.dividerDark
        }
    }
}));

export default React.memo(function MultiChoose2(props: FieldFormItemProps) {

    const { config, post, name } = props;

    const classes = useStyles();

    const [openSourDialog, setOpenSourDialog] = React.useState(false);
    const [openFilemanagerDialog, setOpenFilemanagerDialog] = React.useState(false);

    const { enqueueSnackbar } = useSnackbar();
    const { ajax } = useAjax();

    let valueInital = [];

    try {
        if (typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }
    } catch (error) {
        valueInital = [];
    }

    if (!valueInital) valueInital = [];

    post[name] = valueInital;

    const [value, setValue] = React.useState(valueInital);
    const [inputDialog, setInputDialog] = React.useState(valueInital);
    const [openLoadingCustom, setOpenLoadingCustom] = React.useState(false);

    const filesActive = React.useState<{ [key: string]: ANY }>({});

    const handleClickOpenSourceDialog = () => {
        setInputDialog(post[name]);
        setOpenSourDialog(true);
    };

    const handleCloseSourceDialog = () => {
        setOpenSourDialog(false);
    };

    const handleOkSourceDialog = () => {
        // setValue({ link: inputDialog });
        setOpenSourDialog(false);
    }

    const onReview = (value: JsonFormat[]) => {
        post[name] = [...value];
        setValue(value);
        props.onReview([...value]);
    }

    const handleClickOpenFilemanagerDialog = () => {
        filesActive[1](() => {
            let filesActiveTemp: JsonFormat = {};
            value.forEach((item: ImageObjectProps, index: number) => {
                filesActiveTemp[item.link] = { ...item, index: index };
            });
            return filesActiveTemp;
        });
        setOpenFilemanagerDialog(true);
    };

    const handleCloseFilemanagerDialog = () => {

        onReview(post[name]);
        setOpenSourDialog(false);
        setOpenFilemanagerDialog(false);

    };

    const handleSaveFilemanagerDialog = () => {

        let images: ImageObjectProps[] = [];

        Object.keys(filesActive[0]).forEach(key => {
            let index = filesActive[0][key].index;
            // delete filesActive[0][key].index;
            if (!(index > -1)) {
                images.push({
                    ...filesActive[0][key]
                });
            }
        });

        let valueTemp = [...post[name], ...images];
        let valueTemp2 = [...value, ...images];
        onReview(valueTemp);
        setTimeout(() => {
            onReview(valueTemp2);
        }, 0);
        setOpenSourDialog(false);
        setOpenFilemanagerDialog(false);
        dragstart();
    };

    const handleClickRemoveImage = (index: number) => {
        let temp = post[name];
        temp.splice(index, 1);

        onReview(temp);
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
                width: (value: string | number): true | string => Number(img.width) === Number(value) ? true : 'Width: ' + value + 'px',
                minWidth: (value: string | number): true | string => Number(img.width) >= Number(value) ? true : 'Min Width: ' + value + 'px',
                maxWidth: (value: string | number): true | string => Number(img.width) <= Number(value) ? true : 'Max Width: ' + value + 'px',
                height: (value: string | number): true | string => Number(img.height) === Number(value) ? true : 'Height: ' + value + 'px',
                minHeight: (value: string | number): true | string => Number(img.height) >= Number(value) ? true : 'Min Height: ' + value + 'px',
                maxHeight: (value: string | number): true | string => Number(img.height) <= Number(value) ? true : 'Max Height: ' + value + 'px',
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

            if (result && result.link) {
                if (filesActive[0]['/' + file.dirpath + '/' + file.basename]) {
                    delete filesActive[0]['/' + file.dirpath + '/' + file.basename];
                    filesActive[1]({ ...filesActive[0] });
                } else {
                    filesActive[0]['/' + file.dirpath + '/' + file.basename] = result;
                    filesActive[1]({ ...filesActive[0] });
                }
            }

        });
    }


    const dragstart = () => {

        let section = document.getElementById('listImage' + name);

        if (!section) return;

        let indexEvent = section.dataset.eventIndex || 0;

        if (!section.dataset.eventIndex) {
            //eslint-disable-next-line
            // @ts-ignore: vanilla javascript
            section.dataset.eventIndex = 1;
        } else {
            //eslint-disable-next-line
            // @ts-ignore: vanilla javascript
            section.dataset.eventIndex = parseInt(section.dataset.eventIndex) + 1;
        }

        //eslint-disable-next-line
        // @ts-ignore: vanilla javascript
        let dragEl, nextEl, newPos;

        //eslint-disable-next-line
        // @ts-ignore: vanilla javascript
        function _onDragOver(e) {
            //eslint-disable-next-line
            // @ts-ignore: vanilla javascript
            if (section.dataset.eventIndex - indexEvent === 1) {
                e.dataTransfer.dropEffect = 'move';

                let target = e.currentTarget;
                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                if (target && target !== dragEl && target.nodeName === 'DIV') {
                    if (target.classList.contains('inside')) {
                        e.stopPropagation();
                    } else {
                        let targetPos = target.getBoundingClientRect();
                        let next = (e.clientY - targetPos.top) / (targetPos.bottom - targetPos.top) > .5 || (e.clientX - targetPos.left) / (targetPos.right - targetPos.left) > .5;

                        if (!target.classList.contains('uploadFile')) {
                            //eslint-disable-next-line
                            // @ts-ignore: vanilla javascript
                            section.insertBefore(dragEl, next ? target.nextSibling : target);
                        }
                    }
                }
            }

        }

        function _onDragEnd() {
            //eslint-disable-next-line
            // @ts-ignore: vanilla javascript
            if (section.dataset.eventIndex - indexEvent === 1) {
                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                newPos = [...section.children].map((child, index) => {
                    if (child.id) {
                        //eslint-disable-next-line
                        // @ts-ignore: vanilla javascript
                        let data = document.getElementById(child.id).getBoundingClientRect();
                        //eslint-disable-next-line
                        // @ts-ignore: vanilla javascript
                        data.index = child.dataset.index;
                        child.dataset.index = index;
                        child.id = 'div' + index;
                        return data;
                    }
                    return null;
                });

                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                dragEl.classList.remove('ghost');
                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                section.removeEventListener('dragover', _onDragOver, false);
                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                section.removeEventListener('dragend', _onDragEnd, false);

                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                if (nextEl !== dragEl.nextSibling) {

                    let temp = post[name];
                    //eslint-disable-next-line
                    // @ts-ignore: vanilla javascript
                    let valueTemp = [];
                    newPos.forEach(item => {
                        if (item) {
                            //eslint-disable-next-line
                            // @ts-ignore: vanilla javascript
                            valueTemp.push(temp[item.index]);
                        }
                    });
                    //eslint-disable-next-line
                    // @ts-ignore: vanilla javascript
                    onReview(valueTemp);
                }
            }
        }

        section.addEventListener('dragstart', function (e) {

            //eslint-disable-next-line
            // @ts-ignore: vanilla javascript
            if (section.dataset.eventIndex - indexEvent === 1) {
                e.stopPropagation();
                dragEl = e.target;
                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                nextEl = dragEl.nextSibling;

                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                e.dataTransfer.effectAllowed = 'move';
                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                e.dataTransfer.setData('Text', dragEl.textContent);

                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                section.querySelectorAll('.gridListItem').forEach(element => {
                    element.addEventListener('dragover', _onDragOver, false);
                });

                //eslint-disable-next-line
                // @ts-ignore: vanilla javascript
                section.addEventListener('dragend', _onDragEnd, false);

                setTimeout(function () {
                    //eslint-disable-next-line
                    // @ts-ignore: vanilla javascript
                    dragEl.classList.add('ghost');
                }, 0)
            }

        });
    }

    React.useEffect(() => {
        if (document.getElementById('listImage' + name)) {
            dragstart();
        }
        if (props.times === 0) {
            onReview(post[name]);
        }

        //eslint-disable-next-line
    }, []);

    return (
        <>
            <FormControl fullWidth>
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
                                handleClickOpenSourceDialog={handleClickOpenSourceDialog}
                                name={name}
                            />}
                            Note={
                                <InstructionNotes {...config} />
                            }
                        />
                        :
                        <>
                            <FormLabel style={{ marginBottom: 5 }} component="legend">{config.title}</FormLabel>
                            < div
                                className={addClasses({
                                    [classes.gridList]: true,
                                    [classes.noGrid]: Boolean(!post[name] || post[name].length < 1)
                                })}
                                id={'listImage' + name}
                                draggable={false}
                                style={{ ['--widthThumbnail' as string]: config.widthThumbnail ?? '160px' }}
                            >
                                <ImageResult
                                    classes={classes}
                                    post={post}
                                    handleClickRemoveImage={handleClickRemoveImage}
                                    handleClickOpenSourceDialog={handleClickOpenSourceDialog}
                                    name={name}
                                />
                            </div>
                            <InstructionNotes {...config} />
                        </>
                }
                <FormHelperText>{config.note}</FormHelperText>
                <LoadingCustom open={openLoadingCustom} style={{ zIndex: 1301 }} />
            </FormControl >
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
                        value={unescape(inputDialog.length ? JSON.stringify(inputDialog) : '')}
                        onChange={e => setInputDialog(e.target.value)}
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
            </DialogCustom>

            <DrawerCustom
                open={openFilemanagerDialog}
                onClose={handleCloseFilemanagerDialog}
                TransitionComponent={Transition}
                disableEscapeKeyDown
                title={__('File Mangage')}
                width={2500}
                restDialogContent={{
                    style: {
                        padding: 0
                    }
                }}
                headerAction={<Button color='inherit' autoFocus onClick={handleSaveFilemanagerDialog}>
                    {__('Save Changes')}
                </Button>}
            >
                <GoogleDrive
                    values={post[name]}
                    handleChooseFile={handleChooseFile}
                    fileType={['ext_image']}
                    filesActive={filesActive}
                    config={config}
                />

            </DrawerCustom>
        </>
    )
}, (props1, props2) => {
    return JSON.stringify(props1.post[props1.name]) !== JSON.stringify(props2.post[props2.name]);
})

interface ImageResultProps {
    classes: ANY,
    post: JsonFormat,
    handleClickRemoveImage: (index: number) => void,
    handleClickOpenSourceDialog: () => void,
    name: string,
}

const ImageResult = ({ classes, post, handleClickRemoveImage, handleClickOpenSourceDialog, name }: ImageResultProps) => {
    return <>
        {
            post[name].map((ele: ImageObjectProps, index: number) => (
                <div data-index={index} id={'div' + index} key={index} draggable={true} className={classes.gridListItem + ' gridListItem '}>
                    <div className='inside'>
                        <IconButton
                            onClick={() => handleClickRemoveImage(index)}
                            size="small"
                            className={classes.removeImg}
                            aria-label="Remove Image"
                            component="span"
                        >
                            <Icon icon="HighlightOffOutlined" style={{ color: 'rgba(255,255,255,0.851)' }} />
                        </IconButton>
                        <img
                            draggable={false}
                            className={classes.image}
                            src={validURL(ele.link) ? ele.link : convertToURL(process.env.REACT_APP_BASE_URL, ele.link)}
                            alt="field"
                        />
                    </div>
                </div>
            ))
        }
        <div draggable={false} className={classes.gridListItem + ' gridListItem uploadFile'}>
            <div className='inside' style={{ paddingTop: 0 }}>
                <Box onClick={handleClickOpenSourceDialog} display="flex" alignItems="center" justifyContent="center" padding={2} className={classes.uploadArea} style={{ height: 'auto', width: 'auto' }} >
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gridGap: 4,
                            alignItems: "center"
                        }}
                    >
                        <Icon icon="CloudUpload" className={classes.uploadIcon} fontSize="large" />
                        {/* <Button color="primary">{__('Add Images')}</Button> */}
                    </Box>
                </Box>
            </div>
        </div>
    </>
};