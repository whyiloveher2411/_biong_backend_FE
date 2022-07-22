import AccordionActions from 'components/atoms/AccordionActions';
import AccordionDetails from 'components/atoms/AccordionDetails';
import Button from 'components/atoms/Button';
import Divider from 'components/atoms/Divider';
import FieldForm from 'components/atoms/fields/FieldForm';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import { SectionMenuItemListProps } from './SectionMenuItemList';


function MenuItemCustomLink({ tree, setTree, contentMenuCurrent, setContentMenuCurrent }: SectionMenuItemListProps) {

    const [menuItem, setMenuItem] = React.useState({
        links: 'http://',
        label: ''
    });

    const { ajax } = useAjax();

    const addMenuItem = () => {
        ajax({
            url: 'menu/add-menu-item',
            method: 'POST',
            data: {
                type: 'getPostType',
                object_type: '__customLink',
                ...menuItem
            },
            success: (result) => {

                if (result.menus) {
                    let menuJson = [...tree];
                    menuJson = [...menuJson, ...result.menus];

                    if (contentMenuCurrent) {
                        contentMenuCurrent.json = menuJson;
                        setContentMenuCurrent({ ...contentMenuCurrent });
                    }

                    setTree(menuJson);
                }
            }
        });
    };


    return (
        <>
            <AccordionDetails style={{ flexDirection: 'column' }}>
                <div>
                    <FieldForm
                        component='text'
                        config={{
                            title: 'URL'
                        }}
                        size='small'
                        post={menuItem}
                        name='links'
                        onReview={(value) => { setMenuItem({ ...menuItem, links: value }) }}
                    />
                </div>
                <div style={{ marginTop: 16 }}>
                    <FieldForm
                        component='text'
                        config={{
                            title: 'Navigation Label'
                        }}
                        post={menuItem}
                        size='small'
                        name='label'
                        onReview={(value) => { setMenuItem({ ...menuItem, label: value }) }}
                    />
                </div>
            </AccordionDetails>
            <Divider />
            <AccordionActions style={{ justifyContent: 'flex-end' }}>
                <Button size="small" onClick={addMenuItem} color="primary">
                    {__('Add to menu')}
                </Button>
            </AccordionActions>
        </>
    )
}

export default MenuItemCustomLink
