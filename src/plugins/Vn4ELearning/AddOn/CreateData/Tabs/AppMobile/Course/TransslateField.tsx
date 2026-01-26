import React from 'react'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import Box from 'components/atoms/Box'
import { FormLabel, Tooltip, IconButton } from '@mui/material'
import FieldForm from 'components/atoms/fields/FieldForm'
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useLanguages from '../hooks/useLanguages';

function TransslateField(props: FieldFormItemProps) {

    const [langCodeCurrent, setLangCodeCurrent] = React.useState('en');
    const refLangCodeCurrent = React.useRef(langCodeCurrent);
    const { languages } = useLanguages();


    let valueInital: { [key: string]: ANY } = {};
    try {
        if (props.post[props.name] && typeof props.post[props.name] === 'object') {
            valueInital = props.post[props.name];
        } else {
            if (props.post[props.name]) {
                valueInital = JSON.parse(props.post[props.name]);
            } else {
                valueInital = {};
            }
        }

    } catch (error) {
        valueInital = {};
    }

    props.post[props.name] = valueInital;

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormLabel sx={{ fontWeight: 'bold', color: 'text.primary', whiteSpace: 'nowrap' }}>{props.config.title}</FormLabel>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {languages?.map((language) => (
                        <Tooltip key={language.code} title={language.name}
                            sx={{

                            }}
                            placement="top"
                        >
                            <IconButton
                                size="small"
                                sx={{
                                    p: '2px',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '4px',
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                        borderColor: 'primary.main',
                                    },
                                    ...(langCodeCurrent === language.code ? {
                                        backgroundColor: 'action.hover',
                                        borderColor: 'primary.main',
                                    } : {}),
                                    position: 'relative',
                                    overflow: 'visible'
                                }}
                                onClick={() => {
                                    refLangCodeCurrent.current = language.code;
                                    setLangCodeCurrent(language.code)
                                }}
                            >
                                {valueInital?.[language.code] && (
                                    <CheckCircleIcon
                                        sx={{
                                            position: 'absolute',
                                            top: -6,
                                            right: -6,
                                            width: 14,
                                            height: 14,
                                            color: 'success.main',
                                            backgroundColor: 'background.paper',
                                            borderRadius: '50%',
                                            zIndex: 1,
                                        }}
                                    />
                                )}
                                {language.icon_url ? (
                                    <img
                                        src={language.icon_url}
                                        alt={language.name}
                                        style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: '2px', display: 'block' }}
                                    />
                                ) : (
                                    <img
                                        src={`https://flagcdn.com/w20/${language.flag_code}.png`}
                                        alt={language.name}
                                        style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: '2px', display: 'block' }}
                                    />
                                )}
                            </IconButton>
                        </Tooltip>
                    ))}
                </Box>
            </Box>
            <FieldForm
                component={props.config.primary_view}
                config={{ ...props.config, title: false }}
                post={{ value: props.post[props.name]?.[refLangCodeCurrent.current] }}
                name={'value'}
                onReview={(value) => {

                    props.onReview({
                        ...props.post[props.name],
                        [refLangCodeCurrent.current]: value
                    }, props.name)
                }}
            />
        </Box>
    )
}

export default TransslateField