import { LoadingButton } from '@mui/lab'
import { Box, Button, Typography } from '@mui/material'
import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import Markdown from 'components/atoms/Markdown'
import Tabs from 'components/atoms/Tabs'
import DrawerCustom from 'components/molecules/DrawerCustom'
import { getParamsFromUrl, replaceUrlParam } from 'helpers/url'
import useAjax from 'hook/useApi'
import React from 'react'
import { useNavigate } from 'react-router-dom'

function Title(props: FieldFormItemProps) {
    const [open, setOpen] = React.useState(false);

    const contentRef = React.useRef<HTMLDivElement>(null);

    const [tabIndex, setTabIndex] = React.useState(0);

    const [formData, setFormData] = React.useState({
        link_reference: '',
    });

    const [contentAi, setContentAi] = React.useState({
        title: '',
        description: '',
        content: '',
        image: '',
    });

    const [contentTranslate, setContentTranslate] = React.useState({
        title: '',
        description: '',
        content: '',
    });

    const [newContent, setNewContent] = React.useState({
        title: '',
        description: '',
        content: '',
    });

    const ajaxGetContent = useAjax();
    const ajaxSuggest = useAjax();
    const ajaxNewContent = useAjax();
    const navigate = useNavigate();

    React.useEffect(() => {
        navigate('?' + getParamsFromUrl(replaceUrlParam(window.location.href, {
            tab_blog_post: tabIndex.toString()
        })));
    }, [tabIndex]);

    const handleGetContent = () => {
        if (formData.link_reference) {
            ajaxGetContent.ajax({
                url: 'plugin/vn4-blog/actions/auto-suggest/get-content',
                method: 'POST',
                data: {
                    link_reference: formData.link_reference,
                },
                success: (res: {
                    title: string,
                    content: string,
                    image: string,
                    description: string,
                }) => {
                    setContentAi(res);
                    setTabIndex(1);
                }
            });
        }
    }

    const handleTranslate = () => {

        if (contentAi.title) {
            ajaxSuggest.ajax({
                url: 'plugin/vn4-blog/actions/auto-suggest/translate',
                method: 'POST',
                data: contentAi,
                success: (res: {
                    title: string,
                    content: string,
                    description: string,
                }) => {
                    setContentTranslate(res);
                    setTabIndex(2);
                }
            });
        }

    }

    const handleNewContent = () => {
        if (contentAi.title) {
            ajaxNewContent.ajax({
                url: 'plugin/vn4-blog/actions/auto-suggest/get-new-content',
                method: 'POST',
                data: contentAi,
                success: (res: {
                    title: string,
                    content: string,
                    description: string,
                }) => {
                    setNewContent(res);
                    setTabIndex(3);
                }
            });
        }
    }

    const handleUpdateContent = (data: {
        title: string,
        description: string,
        content: string,
    }) => {
        props.onReview(null, {
            title: data.title,
            description: data.description,
            content: [
                {
                    type: 'content_html',
                    content: data.content
                }
            ],
            featured_image: {
                link: contentAi.image,
                type_link: 'external',
            }
        });
        setOpen(false);
    }

    return (<>
        <FieldForm
            component='text'
            config={{
                title: 'Tiêu đề',
                inputProps: {
                    endAdornment: <Button
                        variant='contained'
                        sx={{
                            minWidth: 'unset',
                        }}
                        onClick={() => {
                            setOpen(true);
                            setTabIndex(0)
                        }}>
                        Copy từ internet
                    </Button>
                },
                ...props.config
            }}
            post={props.post}
            name={props.name}
            onReview={props.onReview}
        />
        <DrawerCustom
            title='Tự động viết bài bằng AI'
            anchor='right'
            open={open}
            onClose={() => setOpen(false)}
            width={1200}
        >
            <Box sx={{ pb: 3, pt: 3, '.tabItems': { backgroundColor: 'background.paper' } }}>
                <Tabs
                    name='blog_post'
                    tabIndex={tabIndex}
                    isTabSticky
                    tabs={[
                        {
                            title: 'Link tham khảo',
                            content: () => <Box
                                sx={{
                                    width: '100%',
                                    pt: 2,
                                    pb: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 3,
                                }}
                            >
                                <FieldForm
                                    component='text'
                                    config={{
                                        title: 'Link tham khảo'
                                    }}
                                    name='link_reference'
                                    post={formData}
                                    onReview={(value) => {
                                        setFormData({ ...formData, link_reference: value })
                                    }}
                                />

                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                    }}
                                >
                                    <LoadingButton loading={ajaxGetContent.open} variant='contained' color='primary' onClick={handleGetContent}>Lấy nội dung</LoadingButton>
                                </Box>
                            </Box>
                        },
                        {
                            title: 'Kiểm tra nội dung',
                            content: () => <Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        mb: 3,
                                    }}
                                >
                                    <LoadingButton loading={ajaxSuggest.open} variant='contained' color='primary' onClick={handleTranslate}>Dịch nội dung sang tiếng việt</LoadingButton>
                                </Box>
                                <Typography variant='h1' sx={{ fontWeight: 'bold', mb: 3, }}>{contentAi.title}</Typography>
                                <img style={{ maxWidth: '100%' }} src={contentAi.image} />
                                <Typography sx={{ fontWeight: 'bold', mt: 3, mb: 3, }}>{contentAi.description}</Typography>
                                <Box
                                    sx={{
                                        'img': {
                                            maxWidth: '100%'
                                        }
                                    }}
                                >
                                    <Markdown>{contentAi.content}</Markdown>
                                </Box>


                            </Box>
                        },
                        {
                            title: 'Dịch nội dung',
                            content: () => <Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        mb: 3,
                                        gap: 1,
                                    }}
                                >
                                    <LoadingButton variant='contained' color='success' onClick={() => {
                                        handleUpdateContent({
                                            ...contentTranslate,
                                            content: contentRef.current?.innerHTML || ''
                                        })
                                    }}>Sử dụng nội dung này</LoadingButton>
                                    <LoadingButton loading={ajaxNewContent.open} variant='contained' color='primary' onClick={handleNewContent}>Viết lại nội dung</LoadingButton>
                                </Box>
                                <Typography variant='h1' sx={{ fontWeight: 'bold', mb: 3, }}>{contentTranslate.title}</Typography>
                                <img style={{ maxWidth: '100%' }} src={contentAi.image} />
                                <Typography sx={{ fontWeight: 'bold', mt: 3, mb: 3, }}>{contentTranslate.description}</Typography>
                                <Box
                                    ref={contentRef}
                                    sx={{
                                        'img': {
                                            maxWidth: '100%'
                                        }
                                    }}
                                >
                                    <Markdown>{contentTranslate.content}</Markdown>
                                </Box>

                            </Box>
                        },
                        {
                            title: 'Nội dung mới',
                            content: () => <Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        mb: 3,
                                        gap: 1,
                                    }}
                                >
                                    <LoadingButton variant='contained' color='success' onClick={() => {
                                        handleUpdateContent(newContent)
                                    }}>Sử dụng nội dung này</LoadingButton>
                                    <LoadingButton loading={ajaxNewContent.open} variant='contained' color='primary' onClick={handleNewContent}>Viết lại nội dung</LoadingButton>
                                </Box>
                                <Typography variant='h1' sx={{ fontWeight: 'bold', mb: 3, }}>{newContent.title}</Typography>
                                <img style={{ maxWidth: '100%' }} src={contentAi.image} />
                                <Typography sx={{ fontWeight: 'bold', mt: 3, mb: 3, }}>{newContent.description}</Typography>
                                <Box
                                    sx={{
                                        'img': {
                                            maxWidth: '100%'
                                        }
                                    }}
                                >
                                    <Box
                                        dangerouslySetInnerHTML={{ __html: newContent.content }}
                                    />
                                </Box>
                            </Box>
                        }
                    ]}
                />
            </Box>
        </DrawerCustom>
    </>
    )
}

export default Title