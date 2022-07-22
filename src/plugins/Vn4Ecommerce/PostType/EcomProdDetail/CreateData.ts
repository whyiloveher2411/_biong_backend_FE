import React from 'react'
import { useNavigate } from 'react-router-dom';

function CreateDataEcomproddetail() {

    const navigate = useNavigate();

    React.useEffect(() => {
        navigate('/post-type/ecom_prod/new');
    }, []);

    return null;
}

export default CreateDataEcomproddetail
