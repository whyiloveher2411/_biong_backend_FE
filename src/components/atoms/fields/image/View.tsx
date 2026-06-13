import CardMedia from 'components/atoms/CardMedia';
import ImageList from 'components/atoms/ImageList';
import ImageListItem from 'components/atoms/ImageListItem';
import { ImageObjectProps, openImagePopup } from 'helpers/image';
import { convertToURL } from 'helpers/url';
import { FieldViewItemProps } from '../type';
import Box from 'components/atoms/Box';

function View(props: FieldViewItemProps) {


    if (props.config.multiple) {


        let valueInital = [];

        try {
            if (typeof props.content === 'object') {
                valueInital = props.content;
            } else {
                if (props.content) {
                    valueInital = JSON.parse(props.content);
                }
            }
        } catch (error) {
            valueInital = [];
        }

        if (!valueInital) valueInital = [];


        return <ImageList className="custom_scroll" style={{ maxWidth: 200, flexWrap: 'nowrap' }} cols={1}>
            {valueInital.map((image: ImageObjectProps, index: number) => (
                <ImageListItem style={{ width: 160 }} key={index}>
                    <img src={image.type_link === 'local' ? convertToURL(process.env.REACT_APP_BASE_URL, image.link) : image.link} alt={'Field Form'} />
                </ImageListItem>
            ))}
        </ImageList>;
    }


    let valueInital: ImageObjectProps | false = false;

    try {
        if (typeof props.content === 'object') {
            valueInital = props.content;
        } else {
            if (props.content) {
                valueInital = JSON.parse(props.content);
            }
        }
    } catch (error) {
        valueInital = false;
    }

    if (!valueInital) valueInital = false;

    const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (valueInital && valueInital.type_link === 'local') {
            openImagePopup(convertToURL(process.env.REACT_APP_BASE_URL, valueInital.link));
        } else if (valueInital && valueInital.link) {
            openImagePopup(valueInital.link);
        }
    }

    return (
        <>
            {valueInital !== false &&
                <div>
                    <Box onClick={handleOnClick} style={{ marginBottom: 5, position: 'relative', display: 'inline-block' }}>
                        <CardMedia
                            style={{ width: 88, height: 50, maxWidth: '100%', maxHeight: 50, objectFit: 'contain', cursor: 'pointer' }}
                            component="img"
                            image={valueInital.type_link === 'local' ? convertToURL(process.env.REACT_APP_BASE_URL, valueInital.link) : valueInital.link}
                        />
                    </Box>
                </div>
            }
        </>
    )
}

export default View
