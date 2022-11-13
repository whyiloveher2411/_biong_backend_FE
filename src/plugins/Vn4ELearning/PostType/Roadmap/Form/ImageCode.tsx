import { Box, Button } from '@mui/material';
import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import DrawerCustom from 'components/molecules/DrawerCustom';
import { __ } from 'helpers/i18n';
import React from 'react'

function ImageCode(props: FieldFormItemProps) {

    const [elementClicked, setElementClicked] = React.useState<false | Element>(false);

    const [idSelected, setIdSelected] = React.useState<null | JsonFormat>(null);

    const [editor, setEditor] = React.useState<ANY>(null);

    return (
        <>
            <FieldForm
                component='editor'
                config={{
                    title: props.config.title,
                    ...props.config,
                    customViewForm: undefined,
                    editoStyle: 'svg .clickable-group{cursor: pointer;}svg .clickable-group:hover>[fill="rgb(255,229,153)"]{fill: #f3c950}svg .clickable-group:hover>[fill="rgb(255,255,0)"]{fill: #d6d700}svg .clickable-group:hover>[fill="rgb(255,255,255)"]{fill: #d7d7d7}svg .clickable-group[data-id]>[fill="rgb(255,229,153)"]{fill: #43a047 !important}svg .clickable-group[data-id]>[fill="rgb(255,255,0)"]{fill: #9ed6a0}svg .clickable-group[data-id]>[fill="rgb(255,255,255)"]{fill: #c9ffcb}svg .clickable-group[data-id]>[fill="rgb(153,153,153)"]{fill: #c9ffcb}svg .clickable-group.active>rect{fill: red !important;}',
                    clickElementCallback: (editor: ANY, event: ANY) => {

                        setEditor(editor);

                        let element = event.target;

                        let clickable = null;
                        if (element.classList.contains('clickable-group')) {
                            clickable = element;
                        } else {
                            clickable = element.closest('.clickable-group');
                        }

                        if (clickable) {

                            if (clickable.getAttribute('data-id')) {
                                setIdSelected({
                                    roadmap_item: clickable.getAttribute('data-id')
                                });
                            }

                            clickable.classList.add('active');
                            setElementClicked(clickable);
                        }
                    }
                }}
                post={props.post}
                name={props.name}
                onReview={props.onReview}
            />
            <DrawerCustom
                title={'Choose Roadmap Item'}
                open={elementClicked !== false}
                activeOnClose
                width={768}
                onClose={() => {
                    if (elementClicked) {
                        elementClicked.classList.remove('active');
                        setElementClicked(false);
                    }
                }}
            >
                <Box
                    sx={{
                        mt: 3
                    }}
                >
                    <FieldForm
                        component='relationship_onetomany'
                        config={{
                            title: 'Roadmap Item',
                            object: 'e_learning_roadmap_item',
                        }}
                        post={idSelected ?? {}}
                        name="roadmap_item"
                        onReview={(value, value2) => {

                            if (value2 && typeof (value2 as JsonFormat).roadmap_item !== undefined) {
                                setIdSelected(value2 as JsonFormat);
                            }

                        }}
                    />

                    <Button
                        sx={{
                            mt: 2,
                        }}
                        variant="contained"
                        color='success'
                        onClick={() => {

                            setElementClicked((prev) => {

                                if (prev && editor) {

                                    if (idSelected && idSelected.roadmap_item) {
                                        prev.setAttribute("data-id", idSelected.roadmap_item + '');
                                    } else {
                                        prev.removeAttribute("data-id");
                                    }

                                    prev.classList.remove('active');

                                    setElementClicked(false);

                                    props.onReview(editor.getContent());

                                }

                                return false;
                            })

                        }}
                    >{__('Save Changes')}</Button>
                </Box>
            </DrawerCustom >
        </>
    )
}

export default ImageCode