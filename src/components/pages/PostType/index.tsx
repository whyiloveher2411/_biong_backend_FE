import RedirectWithMessage from 'components/function/RedirectWithMessage';
import React from 'react';
import { usePermission } from 'hook/usePermission';
import CreateData from './CreateData';
import ShowData from './ShowData';
import { useParams } from 'react-router-dom';

const PostType = () => {

    let { type, action } = useParams<{
        type: string,
        action: string,
    }>();


    const permission = usePermission(
        type + '_list',
        type + '_edit',
        type + '_create',
    );

    if (!type) {
        return <RedirectWithMessage code={404} />
    }

    if (action === 'list') {

        if (permission[type + '_list']) {
            return <ShowData type={type} action={action} />;
        } else {
            return <RedirectWithMessage />
        }

    } else if (action === 'edit') {

        if (permission[type + '_edit']) {
            return <CreateData type={type} action={action} />;
        } else {
            return <RedirectWithMessage />
        }

    } else if (action === 'new') {

        if (permission[type + '_create']) {
            return <CreateData type={type} action={action} />;
        } else {
            return <RedirectWithMessage />
        }

    }
    return <RedirectWithMessage code={404} />
}

export default PostType
