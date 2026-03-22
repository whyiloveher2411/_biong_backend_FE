import { FieldViewItemProps } from 'components/atoms/fields/type'
import moment from 'moment'
import 'moment/locale/vi'

export default function LastCheckedAt(props: FieldViewItemProps) {
    const value = props.post[props.name]
    if (!value) return <></>
    return <>{moment(value).locale('vi').fromNow()}</>
}



