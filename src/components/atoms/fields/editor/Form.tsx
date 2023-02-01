import { Box, InputLabel, SlideProps, Theme, useTheme } from '@mui/material'
import Icon from 'components/atoms/Icon'
import Loading from 'components/atoms/Loading'
import Slide from 'components/atoms/Slide'
import TextField from 'components/atoms/TextField'
import makeCSS from 'components/atoms/makeCSS'
import DrawerCustom from 'components/molecules/DrawerCustom'
import { makeid } from 'helpers/dom'
import { __ } from 'helpers/i18n'
import React from 'react'
import ReactDOMServer from 'react-dom/server'
import SpecialNotes from '../SpecialNotes'
import GoogleDrive, { FileProps } from '../image/GoogleDrive'
import { FieldFormItemProps } from '../type'
import Widget from './Widget'

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        '& .tox-editor-header': {
            width: 'var(--width)',
            zIndex: 1,
        },
        '& .tox-edit-area': {
            paddingTop: 'var(--toxHeaderHeight)',
        },
    },
    darkMode: {
        '& .tox .tox-menubar': {
            borderBottom: '1px solid ' + theme.palette.dividerDark,
        },
        '& .tox .tox-toolbar>*': {
            borderBottom: '1px solid ' + theme.palette.dividerDark,
            marginBottom: -1
        },
        '& .tox:not(.tox-tinymce-inline) .tox-editor-header': {
            borderBottom: '1px solid ' + theme.palette.dividerDark,
        },
        '& .tox .tox-menubar, & .tox .tox-toolbar,& .tox .tox-toolbar__overflow,& .tox .tox-toolbar__primary, & .tox .tox-statusbar, & .tox .tox-edit-area__iframe': {
            background: theme.palette.background.paper,
        },
        '& .tox-tinymce, & .tox:not([dir=rtl]) .tox-toolbar__group:not(:last-of-type), & .tox .tox-statusbar': {
            borderColor: theme.palette.dividerDark,
        },
        '& .tox .tox-mbtn, & .tox .tox-tbtn, & .tox .tox-statusbar a,& .tox .tox-statusbar__wordcount, & .tox .tox-statusbar__path-item, & .tox .tox-edit-area__iframe': {
            color: theme.palette.text.secondary,
            '--color': theme.palette.text.secondary,
            cursor: 'pointer',
        },
        '& .tox .tox-tbtn svg': {
            fill: theme.palette.text.secondary,
        },
        '& .tox .tox-tbtn:hover svg, & .tox .tox-tbtn--enabled svg, & .tox .tox-tbtn--enabled:hover svg, .tox .tox-tbtn:active svg,& .tox .tox-tbtn:focus:not(.tox-tbtn--disabled) svg': {
            fill: theme.palette.text.primary,
        },
        '& .tox .tox-mbtn:hover:not(:disabled):not(.tox-mbtn--active), & .tox .tox-tbtn:active, & .tox .tox-mbtn--active, & .tox .tox-mbtn:focus:not(:disabled), & .tox .tox-tbtn:hover, & .tox .tox-tbtn--enabled,& .tox .tox-tbtn--enabled:hover, &.tox .tox-tbtn:focus:not(.tox-tbtn--disabled)': {
            backgroundColor: theme.palette.backgroundSelected,
            color: theme.palette.text.primary,
            cursor: 'pointer',
        }
    },
    editor: {
        '&>.MuiInputLabel-outlined.MuiInputLabel-shrink': {
            transform: 'translate(14px, -11px) scale(0.75)'
        },
        '&>.MuiInputBase-root>textarea, &>label': {
            lineHeight: 2.2
        },
        '&>.MuiOutlinedInput-root': {
            padding: 0,
        },
        '& .tox.tox-tinymce': {
            width: '100%',
            minHeight: 400,
        }
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
        color: '#fff'
    },
}))

const Transition = React.forwardRef(function Transition(props: SlideProps, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default React.memo(function TextareaForm({ config, post, name, onReview }: FieldFormItemProps) {

    const theme = useTheme();

    const classes = useStyles()

    const [id, setId] = React.useState<string | false>(false);

    const valueInital = post && post[name] ? post[name] : '';
    const [value, setValue] = React.useState(0);
    const [loadScript, setLoadScript] = React.useState(false);

    const [isLoadedEditor, setIsloadedEditor] = React.useState(false);

    const filesActive = React.useState({});

    const [openFilemanagerDialog, setOpenFilemanagerDialog] = React.useState(false);
    const [fileType, setFileType] = React.useState<string[]>([]);
    const [openWidgetDialog, setOpenWidgetDialog] = React.useState(false);

    const [widgetData, setWidgetData] = React.useState<JsonFormat>({});

    const [editor, setEditor] = React.useState<ANY>(null);

    const widgets = React.useState<JsonFormat | false>(false);

    let interval: NodeJS.Timeout;

    React.useEffect(() => {

        let id = 'editor_' + makeid(10, 'editor');

        while (document.getElementById(id)) {
            id = 'editor_' + makeid(10, 'editor');
        }

        setId(prev => id);

        if (!document.getElementById('tynymce')) {

            const script = document.createElement("script");
            script.id = 'tynymce';
            script.src = '/admin/tinymce/tinymce.min.js';
            script.async = true;

            script.onload = () => {
                setLoadScript(true);
            };
            document.body.appendChild(script);

        } else {

            if (!window.tinymce) {
                reloadEditor();
            } else {
                setLoadScript(true);
            }
        }

        return () => {
            window.tinymce?.get(id)?.remove();
        };

    }, []);

    const reloadEditor = () => {
        interval = setInterval(() => {
            if (window.tinymce) {
                setLoadScript(true);
                clearInterval(interval);
            }
        }, 10);
    }


    const handleCloseFilemanagerDialog = () => {
        setOpenFilemanagerDialog(false);
    };

    const handleClickOpenFilemanagerDialog = () => {
        setOpenFilemanagerDialog(true);
    };

    const handleOpenEditWidget = (editor: ANY) => {

        let node = editor.selection.getNode();

        let body = node.closest('body');

        body.querySelectorAll('.widget-selected').forEach((item: HTMLElement) => {
            item.classList.remove('widget-selected');
        });

        let data = {};

        if (node.classList.contains('widget')) {

            node.classList.add('widget-selected');

            data = JSON.parse(node.getAttribute('data-json'));

            if (!data) {
                data = {};
            }
        }

        setWidgetData(data);
        setOpenWidgetDialog(true);

    };

    const handleScrollWarperMain = () => {

        document.querySelectorAll('.warpper-editor').forEach(function (el) {

            let $menubar = el.querySelector('.tox-editor-header');

            if ($menubar) {

                //eslint-disable-next-line
                //@ts-ignore
                el.setAttribute('style', '--width:' + (el.offsetWidth - 2) + 'px; --toxHeaderHeight:' + $menubar.offsetHeight + 'px;');

                let $tinymce_editor = el.querySelector('.tox-tinymce'),
                    top = el.getBoundingClientRect().top, dk = false;

                //eslint-disable-next-line
                //@ts-ignore
                if ($tinymce_editor.style.opacity === 1) {
                    //eslint-disable-next-line
                    //@ts-ignore
                    dk = top + el.offsetHeight > 356 + $menubar.offsetHeight;
                } else {
                    //eslint-disable-next-line
                    //@ts-ignore
                    dk = top + el.offsetHeight > 356;
                }

                let positionTop = (document.getElementById('header-top')?.clientHeight ?? 0) + (document.getElementById('header-section-top')?.clientHeight ?? 0);

                if (top <= positionTop && dk) {
                    //eslint-disable-next-line
                    //@ts-ignore
                    Object.assign($menubar.style, { position: 'fixed', top: positionTop + 'px', left: 'unset' });
                } else {
                    //eslint-disable-next-line
                    //@ts-ignore
                    Object.assign($menubar.style, { position: 'absolute', top: '0', left: '0' });
                }
            }
        });

    }

    React.useEffect(() => {

        if (loadScript) {
            //eslint-disable-next-line
            //@ts-ignore
            if (!document.querySelector('#warperMain').classList.contains('hasEventScroll')) {
                //eslint-disable-next-line
                //@ts-ignore
                document.querySelector('#warperMain').classList.add('hasEventScroll');


                //eslint-disable-next-line
                //@ts-ignore
                document.querySelector('#warperMain').addEventListener('scroll', function () {
                    handleScrollWarperMain();
                });
            }

            window.tinymce?.get(id)?.remove();
            if (window.tinymce) {
                window.tinymce.init({
                    selector: '#' + id,
                    auto_resize: true,
                    toolbar_sticky: true,
                    placeholder: __('Write something awesome...'),
                    // height: 800,
                    verify_html: false,
                    skin: 'oxide' + (theme.palette.mode === 'dark' ? '-dark' : ''),
                    extended_valid_elements: true,
                    fontsize_formats: "8px 10px 12px 14px 16px 18px 24px 36px 48px 72px",
                    setup: function (editor: ANY) {

                        editor.on('click', function (e: Event) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (config.clickElementCallback) {
                                config.clickElementCallback(editor, e);
                            }
                        });

                        editor.on('dblclick', function () {
                            let element = editor.selection.getNode();

                            if (element.classList.contains('widget')) {
                                handleOpenEditWidget(editor);
                            }
                        });

                        editor.on('paste', function () {
                            //
                        });

                        editor.on('focusout', function () {
                            onReview(editor.getContent());
                        });

                        editor.on('change', function () {
                            editor.save();
                        });

                        editor.on('init', function (_args: ANY) {
                            setEditor(editor);

                            handleScrollWarperMain();

                            let css = ':root { --color: ' + theme.palette.text.primary + ' }.mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before{color: ' + theme.palette.text.secondary + ';opacity:0.7}' + (config.editoStyle ?? ''),
                                head = document.head || document.getElementsByTagName('head')[0],
                                style = document.createElement('style');

                            head.appendChild(style);

                            editor.dom.$('head').append(style);

                            style.type = 'text/css';

                            //eslint-disable-next-line
                            //@ts-ignore
                            if (style.styleSheet) {
                                //eslint-disable-next-line
                                //@ts-ignore
                                style.styleSheet.cssText = css;
                            } else {
                                style.appendChild(document.createTextNode(css));
                            }

                            setIsloadedEditor(true);
                            // var scriptId = editor.dom.uniqueId();

                            // var scriptElm = editor.dom.create('script', {
                            //     id: scriptId,
                            //     type: 'text/javascript',
                            //     src: '/themes/vn4cms-ecommerce/scripts/uikit.js'
                            // });

                            // editor.getDoc().getElementsByTagName('head')[0].appendChild(scriptElm);
                        });


                        //Add Widget
                        editor.ui.registry.addIcon('widgetIcon', ReactDOMServer.renderToString(<Icon style={{ width: 24, height: 24 }} icon={{ custom: '<image style="width:100%;" href="/admin/images/page_builder_icon.svg"></image>' }} />));

                        editor.ui.registry.addButton('widget', {
                            icon: 'widgetIcon',
                            tooltip: 'Widget',
                            text: 'Widget',
                            onAction: () => {
                                handleOpenEditWidget(editor);
                            }
                        });
                    },
                    formats: {
                        underline: { inline: 'u', exact: true }
                    },

                    plugins: [
                        'autoresize advlist imagetools codesample powerpaste wordcount autolink template lists link image charmap print preview anchor codemirror searchreplace visualblocks help insertdatetime media table  biongFilemanager'
                    ],
                    codemirror: {
                        indentOnInit: true,
                        path: 'codemirror-4.8',
                        config: {
                            lineNumbers: true
                        }
                    },
                    toolbar: ['fontselect |  fontsizeselect | sizeselect | formatselect | bold italic underline | alignleft aligncenter alignright alignjustify | forecolor backcolor | bullist numlist outdent indent | link image biongFilemanager media | codesample code | removeformat widget'],
                    codesample_languages: [
                        { text: 'HTML/XML', value: 'markup' },
                        { text: 'JavaScript', value: 'javascript' },
                        { text: 'CSS', value: 'css' },
                        { text: 'PHP', value: 'php' },
                        { text: 'Ruby', value: 'ruby' },
                        { text: 'Python', value: 'python' },
                        { text: 'Java', value: 'java' },
                        { text: 'C', value: 'c' },
                        { text: 'C#', value: 'csharp' },
                        { text: 'C++', value: 'cpp' }
                    ],
                    image_caption: true,
                    file_browser_callback_types: 'file image media',
                    automatic_uploads: false,
                    autoresize_on_init: false,
                    template_cdate_format: '[CDATE: %m/%d/%Y : %H:%M:%S]',
                    template_mdate_format: '[MDATE: %m/%d/%Y : %H:%M:%S]',
                    image_title: true,
                    body_class: 'editor-content',
                    powerpaste_word_import: 'prompt',
                    powerpaste_html_import: 'prompt',
                    content_css: [
                        '/admin/tinymce/themes/article.css',
                    ],
                    // external_filemanager_path: process.env.REACT_APP_BASE_URL,
                    OpenFileManager: (type: string[]) => {
                        setFileType(type);
                        handleClickOpenFilemanagerDialog();
                    },
                    filemanager_title: "Quản lý file",
                    external_plugins: {
                        "filemanager": "/admin/tinymce/plugins/biongFilemanager/ImageAddOn.js",
                        // "example": "/admin/js/tinymce/plugin/customplugin.js"
                    },
                    ...config.editorProps
                });
            }
        }

    }, [loadScript, theme]);

    const handleChooseFile = (file: FileProps) => {
        window.__insertEditImageCallback(file.public_path, file);
        handleCloseFilemanagerDialog();
    }

    const handleChooseWidgetDialog = () => {
        setOpenWidgetDialog(false);
    }

    const handleEditWidget = (widget: JsonFormat, html: string) => {

        let node = editor.selection.getNode();

        let nodeSelected = node.querySelector('.widget-selected');

        // let newElement = ReactDOMServer.renderToString(<div contentEditable={false} data={JSON.stringify(widget)} className="widget new-element"><MaterialIcon style={{ width: 16, marginRight: 5 }} icon={{ custom: '<image style="width:100%;" href="' + widgets[0][widgetData.__widget_type].icon + '" />' }} />{widget.__title}</div>);
        let newElement = ReactDOMServer.renderToString(<div contentEditable={false} data-json={JSON.stringify(widget)} className="widget new-element" dangerouslySetInnerHTML={{ __html: html }} />);

        if (nodeSelected) {
            nodeSelected.outerHTML = newElement;
        } else {
            editor.insertContent(newElement);
        }

        onReview(editor.getContent());

        let body = node.closest('body');
        body?.querySelectorAll('.widget-selected')?.forEach((item: Element) => {
            item.classList.remove('widget-selected');
        });
    }

    console.log('render EDITOR');
    if (id) {
        return (
            <>
                {
                    !isLoadedEditor &&
                    <Box
                        sx={{
                            maxWidth: '100%',
                            height: 300,
                            position: 'relative',
                        }}
                    >
                        <Loading open={true} isCover />
                    </Box>
                }
                <Box
                    sx={{
                        maxWidth: '100%',
                        minHeight: 300,
                        position: !isLoadedEditor ? 'absolute' : 'relative',
                        opacity: !isLoadedEditor ? 0 : 1,
                    }}
                >
                    {
                        Boolean(config.title) &&
                        <InputLabel {...config.labelProps} sx={{ transform: 'none', position: 'unset' }}>{config.title}</InputLabel>
                    }
                    <SpecialNotes specialNotes={config.special_notes} />
                    <div className={classes.root + " warpper-editor " + (theme.palette.mode === 'dark' ? classes.darkMode : '')} >
                        <TextField
                            fullWidth
                            multiline
                            className={classes.editor}
                            variant="outlined"
                            name={name}
                            value={valueInital}
                            helperText={config.note}
                            id={id}
                            onBlur={e => { onReview(e.target.value) }}
                            onChange={e => { setValue(value + 1); post[name] = e.target.value }}
                        />
                        <DrawerCustom
                            open={openFilemanagerDialog}
                            onClose={handleCloseFilemanagerDialog}
                            TransitionComponent={Transition}
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
                                fileType={fileType}
                                handleChooseFile={handleChooseFile}
                                filesActive={filesActive}
                                config={{}}
                            />
                        </DrawerCustom>

                        <DrawerCustom
                            open={openWidgetDialog}
                            onClose={handleChooseWidgetDialog}
                            TransitionComponent={Transition}
                            title={__('Edit Widget')}
                            restDialogContent={{
                                style: {
                                    padding: 0,
                                }
                            }}
                        >
                            <Widget
                                post={widgetData}
                                editWiget={widgetData.__widget_type ? true : false}
                                widgets={{ data: widgets[0], set: widgets[1] }}
                                onSubmit={(html) => {
                                    handleEditWidget(widgetData, html);
                                    handleChooseWidgetDialog();
                                }}
                            />
                        </DrawerCustom>
                    </div>
                </Box>
            </>
        )
    }
    return null;
}, (props1, props2) => {
    return props1.post[props1.name] === props2.post[props2.name];
})
