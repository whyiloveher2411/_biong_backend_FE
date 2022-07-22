import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import makeCSS from 'components/atoms/makeCSS';
import Timeline from 'components/atoms/Timeline';
import TimelineConnector from 'components/atoms/TimelineConnector';
import TimelineContent from 'components/atoms/TimelineContent';
import TimelineDot from 'components/atoms/TimelineDot';
import TimelineItem from 'components/atoms/TimelineItem';
import TimelineOppositeContent from 'components/atoms/TimelineOppositeContent';
import TimelineSeparator from 'components/atoms/TimelineSeparator';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import useAjax from 'hook/useApi';
import useConfirmDialog from 'hook/useConfirmDialog';
import React from 'react';

const useStyles = makeCSS({
    root: {
        '& .MuiTimelineOppositeContent-root': {
            width: 210,
            flex: 'unset',
        }
    },
    iconRemove: {
        display: 'none',
    },
    iconType: {

    },
    timelineDot: {
        cursor: 'pointer',
        '&:hover $iconType': {
            display: 'none'
        },
        '&:hover $iconRemove': {
            display: 'block'
        },
    }
});

interface MessageProps {
    type: string,
    created_at: string,
    message: string,
    paramMessage: JsonFormat,
    by: {
        name: string,
        email: string,
    }
}

function History(props: FieldFormItemProps) {

    const classes = useStyles();

    const [historys, setHistorys] = React.useState<Array<MessageProps>>([]);

    const confirmDialog = useConfirmDialog();

    const { ajax, Loading } = useAjax();

    const [dataNote, setDataNote] = React.useState({
        message: '',
        type: 'private'
    });

    React.useEffect(() => {

        let valueInital = [];

        try {
            if (props.post.history && typeof props.post.history === 'object') {
                valueInital = props.post.history;
            } else {
                if (props.post.history) {
                    valueInital = JSON.parse(props.post.history);
                }
            }
        } catch (error) {
            valueInital = [];
        }

        setHistorys(valueInital);

    }, [props.post.history]);

    const handleClick = () => {
        setDataNote(prev => ({ ...prev, type: prev.type === 'private' ? 'customer' : 'private' }))
    }

    const handleAddNote = () => {
        if (dataNote.message) {
            ajax({
                url: 'plugin/vn4-ecommerce/order/history',
                data: {
                    ...dataNote,
                },
                success: (result) => {
                    if (result.history) {
                        let historys2 = [...historys, result.history];

                        props.onReview(historys2, props.name);
                        setDataNote({
                            message: '',
                            type: 'private'
                        });
                    }
                }
            });
        }
    }

    const setMessage = (message: string, param: JsonFormat) => {

        let find = Object.keys(param);
        let replace = Object.values(param);

        let replaceString = message;

        for (let i = 0; i < find.length; i++) {
            replaceString = replaceString.replace('{{' + find[i] + '}}', replace[i]);
        }

        return replaceString;
    }

    const handleRemove = (index: number) => {

        setHistorys(prev => {
            let items = [...prev];
            items.splice(index, 1);
            props.onReview(items, props.name);
            return items;
        });
    };

    return (
        <div className={classes.root}>
            <Timeline>
                {
                    historys.map((item, index) => (
                        <TimelineItem key={index}>
                            <TimelineOppositeContent>
                                <Typography color="textSecondary">{item.created_at}</Typography>
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                                <Tooltip title={item.type === 'primary' ? 'Primary' : 'Note to Customer'}>
                                    <TimelineDot
                                        onClick={() => confirmDialog.onConfirm(() => handleRemove(index))}
                                        className={classes.timelineDot}
                                        style={{ backgroundColor: item.type === 'primary' ? '#7903da' : '#43a047' }}
                                    >

                                        <Icon className={classes.iconRemove} icon="ClearOutlined" />

                                        <Icon className={classes.iconType} icon={item.type === 'primary' ? 'PersonOutlined' : 'PeopleAltOutlined'} />

                                    </TimelineDot>
                                </Tooltip>
                                {
                                    index !== (historys.length - 1) ?
                                        <TimelineConnector />
                                        : <></>
                                }
                            </TimelineSeparator>
                            <TimelineContent>
                                <Typography>{setMessage(item.message, item.paramMessage)}</Typography>
                                <Typography variant="body2">By {item.by.name} ({item.by.email})</Typography>
                            </TimelineContent>
                        </TimelineItem>
                    ))
                }
            </Timeline>
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gridGap: 16
                }}
            >
                <FieldForm
                    component='textarea'
                    config={{
                        title: 'Add Note',
                        inputProps: {
                            endAdornment: <InputAdornment position="end">
                                <Tooltip title="Note to Customer">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={handleClick}
                                        edge="end"
                                    >
                                        {dataNote.type === 'private' ? <Icon icon="VisibilityOff" /> : <Icon icon="Visibility" />}
                                    </IconButton>
                                </Tooltip>
                            </InputAdornment>
                        }
                    }}
                    post={dataNote}
                    name="message"
                    forceUpdate
                    onReview={(value) => { setDataNote(prev => ({ ...prev, message: value })) }}

                />
                <div style={{ textAlign: 'right' }}>
                    <Button onClick={handleAddNote} variant="contained" color="primary">
                        {__('Add')}
                    </Button>
                </div>
            </Box>
            {Loading}
            {confirmDialog.component}
        </div>
    )
}

export default History
