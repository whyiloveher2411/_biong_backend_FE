import SvgIcon from 'components/atoms/SvgIcon';
import React from 'react'

export type IconFormat = string | {
    custom: string
}

export interface IconProps {
    [key: string]: any, //eslint-disable-line
    icon: IconFormat,
    type?: 'material',
}

//eslint-disable-next-line
export default React.memo(React.forwardRef(function Icon({ icon, type = 'material', ...rest }: IconProps, ref: React.ForwardedRef<any>) {

    if (!icon) {
        return null;
    }

    if (typeof icon === 'object' && icon.custom) {
        return <SvgIcon ref={ref} {...rest}> <svg dangerouslySetInnerHTML={{ __html: icon.custom }
        } /></SvgIcon>
    }

    // try {
    if (type === 'material' && typeof icon === 'string') {
        //eslint-disable-next-line
        let resolved = require(`@mui/icons-material/esm/${icon}`).default;
        return React.createElement(resolved, { ...rest, ref: ref });
    }
    // } catch (error) {
    // }

    return null;
}), (props1, props2) => {
    return props1.icon === props2.icon;
});
