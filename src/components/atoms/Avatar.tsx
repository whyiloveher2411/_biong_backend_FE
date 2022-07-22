import { AvatarProps as MuiAvatarProps, Theme } from '@mui/material';
import { default as MuiAvatar } from '@mui/material/Avatar';
import { makeStyles } from '@mui/styles';
import { convertToURL } from 'helpers/url';
import React from 'react';

const useStyles = makeStyles(({ palette }: Theme) => ({
    image: {
        color: palette.text.secondary + ' !important',
    },
    noImage: {
        width: 40,
        height: 40,
        maxWidth: '100%',
        maxHeight: '100%',
        fill: palette.text.secondary + ' !important',
        backgroundColor: 'unset !important',
    },
}));

export interface ImageProps {
    type_link: string,
    link: string
}

type AvatarProps = MuiAvatarProps & {
    image?: string | Array<ImageProps> | ImageProps,
    src?: string,
    name?: string,
}

const ThumbnaiLDefault = ({ className, ...rest }: { [key: string]: ANY, className: string }) => <svg viewBox="0 0 20 20"
    width="24"
    height="24"
    className={className}
    {...rest}
>
    <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v15A1.5 1.5 0 0 0 2.5 19h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 17.5 1h-15zm5 3.5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zM16.499 17H3.497c-.41 0-.64-.46-.4-.79l3.553-4.051c.19-.21.52-.21.72-.01L9 14l3.06-4.781a.5.5 0 0 1 .84.02l4.039 7.011c.18.34-.06.75-.44.75z"></path>
</svg>;


function Avatar({ image, src, className, name = '', children, ...rest }: AvatarProps) {

    const [imageState, setImage] = React.useState<string | boolean>(false);
    // const color = React.useState(randomColor());

    const classes = useStyles();

    React.useEffect(() => {

        let avatarUrl: string | boolean | undefined = src;

        try {
            if (image) {

                if (Array.isArray(image) && image[0]) {
                    avatarUrl =
                        image[0].type_link === "local"
                            ? convertToURL(process.env.REACT_APP_BASE_URL, image[0].link)
                            : image[0].link;

                } else if (typeof image === "string") {
                    let imageJson: ImageProps = JSON.parse(image);
                    avatarUrl =
                        imageJson.type_link === "local"
                            ? convertToURL(process.env.REACT_APP_BASE_URL, imageJson.link)
                            : imageJson.link;
                } else if (typeof image === 'object') {
                    let imageJson: ImageProps = image as ImageProps;
                    avatarUrl =
                        imageJson.type_link === "local"
                            ? convertToURL(process.env.REACT_APP_BASE_URL, imageJson.link)
                            : imageJson.link;
                }


            }
        } catch (error) {
            //
        }

        if (!avatarUrl) avatarUrl = false;

        setImage(avatarUrl);

    }, [image, src]);

    // if (imageState === false) {
    //     return <></>;
    // }

    if (children) {
        return <MuiAvatar
            alt={name}
            className={className + ' ' + classes.image}
            {...rest}
            style={{
                ...rest.style,
            }}
        >
            {children}
        </MuiAvatar>
    }

    if (typeof imageState === 'string') {
        return (
            <MuiAvatar
                alt={name}
                src={imageState}
                className={className + ' ' + classes.image}
                {...rest}
                style={{
                    // backgroundImage: "url('/admin/fileExtension/trans.jpg')",
                    // backgroundColor: color[0],
                    ...rest.style,
                }}
            >
                {name}
            </MuiAvatar>
        )
    }

    return <ThumbnaiLDefault
        className={classes.noImage + ' noImage ' + className + ' ' + classes.image}
        style={{
            ...rest.style,
        }}
    />
}

export default Avatar
