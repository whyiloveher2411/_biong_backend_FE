import Box from 'components/atoms/Box'
import Label from 'components/atoms/Label'
import React from 'react'
import { FieldViewItemProps } from '../type'

function View(props: FieldViewItemProps) {

    if (props.content) {

        if (props.config.template === 'dotcolor') {
            return (
                <>
                    <span style={{ marginBottom: 2, display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: props.config.list_option[props.content]?.color ?? '#dedede' }}></span>&nbsp;&nbsp;{props.config.list_option[props.content]?.title ?? props.content}
                </>
            )
        } else if (props.config.template === 'textcolor') {
            return <strong style={{ color: props.config.list_option[props.content]?.color ?? 'unset' }}>{props.config.list_option[props.content]?.title ?? props.content}</strong>
        }

        if (props.config.list_option[props.content]?.image) {
            return (<Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <img
                    style={{
                        ['--width' as string]: props.config.list_option[props.content].width ? props.config.list_option[props.content].width : '20px',
                        display: 'inline-block',
                        width: 'var(--width, 20px)',
                        height: 'auto',
                        borderRadius: 3,
                    }}
                    alt='select option'
                    src={props.config.list_option[props.content].image}
                />
                {props.config.list_option[props.content]?.title ?? props.content}
            </Box>
            )
        }

        return (
            <>
                <Label
                    color={props.config.list_option[props.content]?.color ?? '#404040'}
                    textColor={props.config.list_option[props.content]?.textColor} >
                    {props.config.list_option[props.content]?.title ?? props.content}
                </Label>
            </>
        )
    }
    return null;
}

export default View
