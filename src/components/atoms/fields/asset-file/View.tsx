import CardMedia from 'components/atoms/CardMedia';
import Typography from 'components/atoms/Typography';
import React from 'react';
import { FieldViewItemProps } from '../type';


function View(props: FieldViewItemProps) {

    const [value, setValue] = React.useState<{
        link?: string
        ext?: string
    }>({});

    React.useEffect(() => {
        let valueInital = {};

        try {
            if (typeof props.content === 'object') {
                valueInital = props.content;
            } else {
                if (props.content) {
                    valueInital = JSON.parse(props.content);
                }
            }
        } catch (error) {
            valueInital = {};
        }

        if (!valueInital) valueInital = {};

        setValue(valueInital);
    }, []);



    return (value.link ?
        <div>
            <div style={{ marginBottom: 5, position: 'relative', display: 'inline-block' }}>
                <CardMedia
                    style={{ maxWidth: '100%', width: 'auto', cursor: 'pointer' }}
                    component="img"
                    image={'/admin/fileExtension/ico/' + (value.ext?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + '.jpg')}
                />
            </div>
            <Typography variant="body2" style={{ marginBottom: 16, wordBreak: 'break-all' }}>
                {decodeURI(value.link.replace(/^.*[\\/]/, ''))}
            </Typography>
        </div>
        : <></>
    )
}

export default View
