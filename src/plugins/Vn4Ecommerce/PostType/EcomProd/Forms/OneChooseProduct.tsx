import Avatar from 'components/atoms/Avatar';
import Box from 'components/atoms/Box';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import makeCSS from 'components/atoms/makeCSS';
import useAjax from 'hook/useApi';
import React from 'react';
import Price from './../Views/Price';

const useStyles = makeCSS({
    selectProduct: {
        '& .MuiAutocomplete-endAdornment': {
            display: 'none'
        },
        '& .MuiOutlinedInput-root, & .MuiAutocomplete-inputRoot[class*="MuiOutlinedInput-root"]': {
            paddingRight: 'unset',
        },
        '& .MuiAutocomplete-inputRoot .MuiAutocomplete-input': {
            padding: '8px 16px',
            margin: 3
        }
    },
    productID: {
        margin: 0,
        opacity: .4,
        fontWeight: 'bold'
    }
});

const AvatarThumbnail = ({ product }: { product: JsonFormat }) => <Avatar variant="square" style={{ marginRight: 8 }} image={product.featured_image} name={product.title} />;

function OneChooseProduct(props: FieldFormItemProps) {

    const classes = useStyles();

    const { ajax } = useAjax();

    const [productDetail, setProductDetail] = React.useState<JsonFormat | false>(false);

    const renderOption = (props: JsonFormat, option: JsonFormat) => (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                width: 1
            }}
            {...props}
            key={option.id}
        >
            <AvatarThumbnail product={option} />
            <div>
                <span className={classes.productID}>(ID: {option.id})</span> {option.title}
                <Price post={option} />
            </div>
            {Boolean(option.new_post) && <strong>&nbsp;(New Option)</strong>}
        </Box>
    );

    React.useEffect(() => {

        if (props.post[props.name] && props.post[props.name] !== '0') {
            ajax({
                url: 'plugin/vn4-ecommerce/create-data/get-product',
                data: {
                    id: props.post[props.name]
                },
                success: function (result) {
                    if (result.post.id) {
                        setProductDetail(result.post);
                    }
                }
            });
        }

    }, [props.post.id]);

    if (props.post[props.name + '_detail'] && typeof props.post[props.name + '_detail'] === 'string') {
        props.post[props.name + '_detail'] = JSON.parse(props.post[props.name + '_detail']);
    }

    return (
        <>
            <FieldForm
                className={classes.selectProduct}
                component='relationship_onetomany'
                config={{
                    ...props.config,
                    title: props.config.title,
                    object: props.config.object,
                    customViewForm: undefined,
                }}
                includeInputInList
                renderOption={renderOption}
                disableListWrap
                post={props.post}
                name={props.name}
                onReview={(value, key) => {
                    props.onReview(value, props.name);
                    setProductDetail((key as JsonFormat)[props.name + '_detail']);
                }}
            />
            {
                productDetail &&
                <Box display="flex" style={{ marginTop: 8, fontSize: 13 }}>
                    <div >
                        <AvatarThumbnail product={productDetail} />
                    </div>
                    <div>
                        <p style={{ marginBottom: 4, marginTop: 0 }}><span className={classes.productID}>(ID: {productDetail.id})</span> {productDetail.title}</p>
                        <Price post={productDetail} />
                    </div>
                </Box>
            }
        </>
    )
}

export default OneChooseProduct
