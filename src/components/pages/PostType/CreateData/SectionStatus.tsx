import Box from 'components/atoms/Box';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Collapse from 'components/atoms/Collapse';
import FieldForm from 'components/atoms/fields/FieldForm';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import Tooltip from 'components/atoms/Tooltip';
import { __ } from 'helpers/i18n';
import React from 'react';
import { CreatePostTypeData } from '.';

function SectionStatus({ data, onReview }: {
    data: CreatePostTypeData,
    onReview: (value: ANY, key: ANY) => void
}) {

    const [activePostDateGmt, setActivePostDateGmt] = React.useState({
        active: !!data.post.post_date_gmt,
        oldValue: data.post.post_date_gmt,
        activeEndDate: !!data.post.post_date_gmt_end,
        oldValueEnd: data.post.post_date_gmt_end,
    });

    const handleOnClickStar = () => {
        onReview(Number(data.post.starred) === 1 ? 0 : 1, 'starred');
    };

    return <Card>
        <CardContent>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                }}
            >

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <Tooltip title={__('Starred')} aria-label="Starred">
                        <IconButton onClick={handleOnClickStar} aria-label="Starred" component="span">
                            {
                                data.post?.starred
                                    ?
                                    <Icon icon="StarOutlined" style={{ color: '#f4b400' }} />
                                    :
                                    <Icon icon="StarBorderOutlined" />
                            }
                        </IconButton>
                    </Tooltip>
                </Box>

                <FieldForm
                    component='select'
                    config={{
                        title: 'Status',
                        defaultValue: 'publish',
                        list_option: {
                            publish: { title: __('Publish'), color: 'rgb(67, 160, 71)' },
                            draft: { title: __('Draft'), color: 'rgb(117, 117, 117)' },
                            pending: { title: __('Pending'), color: 'rgb(246, 137, 36)' },
                            trash: { title: __('Trash'), color: 'rgb(229, 57, 53)' },
                        },
                    }}
                    post={data.post}
                    name={'status'}
                    onReview={(value) => {

                        if (data.post.status !== value) {
                            data.post.status_old = data.post.status;
                            data.post.status = value;
                            onReview(null, {
                                status: data.post.status,
                                status_old: data.post.status_old
                            });
                        }

                    }}
                />

                <div>
                    <FieldForm
                        component='select'
                        config={{
                            title: __('Visibility'),
                            defaultValue: 'public',
                            list_option: {
                                public: { title: __('Public'), color: 'rgb(67, 160, 71)' },
                                password: { title: __('Password protected'), color: '#3f51b5' },
                                private: { title: __('Private'), color: 'rgb(134, 4, 196)' },
                            },
                        }}
                        post={data.post}
                        name={'visibility'}
                        onReview={(value) => onReview(value, 'visibility')}
                    />
                    <Collapse in={Boolean(data.post.visibility === 'password')}>
                        <FieldForm
                            component='password'
                            config={{
                                title: __('Password'),
                                special_notes: [
                                    {
                                        'type': 'info',
                                        'content': __('This password will not be encrypted, you can review or share it with everyone'),
                                    },
                                ],
                                formControlProps: {
                                    sx: {
                                        marginTop: 3
                                    }
                                }
                            }}
                            post={{
                                password: data.post?.password,
                                _password: data.post?.password,
                            }}
                            name={'password'}
                            onReview={(value) => onReview(value, 'password')}
                        />
                    </Collapse>
                </div>

                <div>
                    <FieldForm
                        component='true_false'
                        config={{
                            title: __('Schedule Posts'),
                        }}
                        post={{ active_post_date_gmt: activePostDateGmt.active ? 1 : 0 }}
                        name={'active_post_date_gmt'}
                        onReview={(value) => {

                            if (value) {
                                setActivePostDateGmt(prev => ({
                                    ...prev,
                                    active: true,
                                }));
                                onReview(null, {
                                    post_date_gmt: activePostDateGmt.oldValue,
                                });
                            } else {
                                setActivePostDateGmt(prev => ({
                                    ...prev,
                                    oldValue: data.post.post_date_gmt,
                                    active: false,
                                }));
                                onReview(null, {
                                    post_date_gmt: '',
                                });
                            }
                        }}
                    />
                    <Collapse in={activePostDateGmt.active}>
                        <FieldForm
                            component='date_time'
                            config={{
                                title: __('Release Date'),
                                formControlProps: {
                                    sx: {
                                        marginTop: 3
                                    }
                                }
                            }}
                            post={data.post}
                            name={'post_date_gmt'}
                            onReview={(value) => {
                                if (!value) {
                                    setActivePostDateGmt(prev => ({
                                        ...prev,
                                        oldValue: data.post.post_date_gmt,
                                        active: false,
                                    }));
                                    onReview('', 'post_date_gmt');
                                } else {
                                    onReview(value, 'post_date_gmt');
                                }
                            }}
                        />

                        <div style={{ marginTop: 16 }}>
                            <FieldForm
                                component='true_false'
                                config={{
                                    title: __('Posting end date'),
                                }}
                                post={{ active_post_date_gmt_end: activePostDateGmt.activeEndDate ? 1 : 0 }}
                                name={'active_post_date_gmt_end'}
                                onReview={(value) => {

                                    if (value) {
                                        setActivePostDateGmt(prev => ({
                                            ...prev,
                                            activeEndDate: true,
                                        }));
                                        onReview(null, {
                                            post_date_gmt_end: activePostDateGmt.oldValueEnd,
                                        });
                                    } else {
                                        setActivePostDateGmt(prev => ({
                                            ...prev,
                                            oldValueEnd: data.post.post_date_gmt_end,
                                            activeEndDate: false,
                                        }));
                                        onReview(null, {
                                            post_date_gmt_end: '',
                                        });
                                    }
                                }}
                            />

                            <Collapse in={activePostDateGmt.activeEndDate}>
                                <FieldForm
                                    component='date_time'
                                    config={{
                                        title: __('Posting end date time'),
                                        formControlProps: {
                                            sx: {
                                                marginTop: 3
                                            }
                                        }
                                    }}
                                    post={data.post}
                                    name={'post_date_gmt_end'}
                                    onReview={(value) => {
                                        if (!value) {
                                            setActivePostDateGmt(prev => ({
                                                ...prev,
                                                oldValue: data.post.post_date_gmt_end,
                                                active: false,
                                            }));
                                            onReview('', 'post_date_gmt_end');
                                        } else {
                                            onReview(value, 'post_date_gmt_end');
                                        }
                                    }}
                                />
                            </Collapse>
                        </div>

                    </Collapse>
                </div>



            </Box>
        </CardContent>
    </Card>;
}

export default SectionStatus;
