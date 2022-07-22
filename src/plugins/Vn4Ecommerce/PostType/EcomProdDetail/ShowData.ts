import React from 'react'
import { useNavigate } from 'react-router-dom';

function ShowData() {

    const navigate = useNavigate();

    React.useEffect(() => {
        navigate('/post-type/ecom_prod/list');
    }, []);

    return null;
}

export default ShowData
