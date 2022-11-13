import { Box, Chip, Typography } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import Icon from 'components/atoms/Icon';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';

function RoadmapRelated(props: FieldFormItemProps) {

    const [idRoadmapEdit, setIdRoadmapEdit] = React.useState<ID>(0);

    const [imageCode, setImageCode] = React.useState('');

    const [listIdSelect, setListIdSelect] = React.useState<{ [key: ID]: boolean }>({});

    const useAjaxData = useAjax();

    React.useEffect(() => {

        let listIdSelectTemp: { [key: ID]: boolean } = {};

        try {

            let tempDataOld = [];


            if (Array.isArray(props.post.ids_roadmap_item_related)) {
                tempDataOld = props.post.ids_roadmap_item_related;
            } else {
                if (typeof props.post.ids_roadmap_item_related === 'string') {
                    tempDataOld = JSON.parse(props.post.ids_roadmap_item_related);
                }
            }

            if (Array.isArray(tempDataOld)) {
                tempDataOld.forEach(item => {
                    listIdSelectTemp[item] = true;
                });
            }


        } catch (error) {
            listIdSelectTemp = {};
        }

        setListIdSelect(listIdSelectTemp);

    }, []);

    React.useEffect(() => {

        if (idRoadmapEdit !== 0) {
            useAjaxData.ajax({
                url: 'plugin/vn4-e-learning/course-detail/get-roadmap',
                data: {
                    id: idRoadmapEdit,
                },
                method: 'POST',
                success: (result) => {
                    if (result.image_code) {
                        setImageCode(result.image_code);
                    }
                }
            })
        }

    }, [idRoadmapEdit]);

    React.useEffect(() => {
        if (imageCode) {
            document.querySelectorAll('#roadmap-detail .clickable-group')?.forEach(item => {

                const id = item.getAttribute('data-id');

                if (id) {

                    if (listIdSelect[id]) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }

                    item.addEventListener('click', function () {
                        setListIdSelect(prev => {

                            const listId = {
                                ...prev,
                                [id]: prev[id] ? false : true,
                            };

                            if (listId[id]) {
                                document.querySelectorAll('#roadmap-detail .clickable-group[data-id="' + id + '"]').forEach(el => {
                                    el.classList.add('active');
                                });
                            } else {
                                document.querySelectorAll('#roadmap-detail .clickable-group[data-id="' + id + '"]').forEach(el => {
                                    el.classList.remove('active');
                                });
                            }

                            return listId;

                        })
                    });
                }
            });
        }
    }, [imageCode]);

    React.useEffect(() => {
        props.onReview(Object.keys(listIdSelect).filter(key => listIdSelect[key]), 'ids_roadmap_item_related');
    }, [listIdSelect]);

    return (<>
        <FieldForm
            component='relationship_manytomany'
            config={{
                title: props.config.title,
                ...props.config,
                customViewForm: undefined,
            }}
            post={props.post}
            name={props.name}
            onReview={props.onReview}
        />
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 2,
            }}
        >

            {

                (() => {

                    let roadmaps: Array<{ id: ID, title: string }> = [];

                    if (Array.isArray(props.post[props.name])) {
                        roadmaps = props.post[props.name] as Array<{ id: ID, title: string }>;
                    } else {

                        try {
                            if (typeof props.post[props.name] === 'string') {
                                roadmaps = JSON.parse(props.post[props.name]);
                            }
                        } catch (error) {
                            roadmaps = [];
                        }

                    }

                    if (Array.isArray(roadmaps) && roadmaps.length > 0) {
                        return [
                            <Typography variant='h5'>{__('Edit roadmap item related:')}</Typography>,
                            roadmaps.map(item => (
                                <Chip
                                    key={item.id}
                                    label={item.title}
                                    deleteIcon={<Icon icon="EditOutlined" />}
                                    onDelete={() => {
                                        setIdRoadmapEdit(item.id);
                                    }}
                                    onClick={() => {
                                        setIdRoadmapEdit(item.id);
                                    }}
                                />
                            ))];
                    }

                    return <></>

                })()
            }
        </Box>

        <DrawerCustom
            title={'Choose Roadmap Item'}
            open={idRoadmapEdit !== 0}
            activeOnClose
            width={1000}
            onClose={() => {
                setIdRoadmapEdit(0);
                setImageCode('');
            }}
        >
            <Box
                sx={{
                    mt: 3
                }}
            >
                <Typography>{__('Nhấp chọn từng phần kiến thức sẽ có trong khóa học.')}</Typography>
                <Box
                    id="roadmap-detail"
                    sx={{
                        maxWidth: 992,
                        margin: '0 auto',
                        mt: 3,
                        '& *': {
                            fontFamily: 'balsamiq',
                        },
                        '& svg .clickable-group[data-id]': {
                            cursor: 'pointer',
                        },
                        '& svg .clickable-group:not([data-id])': {
                            cursor: 'not-allowed',
                            opacity: 0.5,
                        },
                        '& svg .clickable-group.active>rect': {
                            fill: '#43a047 !important',
                        },
                        '& svg .clickable-group[data-id]:hover>[fill="rgb(255,229,153)"]': {
                            fill: '#f3c950',
                        },
                        '& svg .clickable-group[data-id]:hover>[fill="rgb(255,255,0)"]': {
                            fill: '#d6d700',
                        },
                        '& svg .clickable-group[data-id]:hover>[fill="rgb(255,255,255)"]': {
                            fill: '#d7d7d7',
                        },
                        '& svg .clickable-group[data-id]:hover>[fill="rgb(153,153,153)"]': {
                            fill: '#646464',
                        },
                        '& svg .done rect': {
                            fill: '#cbcbcb!important',
                        },
                        '& svg .done text': {
                            textDecoration: 'line-through',
                        }
                    }}
                    dangerouslySetInnerHTML={{ __html: imageCode ?? '' }}
                />
            </Box>
        </DrawerCustom >
    </>)
}

export default RoadmapRelated