import { Theme } from '@mui/material';
import Button from 'components/atoms/Button';
import CardMedia from 'components/atoms/CardMedia';
import FormControl from 'components/atoms/FormControl';
import FormGroup from 'components/atoms/FormGroup';
import FormHelperText from 'components/atoms/FormHelperText';
import FormLabel from 'components/atoms/FormLabel';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import InputLabel from 'components/atoms/InputLabel';
import makeCSS from 'components/atoms/makeCSS';
import OutlinedInput from 'components/atoms/OutlinedInput';
import Slide from 'components/atoms/Slide';
import Typography from 'components/atoms/Typography';
import Dialog from 'components/molecules/Dialog';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { __ } from 'helpers/i18n';
import { validURL } from 'helpers/url';
import React from 'react';
import GoogleDrive, { FileProps } from '../image/GoogleDrive';
import SpecialNotes from '../SpecialNotes';
import { FieldFormItemProps } from '../type';


const Transition = React.forwardRef(function Transition(props: { [key: string]: ANY, children: ANY }, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        position: 'absolute',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        background: 'white',
    },
    title: {
        marginLeft: theme.spacing(1),
        flex: 1,
        color: '#fff'
    },
    removeImg: {
        position: 'absolute',
        top: 3,
        right: 3
    }
}));

export default React.memo(function ImageForm(props: FieldFormItemProps) {

    const { config, post, name, onReview } = props;

    const classes = useStyles();

    let valueInital: {
        link?: string,
    } = {};

    try {
        if (post[name] && typeof post[name] === 'object') {
            valueInital = post[name];
        } else {
            if (post[name]) {
                valueInital = JSON.parse(post[name]);
            }
        }
    } catch (error) {
        valueInital = {};
    }

    if (!valueInital) valueInital = {};

    post[name] = valueInital;

    const [openSourDialog, setOpenSourDialog] = React.useState(false);
    const [openFilemanagerDialog, setOpenFilemanagerDialog] = React.useState(false);

    const [value, setValue] = React.useState<string | null>(valueInital.link ?? '');
    const [valueInput, setValueInput] = React.useState<string | null>(valueInital.link ?? '');
    const [render, setRender] = React.useState(0);



    // React.useEffect(() => {

    //     onReview(valueInital);
    //     setValue(valueInital.link ?? '');
    //     setValueInput(valueInital.link ?? '');
    // }, []);



    const handleClickOpenSourceDialog = () => {
        setValueInput(post[name].link);
        setOpenSourDialog(true);
    };

    const handleCloseSourceDialog = () => {
        setOpenSourDialog(false);
    };

    const handleOkSourceDialog = () => {
        setValue(valueInput);
        setOpenSourDialog(false);
    }

    const handleClickOpenFilemanagerDialog = () => {
        setOpenFilemanagerDialog(true);
    };

    const handleCloseFilemanagerDialog = () => {
        setOpenFilemanagerDialog(false);
    };

    const handleClickRemoveImage = () => {
        setValue('');
    };

    React.useEffect(() => {
        if (value) {

            let type_link = 'local';
            let link = value;

            if (validURL(link)) {

                if (!(value.search(process.env.REACT_APP_BASE_URL ?? '') > -1)) {
                    type_link = 'external';
                } else {
                    link = link.replace(process.env.REACT_APP_BASE_URL ?? '', '');
                }
            }

            let v = {
                link: link,
                type_link: type_link,
                ext: value.split('.').pop(),
            };
            post[name] = v;
            onReview(v);
            setRender(render + 1);
        } else {
            post[name] = {};
            onReview({});
            setRender(render + 1);
        }
    }, [value]);

    const filesActive = React.useState({});

    const handleChooseFile = (file: FileProps) => {
        setValueInput(file.public_path);
        setOpenFilemanagerDialog(false);
    };

    return (

        <FormControl component="fieldset">
            <FormLabel style={{ marginBottom: 4 }} component="legend">{config.title}</FormLabel>

            {Boolean(post[name]?.link) &&
                <div>
                    <div style={{ marginBottom: 5, position: 'relative', display: 'inline-block' }}>
                        <IconButton style={{ background: 'rgba(32,33,36,0.6)' }} onClick={handleClickRemoveImage} size="small" className={classes.removeImg} aria-label="Remove Image" component="span">
                            <Icon icon="HighlightOffOutlined" style={{ color: 'rgba(255,255,255,0.851)' }} />
                        </IconButton>
                        {
                            Boolean(post[name].ext) &&
                            <CardMedia
                                onClick={handleClickOpenSourceDialog}
                                style={{ maxWidth: '100%', width: 'auto', cursor: 'pointer' }}
                                component="img"
                                image={typeof post[name].ext === 'string' ? '/admin/fileExtension/ico/' + (post[name].ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + '.jpg') : ''}
                            />
                        }
                    </div>
                    <Typography variant="body2" style={{ marginBottom: 16, wordBreak: 'break-all' }}>
                        {typeof post[name].link === 'string' ? decodeURI(post[name].link.replace(/^.*[\\/]/, '')) : ''}
                    </Typography>
                </div>
            }
            <FormGroup>
                <div>
                    <Button
                        key='left'
                        variant="contained"
                        color="inherit"
                        startIcon={<Icon icon="InsertDriveFileOutlined" />}
                        onClick={handleClickOpenSourceDialog}
                    >
                        {__('Choose File')}
                    </Button>
                </div>

                <Dialog
                    open={openSourDialog}
                    onClose={handleCloseSourceDialog}
                    title={__('Insert/edit File')}
                    action={
                        <>
                            <Button onClick={handleCloseSourceDialog}>
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
                        <InputLabel htmlFor="outlined-adornment-password">{__('Source (URL)')}</InputLabel>
                        <OutlinedInput
                            fullWidth
                            type='text'
                            value={unescape(valueInput ? valueInput.replace(process.env.REACT_APP_BASE_URL ?? '', '') : '')}
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
                        >
                            <GoogleDrive
                                values={{}}
                                filesActive={filesActive}
                                fileType={['ext_file', 'ext_image', 'ext_misc', 'ext_video', 'ext_music']}
                                handleChooseFile={handleChooseFile}
                                config={config}
                            />
                        </DrawerCustom>
                    </FormControl>
                </Dialog>
            </FormGroup>
            <FormHelperText>{config.note}</FormHelperText>
            <SpecialNotes specialNotes={config.special_notes} />
        </FormControl>
    )
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
