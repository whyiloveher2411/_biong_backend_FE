import RedirectWithMessage from 'components/function/RedirectWithMessage';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { Navigate, useParams } from 'react-router-dom';


function Menu() {

    const permission = usePermission('menu_management').menu_management;

    const { subtab1 } = useParams();

    if (!permission) {
        return <RedirectWithMessage />
    }

    if (!subtab1) {
        return <Navigate to={'/appearance/menu/list'} />;
    }
}

export default Menu
