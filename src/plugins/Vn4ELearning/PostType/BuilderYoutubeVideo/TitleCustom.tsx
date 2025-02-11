import { Link } from '@mui/material';
import { FieldViewItemProps } from 'components/atoms/fields/type';

export default function TitleCustom(props: FieldViewItemProps) {
    return (
        <Link onClick={(e) => {
            e.stopPropagation();
        }} href={'https://www.youtube.com/watch?v=' + props.post[props.name]} target='_blank'>
            {props.post[props.name]}
        </Link>
    )
}