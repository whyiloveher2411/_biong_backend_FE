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
        width: 160,
        '&>.indicator': {
            backgroundColor: '#3f51b5',
            position: 'absolute',
            right: 0,
            width: 2,
            height: 48,
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
        },
        '&>button': {
            width: '100%', maxWidth: 160, height: 48, opacity: 0.7,
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
    }

}));

interface FormCreateDataProps {
    data: CreatePostTypeData,
    postType: string,
    open: boolean,
    onUpdateData: HandleUpdateDataProps,
    handleSubmit: () => void,
    handleAfterDelete?: () => void,
}

function Form({ data, postType, onUpdateData, handleSubmit, handleAfterDelete, open: openLoading }: FormCreateDataProps) {

    const [tabCurrent, setTableCurrent] = React.useState(
        {
            [postType]: 0
        }
    );

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

    const [loadingStateButton, setLoadingStateButton] = React.useState<{ [key: number]: boolean }>({});
    const [progressButton, setProgressButton] = React.useState<{ [key: number]: number }>({});

    const useAjaxAction = useAjax();

    const handleActionEvent = (id: ID, item: IActionPostType, index: number) => () => {
        const callApi = () => {
            setLoadingStateButton(prev => ({
                ...prev,
                [id]: true,
            }));

            setProgressButton(prev => ({
                ...prev,
                [index]: 0
            }))

            useAjaxAction.ajax({
                url: item.link_api,
                method: 'POST',
                data: {
                    id
                },
                success: () => {
                    setLoadingStateButton(prev => ({
                        ...prev,
                        [index]: false,
                    }));
                }
            });

            if (item.check_progress) {

                const callCheckProgress = () => {
                    useAjaxAction.ajax({
                        url: item.link_api,
                        method: 'POST',
                        data: {
                            id,
                            check_progress: true
                        },
                        success: (result) => {
                            if (result.progress !== undefined) {
                                setProgressButton(prev => ({
                                    ...prev,
                                    [index]: result.progress
                                }));
                                setTimeout(() => {
                                    callCheckProgress();
                                }, 1000);
                            } else {
                                setProgressButton(prev => {
                                    delete prev[index];
                                    return { ...prev };
                                })
                            }
                        }
                    });
                };

                callCheckProgress();
            }
        };

        if (item.confirm_message) {
            confirm.onConfirm(callApi, {
                message: item.confirm_message
            });
            return;
        }

        callApi();

    }

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

    return (
        <>
            <Grid
                container
                spacing={4}>
                <Grid item md={12} xs={12}>

                    <Grid
                        container
                        spacing={3}>


                        <Grid item md={8} xs={12}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3
                                }}
                            >
                                {
                                    listTabLeft.length > 0 &&
                                    <Card>
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
                                                <div style={{ paddingLeft: 24, width: 'calc( 100% - 160px )' }}>
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
                                    <Card>
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
                                />

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
                                                                {__('Save Changes')}
                                                            </LoadingButton>
                                                            <Tooltip title={__('Create a new post is a copy of the current post')}>
                                                                <LoadingButton
                                                                    loading={openLoading}
                                                                    loadingPosition="center"
                                                                    variant='contained'
                                                                    color="inherit"
                                                                    sx={{ width: '100%', marginTop: 3, height: 48, fontSize: 16 }}
                                                                    onClick={(e) => { data.post._copy = true; handleSubmit(); }}
                                                                >
                                                                    {__('Copy')}
                                                                </LoadingButton>
                                                            </Tooltip>
                                                        </React.Fragment>
                                                    }
                                                    {
                                                        permission[postType + '_delete'] && data.post?.id &&
                                                        <Collapse in={Boolean(data.post.status === 'trash')}>
                                                            <LoadingButton
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
                                            progressButton[index] !== undefined ?
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginTop: 3
                                                    }}
                                                >
                                                    <CircularProgressWithLabel value={progressButton[index]} />
                                                </Box>
                                                :
                                                <LoadingButton
                                                    key={index}
                                                    loading={loadingStateButton[index] ? true : false}
                                                    loadingPosition="center"
                                                    color={item.color}
                                                    sx={{ width: '100%', marginTop: 3, height: 48, fontSize: 16 }}
                                                    variant="contained"
                                                    onClick={handleActionEvent(data.post.id, item, index)}
                                                >
                                                    {item.title}
                                                </LoadingButton>
                                        )
                                            : null
                                    }
                                </div>

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
    confirm_message?: string,
    check_progress?: boolean,
    color: 'inherit'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'error'
    | 'info'
    | 'warning',
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