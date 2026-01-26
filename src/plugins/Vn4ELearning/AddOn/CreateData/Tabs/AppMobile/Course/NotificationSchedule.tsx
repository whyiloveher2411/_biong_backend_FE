import { Button } from '@mui/material'
import Box from 'components/atoms/Box'
import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import React from 'react'

function NotificationSchedule(props: FieldFormItemProps) {

    const [time, setTime] = React.useState(0);

    const handleSetNowPlus60s = () => {
        setTime(prev => prev + 1);
        props.onReview({
            ...props.post[props.name],
            hour: new Date().getHours(),
            minute: new Date().getMinutes() + (new Date().getSeconds() > 50 ? 2 : 1),
        }, props.name)
    };

    if (time % 2 === 0) {
        return <Box>
            <Box>
                <FieldForm
                    component={props.config.view}
                    config={{ ...props.config }}
                    post={props.post}
                    name={props.name}
                    onReview={props.onReview}
                />
                <Box sx={{ mt: 1 }}>
                    <Button variant="contained" onClick={handleSetNowPlus60s}>Set Now + 60s</Button>
                </Box>
            </Box>
        </Box>
    }

    return (
        <Box>
            <FieldForm
                component={props.config.view}
                config={{ ...props.config }}
                post={props.post}
                name={props.name}
                onReview={props.onReview}
            />
            <Box sx={{ mt: 1 }}>
                <Button variant="contained" onClick={handleSetNowPlus60s}>Set Now + 60s</Button>
            </Box>
        </Box>
    )
}

export default NotificationSchedule