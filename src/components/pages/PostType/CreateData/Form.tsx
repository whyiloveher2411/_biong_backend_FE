import { CircularProgress, CircularProgressProps, Collapse, Theme, Typography } from '@mui/material';
import Box from 'components/atoms/Box';
import LoadingButton from 'components/atoms/LoadingButton';
import Button from 'components/atoms/Button';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import makeCSS from 'components/atoms/makeCSS';
import Tooltip from 'components/atoms/Tooltip';
import Hook from 'components/function/Hook';
import { addClasses } from 'helpers/dom';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';
import { HandleUpdateDataProps } from 'hook/useForm';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatePostTypeData } from '.';
import SectionInfo from './SectionInfo';
import SectionStatus from './SectionStatus';
import ContentAiWizard from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/ContentAiWizard';
import ArticleRewriteDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/ArticleRewriteDrawer';
import MarketingContentTranslateDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/MarketingContentTranslateDrawer';
import NotificationAiDrawer from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/LocalNotification/NotificationAiDrawer';


const useStyles = makeCSS((theme: Theme) => ({
    card: {
        marginTop: theme.spacing(3),
    },
    root: {
        flexGrow: 1,
        display: 'flex',
        minHeight: 224,
    },
    chipUser: {
        marginRight: 4
    },
    tabs: {
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${theme.palette.divider}`,
        position: 'relative',
        minWidth: 160,
        maxWidth: 320,
        width: 'max-content',
        flexShrink: 0,
        '&>.indicator': {
            backgroundColor: '#3f51b5',
            position: 'absolute',
            right: 0,
            width: 2,
            height: 48,
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
        },
        '&>button': {
            minWidth: 160, maxWidth: 320, width: '100%', height: 48, opacity: 0.7,
            fontSize: 15,
            textTransform: 'unset',
            fontWeight: 'normal',
            justifyContent: 'flex-start',
            '&.active': {
                opacity: 1,
                color: theme.palette.primary.main,
            },
            '& span': {
                textOverflow: "ellipsis", overflow: "hidden", whiteSpace: 'nowrap',
            }
        },
        '& .MuiButton-label': {
            justifyContent: 'left'
        }
    },
    tabsItem: {
        padding: '6px 16px'
    },
    tabContent: {
        paddingLeft: 24,
        flex: 1,
        minWidth: 0,
    }

}));

interface FormCreateDataProps {
    data: CreatePostTypeData,
    postType: string,
    open: boolean,
    onUpdateData: HandleUpdateDataProps,
    handleSubmit: () => void,
    handleAfterDelete?: () => void,
    showCopyPostJson?: boolean,
    onRefreshPost?: () => void,
    refreshingPost?: boolean,
}

function Form({
    data,
    postType,
    onUpdateData,
    handleSubmit,
    handleAfterDelete,
    open: openLoading,
    showCopyPostJson = true,
    onRefreshPost,
    refreshingPost = false,
}: FormCreateDataProps) {

    const [tabCurrent, setTableCurrent] = React.useState(
        {
            [postType]: 0
        }
    );

    const [marketingAiDrawerOpen, setMarketingAiDrawerOpen] = React.useState(false);
    const [articleRewriteDrawerOpen, setArticleRewriteDrawerOpen] = React.useState(false);
    const [contentTranslateDrawerOpen, setContentTranslateDrawerOpen] = React.useState(false);
    const [notificationAiDrawerOpen, setNotificationAiDrawerOpen] = React.useState(false);

    const classes = useStyles();

    if (!data.post) {
        data.post = {};
    }

    const permission = usePermission(
        postType + '_publish',
        postType + '_trash',
        postType + '_delete',
        postType + '_restore',
        postType + '_create',
        postType + '_edit'
    );

    const onReview = (value: ANY, key: ANY) => {

        onUpdateData((prev) => {
            if (typeof key === 'object' && key !== null) {
                prev.post = {
                    ...prev.post,
                    ...key
                };
            } else {
                prev.post[key] = value;
            }

            return prev;
        });

    };

    let listFieldInTabs: string[] = [],
        listFieldNotIntabs: string[] = Object.keys(data.config.fields),
        listTabs: string[] = [],
        listTabLeft: string[] = [],
        listTabRight: string[] = [];

    if (data.config?.tabs) {

        listTabs = Object.keys(data.config.tabs);

        listTabs.forEach((key) => {
            if (data.config.tabs[key].fields) {
                listFieldInTabs = [...listFieldInTabs, ...data.config.tabs[key].fields];
            }

            if (data.config.tabs[key].position === 'right') {
                listTabRight.push(key);
            } else {
                listTabLeft.push(key);
            }
        });

        listFieldNotIntabs = listFieldNotIntabs.filter((fieldKey: string) => listFieldInTabs.indexOf(fieldKey) === -1 && !data.config.fields[fieldKey].hidden);

    }

    const handleChangeTab = (index: number) => {
        setTableCurrent({
            ...tabCurrent,
            [postType]: index
        });
    };

    // Bắt phím Enter / Space để submit form khi focus không nằm trên ô nhập liệu
    React.useEffect(() => {
        const isFocusOnFormInput = (): boolean => {
            const el = document.activeElement as HTMLElement | null;
            if (!el) return false;

            if (el.isContentEditable) return true;
            if (el.closest('[contenteditable="true"]')) return true;

            const tag = el.tagName;
            if (tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'INPUT') return true;

            const role = el.getAttribute('role');
            if (
                role === 'textbox' ||
                role === 'combobox' ||
                role === 'searchbox' ||
                role === 'spinbutton'
            ) {
                return true;
            }

            return false;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            const isEnter = e.key === 'Enter' && !e.shiftKey;
            const isSpace = e.code === 'Space';

            if (!isEnter && !isSpace) return;

            if (isFocusOnFormInput()) return;

            handleSubmit();
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [handleSubmit]);

    const confirm = useConfirmDialog();

    const useAjaxDelete = useAjax();

    const navigate = useNavigate();

    const deletePost = () => {
        useAjaxDelete.ajax({
            url: 'post-type/delete/' + data.type,
            method: 'POST',
            data: data.post,
            success: () => {
                if (handleAfterDelete) {
                    handleAfterDelete();
                } else {
                    navigate('/post-type/' + postType + '/list');
                }
            }
        });
    };

    const isSimpleLayout = data.config?.layout === 'simple';

    const copyPostJsonToClipboard = () => {
        if (!data?.post) return;
        const postExport = { ...data.post };
        delete postExport._copy;
        const text = JSON.stringify(postExport, null, 2);
       
        const notifyOk = () => useAjaxDelete.showMessage(__('Đã copy JSON bài viết vào clipboard'), 'success');
        const notifyErr = () => useAjaxDelete.showMessage(__('Không thể copy vào clipboard'), 'error');
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(notifyOk).catch(notifyErr);
        } else {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                notifyOk();
            } catch {
                notifyErr();
            }
        }
    };

    const renderSaveButton = () => (
        <div>
            {
                data ?
                    data.action === 'ADD_NEW' ?
                        <>
                            {
                                permission[postType + '_create'] &&
                                <LoadingButton
                                    loading={openLoading}
                                    loadingPosition="center"
                                    color="primary"
                                    sx={{ width: '100%', height: 48, fontSize: 16 }}
                                    variant="contained"
                                    onClick={handleSubmit}
                                >
                                    {__('Save Changes')}
                                </LoadingButton>
                            }
                        </>
                        :
                        <>
                            {
                                permission[postType + '_edit'] &&
                                <React.Fragment>
                                    <LoadingButton
                                        variant='contained'
                                        sx={{ width: '100%', height: 48, fontSize: 16 }}
                                        onClick={handleSubmit}
                                        loading={openLoading}
                                        loadingPosition="center"
                                    >
                                        {__('Edit')}
                                    </LoadingButton>
                                    {!isSimpleLayout && (
                                        <Tooltip title={__('Create a new post is a copy of the current post')}>
                                            <LoadingButton
                                                type="button"
                                                loading={openLoading}
                                                loadingPosition="center"
                                                variant='contained'
                                                color="inherit"
                                                sx={{ width: '100%', marginTop: 3, height: 48, fontSize: 16 }}
                                                onClick={() => { data.post._copy = true; handleSubmit(); }}
                                            >
                                                {__('Copy')}
                                            </LoadingButton>
                                        </Tooltip>
                                    )}
                                    {
                                        showCopyPostJson && !isSimpleLayout && (
                                            <LoadingButton
                                                type="button"
                                                loading={false}
                                                variant="contained"
                                                color="info"
                                                sx={{ width: '100%', marginTop: 3, height: 48, fontSize: 16 }}
                                                onClick={copyPostJsonToClipboard}
                                            >
                                                {__('Copy Json')}
                                            </LoadingButton>
                                        )
                                    }
                                </React.Fragment>
                            }
                            {
                                permission[postType + '_delete'] && data.post?.id &&
                                <Collapse in={Boolean(data.post.status === 'trash')}>
                                    <LoadingButton
                                        type="button"
                                        loading={openLoading}
                                        loadingPosition="center"
                                        variant='contained'
                                        color='error'
                                        sx={{ width: '100%', marginTop: 3, height: 48, fontSize: 16 }}
                                        onClick={() => confirm.onConfirm(() => deletePost())}
                                    >
                                        {__('Delete')}
                                    </LoadingButton>
                                </Collapse>
                            }
                        </>
                    :
                    <></>
            }
            {
                data?.config?.actions ? data.config.actions.map((item, index) =>
                    <ButtonAction
                        key={item.link_api + '-' + index}
                        title={item.title}
                        link={item.link_api}
                        id={data.post.id}
                        postType={data.type}
                        confirmMessage={item.confirm_message}
                        confirmConfig={item.confirm}
                        checkProgress={item.check_progress}
                        color={item.color}
                        clientAction={item.client_action}
                        onActionSuccess={onRefreshPost}
                        onClientDrawer={(action) => {
                            if (action === 'drawer:MarketingContentAi') {
                                setMarketingAiDrawerOpen(true);
                            }
                            if (action === 'drawer:MarketingArticleRewrite') {
                                setArticleRewriteDrawerOpen(true);
                            }
                            if (action === 'drawer:MarketingContentTranslate') {
                                setContentTranslateDrawerOpen(true);
                            }
                            if (action === 'drawer:NotificationAi') {
                                setNotificationAiDrawerOpen(true);
                            }
                        }}
                    />
                )
                    : null
            }
        </div>
    );

    return (
        <>
            {postType === 'spacedev_app_marketing_post' && (
                <>
                    <ContentAiWizard
                        open={marketingAiDrawerOpen}
                        onClose={() => setMarketingAiDrawerOpen(false)}
                        data={data}
                        onRefreshPost={onRefreshPost}
                    />
                    <ArticleRewriteDrawer
                        open={articleRewriteDrawerOpen}
                        onClose={() => setArticleRewriteDrawerOpen(false)}
                        data={data}
                        onRefreshPost={onRefreshPost}
                    />
                    <MarketingContentTranslateDrawer
                        open={contentTranslateDrawerOpen}
                        onClose={() => setContentTranslateDrawerOpen(false)}
                        data={data}
                        onRefreshPost={onRefreshPost}
                    />
                </>
            )}
            {postType === 'app_local_notification' && (
                <NotificationAiDrawer
                    open={notificationAiDrawerOpen}
                    onClose={() => setNotificationAiDrawerOpen(false)}
                    data={data}
                    onApply={(messages) => {
                        const nextMessages = messages.map((row: ANY) => ({
                            open: false,
                            confirmDelete: false,
                            delete: 0,
                            title:
                                row.title && typeof row.title === 'object'
                                    ? { ...row.title }
                                    : row.title,
                            body:
                                row.body && typeof row.body === 'object'
                                    ? { ...row.body }
                                    : row.body,
                        }));
                        onUpdateData((prev) => ({
                            ...prev,
                            post: {
                                ...prev.post,
                                messages: nextMessages,
                            },
                            updatePost: new Date(),
                        }));
                        const messageTabIndex = listTabLeft.indexOf('message');
                        if (messageTabIndex >= 0) {
                            setTableCurrent((tc) => ({
                                ...tc,
                                [postType]: messageTabIndex,
                            }));
                        }
                    }}
                />
            )}
            <Grid
                container
                spacing={4}
            >
                <Grid item md={12} xs={12}>

                    <Grid
                        container
                        spacing={3}>

                        {isSimpleLayout && (
                            <Grid item md={12} xs={12}>
                                {renderSaveButton()}
                            </Grid>
                        )}

                        <Grid item md={isSimpleLayout ? 12 : 8} xs={12}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3
                                }}
                            >
                                {
                                    listTabLeft.length > 0 &&
                                    <Card sx={{ overflow: 'visible' }}>
                                        <CardContent>
                                            <div className={classes.root}>
                                                <div className={classes.tabs}>
                                                    <span className='indicator' style={{ top: tabCurrent[postType] * 48 }}></span>
                                                    {
                                                        listTabLeft.map((tabKey, i) => (
                                                            <Button
                                                                key={tabKey}
                                                                onClick={() => handleChangeTab(i)}
                                                                className={addClasses({
                                                                    [classes.tabsItem]: true,
                                                                    active: tabCurrent[postType] === i,
                                                                })}
                                                                color="inherit">
                                                                {data.config.tabs[tabKey].title}
                                                            </Button>
                                                        ))
                                                    }
                                                </div>
                                                <div className={classes.tabContent}>
                                                    <Grid
                                                        container
                                                        spacing={4}>
                                                        {
                                                            (() => {

                                                                if (listTabLeft[tabCurrent[postType]]) {

                                                                    if (typeof data.config.tabs[listTabLeft[tabCurrent[postType]]].hook === 'string') {
                                                                        return <Grid item md={12} xs={12}>
                                                                            <Hook
                                                                                hook={data.config.tabs[listTabLeft[tabCurrent[postType]]].hook as string}
                                                                                data={data}
                                                                                dataField={{ ...data.config.tabs[listTabLeft[tabCurrent[postType]]] }}
                                                                                onReview={onReview}
                                                                            />
                                                                        </Grid>
                                                                    } else if (data.config.tabs[listTabLeft[tabCurrent[postType]]].fields) {

                                                                        return data.config.tabs[listTabLeft[tabCurrent[postType]]].fields.map((key: string) => (
                                                                            <Grid item md={12} xs={12} key={key}>
                                                                                <FieldForm
                                                                                    component={data.config.fields[key].view ?? 'text'}
                                                                                    config={data.config.fields[key]}
                                                                                    post={data.post}
                                                                                    name={key}
                                                                                    onReview={(value, key2 = key) => onReview(value, key2)}
                                                                                    dataPostType={data.post}
                                                                                />
                                                                            </Grid>
                                                                        ))
                                                                    }

                                                                    return data.config.tabs[listTabLeft[tabCurrent[postType]]].compoment;

                                                                } else {
                                                                    setTableCurrent({
                                                                        ...tabCurrent,
                                                                        [postType]: 0
                                                                    });
                                                                }
                                                            })()

                                                        }

                                                    </Grid>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                }
                                {
                                    Boolean(listFieldNotIntabs.length) &&
                                    <Card sx={{ overflow: 'visible' }}>
                                        <CardContent>
                                            <Grid
                                                container
                                                spacing={4}>
                                                {
                                                    listFieldNotIntabs.map(key => (
                                                        !data.config.fields[key].hidden ?
                                                            <Grid item md={12} xs={12} key={key} >
                                                                <FieldForm
                                                                    component={data.config.fields[key].view ?? 'text'}
                                                                    config={data.config.fields[key]}
                                                                    post={data.post}
                                                                    name={key}
                                                                    onReview={(value, key2 = key) => onReview(value, key2)}
                                                                    dataPostType={data.post}
                                                                />
                                                            </Grid>
                                                            :
                                                            <React.Fragment key={key}></React.Fragment>
                                                    ))
                                                }
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                }

                                <Hook
                                    hook="PostType/CreateData"
                                    data={data}
                                    onUpdateData={onUpdateData}
                                    postType={postType}
                                />
                            </Box>
                        </Grid>

                        {!isSimpleLayout && (
                            <Grid item md={4} xs={12}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 3
                                    }}
                                >


                                    <SectionStatus
                                        data={data}
                                        onReview={onReview}
                                        onRefresh={onRefreshPost}
                                        refreshing={refreshingPost}
                                    />

                                    {renderSaveButton()}

                                    {
                                        listTabRight.length > 0 &&
                                        listTabRight.map(key => (
                                            <Card key={key}>
                                                <CardContent>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 4
                                                        }}
                                                    >
                                                        {
                                                            (() => {

                                                                if (typeof data.config.tabs[key].hook === 'string') {
                                                                    return <Grid item md={12} xs={12}>
                                                                        <Hook
                                                                            hook={data.config.tabs[key].hook as string}
                                                                            data={data}
                                                                            dataField={{ ...data.config.tabs[key] }}
                                                                            onReview={onReview}
                                                                        />
                                                                    </Grid>
                                                                } else if (data.config.tabs[key].fields) {

                                                                    return data.config.tabs[key].fields.map((key: string) => (
                                                                        <Grid item md={12} xs={12} key={key}>
                                                                            <FieldForm
                                                                                component={data.config.fields[key].view ?? 'text'}
                                                                                config={data.config.fields[key]}
                                                                                post={data.post}
                                                                                name={key}
                                                                                onReview={(value, key2 = key) => onReview(value, key2)}
                                                                                dataPostType={data.post}
                                                                            />
                                                                        </Grid>
                                                                    ))
                                                                }

                                                                return data.config.tabs[key].compoment;

                                                            })()
                                                        }
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        ))
                                    }

                                    <SectionInfo
                                        data={data}
                                    />

                                </Box>
                            </Grid>
                        )}

                        {isSimpleLayout && (
                            <>
                                {
                                    listTabRight.length > 0 &&
                                    listTabRight.map(key => (
                                        <Grid item md={12} xs={12} key={key}>
                                            <Card>
                                                <CardContent>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: 4
                                                        }}
                                                    >
                                                        {
                                                            (() => {

                                                                if (typeof data.config.tabs[key].hook === 'string') {
                                                                    return <Grid item md={12} xs={12}>
                                                                        <Hook
                                                                            hook={data.config.tabs[key].hook as string}
                                                                            data={data}
                                                                            dataField={{ ...data.config.tabs[key] }}
                                                                            onReview={onReview}
                                                                        />
                                                                    </Grid>
                                                                } else if (data.config.tabs[key].fields) {

                                                                    return data.config.tabs[key].fields.map((key: string) => (
                                                                        <Grid item md={12} xs={12} key={key}>
                                                                            <FieldForm
                                                                                component={data.config.fields[key].view ?? 'text'}
                                                                                config={data.config.fields[key]}
                                                                                post={data.post}
                                                                                name={key}
                                                                                onReview={(value, key2 = key) => onReview(value, key2)}
                                                                                dataPostType={data.post}
                                                                            />
                                                                        </Grid>
                                                                    ))
                                                                }

                                                                return data.config.tabs[key].compoment;

                                                            })()
                                                        }
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))
                                }
                            </>
                        )}

                    </Grid>
                </Grid>
            </Grid>
            {confirm.component}
        </>
    )

}

export default Form
export interface HookCreateDataProps {
    data: CreatePostTypeData,
    onUpdateData: HandleUpdateDataProps,
    postType: string
}


export interface HookCreateDataTabItemProps {
    data: CreatePostTypeData,
    dataField: {
        title: string,
        fields: string[],
    },
    onReview: (value: ANY, key: ANY) => void,
}

export interface IActionPostType {
    title: string,
    variant: string,
    link_api: string,
    link: string,
    client_action?: string,
    group?: string,
    confirm_message?: string,
    confirm?: {
        title?: string,
        message?: string,
        icon?: string,
        number_confirm?: number,
    },
    check_progress?: boolean,
    color?: 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning'
    | string,
}



function CircularProgressWithLabel(
    props: CircularProgressProps & { value: number },
) {
    return (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress variant="determinate" {...props} />
            <Box
                sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography
                    variant="caption"
                    component="div"
                    color="text.secondary"
                >{`${Math.round(props.value)}%`}</Typography>
            </Box>
        </Box>
    );
}

function ButtonAction({
    title,
    link,
    id,
    postType,
    confirmMessage,
    confirmConfig,
    checkProgress,
    color,
    clientAction,
    onClientDrawer,
    onActionSuccess,
}: {
    title: string,
    link: string,
    confirmMessage?: string,
    postType: string,
    confirmConfig?: {
        title?: string,
        message?: string,
        icon?: string,
        number_confirm?: number,
    },
    id: ID,
    checkProgress?: boolean,
    color?: string,
    clientAction?: string,
    onClientDrawer?: (action: string) => void,
    onActionSuccess?: () => void,
}) {

    const useAjaxAction = useAjax();

    const confirm = useConfirmDialog();

    const [progressButton,] = React.useState<number>(0);

    const handleActionEvent = () => {
        if (clientAction && clientAction.startsWith('drawer:') && onClientDrawer) {
            if (!id) {
                return;
            }
            onClientDrawer(clientAction);
            return;
        }
        const actionPayload = {
            id,
            post_type: postType,
        };
        const callApi = () => {

            useAjaxAction.ajax({
                url: link,
                method: 'POST',
                data: actionPayload,
                success: () => {
                    onActionSuccess?.();
                },
            });

            if (checkProgress) {

                const callCheckProgress = () => {
                    useAjaxAction.ajax({
                        url: link,
                        method: 'POST',
                        data: {
                            ...actionPayload,
                            check_progress: true
                        },
                        success: (result) => {
                            // 
                        }
                    });
                };

                callCheckProgress();
            }
        };

        confirm.onConfirm(callApi, {
            title: confirmConfig?.title,
            icon: confirmConfig?.icon,
            numberConfirm: confirmConfig?.number_confirm,
            message: confirmConfig?.message || confirmMessage || __('Bạn có chắc muốn "{{toolTitle}}" không?', {
                toolTitle: title,
            }),
        });

    }


    return <>
        {confirm.component}
        {useAjaxAction.open && checkProgress ? <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 3
            }}
        >
            <CircularProgressWithLabel value={progressButton} />
        </Box>
            :
            <LoadingButton
                type="button"
                loading={useAjaxAction.open}
                loadingPosition="center"
                color={(color || 'inherit') as ANY}
                sx={{ width: '100%', marginTop: 3, height: 48, fontSize: 16 }}
                variant="contained"
                onClick={handleActionEvent}
                disabled={clientAction?.startsWith('drawer:') && !id}
            >
                {title}
            </LoadingButton>
        }
    </>
}