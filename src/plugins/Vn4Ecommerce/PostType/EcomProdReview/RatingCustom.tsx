import Typography from 'components/atoms/Typography';
import FormControl from 'components/atoms/FormControl';
import Rating from 'components/atoms/Rating';
import { FieldViewItemProps } from 'components/atoms/fields/type';
import React from 'react';
import Icon from 'components/atoms/Icon';

export default function RatingCustom(props: FieldViewItemProps) {

    const [render, setRender] = React.useState(0);
    if (props.fieldtype === 'list') {
        return (
            <div>
                <Rating
                    value={props.post[props.name]}
                    readOnly
                    emptyIcon={<Icon icon="Star" style={{ opacity: 0.55 }} fontSize="inherit" />}
                />
            </div>
        )
    }

    return (
        <FormControl size={props.config.size ?? 'medium'} fullWidth variant="outlined">
            <Typography component="legend">{props.config.title}</Typography>
            <Rating
                onChange={(_e, value) => { props.post[props.name] = value; props.onReview(value, props.name); setRender(render + 1); }}
                name="size-large"
                value={props.post[props.name] ?? 0}
                size="large"
                emptyIcon={<Icon icon="Star" style={{ opacity: 0.55 }} fontSize="inherit" />}
            />
        </FormControl>
    )
}
