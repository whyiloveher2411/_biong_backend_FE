import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import React from 'react';
import { FileProps } from '.';
import FieldForm from '../../FieldForm';

const useStyles = makeCSS((theme) => ({
    item: {
        position: 'relative',
        paddingBottom: '100%',
        cursor: 'pointer'
    },
    iconCheck: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        color: 'white',
        transform: 'translate(-50%,-50%)',
    }
}));

const listColorSchema = [
    '#69caf7',
    '#ac725e', '#d06b64', '#f83a22', '#fa573c', '#ff7537', '#ffad46',
    '#42d692', '#16a765', '#7bd148', '#b3dc6c', '#fbe983', '#fad165',
    '#92e1c0', '#9fe1e7', '#9fc6e7', '#4986e7', '#9a9cff', '#b99aff',
    '#5f6368', '#cabdbf', '#cca6ac', '#f691b2', '#cd74e6', '#a47ae2'
];

function SchemaColor({ file, handleReloadDir, ...rest }: {
    [key: string]: ANY,
    handleReloadDir: (path?: string | null | undefined) => void,
    file: FileProps,
}) {

    const classes = useStyles();

    const ajax = useAjax();

    const [color, setColor] = React.useState({
        value: file.data?.color
    });

    const handleChangeColorFolder = (colorUpdate: string) => {

        ajax.ajax({
            url: 'file-manager/change-color',
            data: {
                file: file,
                color: colorUpdate
            },
            success: (result: JsonFormat) => {
                if (result.sucess) {
                    if (rest.handleClose) {
                        rest.handleClose();
                    }

                    if (handleReloadDir) {
                        handleReloadDir();
                    }
                }
            }
        });
    }

    return (
        <div style={{ width: '220px' }} onClick={e => e.stopPropagation()}>
            <Box display="grid" gridTemplateColumns="repeat(6, 1fr)" style={{ width: '100%', padding: '0px 8px', margin: 0, gap: 5 }}>
                {
                    listColorSchema.map(colorItem => (
                        <div onClick={e => handleChangeColorFolder(colorItem)} key={colorItem} style={{ backgroundColor: colorItem }} className={classes.item}>
                            {
                                file.data?.color === colorItem && <Icon icon="DoneRounded" className={classes.iconCheck} />
                            }
                        </div>
                    ))
                }
            </Box>
            <div style={{ padding: 8 }}>
                <FieldForm
                    component="color"
                    config={{
                        title: false,
                        size: 'small'
                    }}
                    post={color}
                    name="value"
                    onReview={(value) => { setColor({ value: value }) }}
                />
                <p style={{ textAlign: 'right', margin: 0 }}>
                    <Button onClick={e => handleChangeColorFolder(color.value ?? '')} variant="contained" color="primary" style={{ marginTop: 8 }}>{__('OK')}</Button>
                </p>
            </div>

            {ajax.Loading}
        </div>
    )
}

export default SchemaColor
