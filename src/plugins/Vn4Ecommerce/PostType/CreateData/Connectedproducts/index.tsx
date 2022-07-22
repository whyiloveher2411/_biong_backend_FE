import ListItemText from 'components/atoms/ListItemText';
import ListItemIcon from 'components/atoms/ListItemIcon';
import ListItem from 'components/atoms/ListItem';
import Grid from 'components/atoms/Grid';
import Checkbox from 'components/atoms/Checkbox';
import Box from 'components/atoms/Box';
import Skeleton from 'components/atoms/Skeleton';
import React from 'react';
import Icon from 'components/atoms/Icon';
import makeCSS from 'components/atoms/makeCSS';
import { Theme } from '@mui/material';
import Price from '../../EcomProd/Views/Price';
import FieldForm from 'components/atoms/fields/FieldForm';
import { __p } from 'helpers/i18n';
import Avatar from 'components/atoms/Avatar';

const icon = <Icon icon="CheckBoxOutlineBlank" fontSize="small" />;
const checkedIcon = <Icon icon="CheckBox" fontSize="small" />;

const useStyles = makeCSS((theme: Theme) => {
    return {
        root: {
            width: '100%',
            maxWidth: 360,
            backgroundColor: theme.palette.background.paper,
        },
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
        removeProductIcon: {
            opacity: .3,
            '&:hover': {
                opacity: 1
            }
        },
        productID: {
            margin: 0,
            opacity: .4,
            fontWeight: 'bold'
        }
    }
});

const AvatarThumbnail = ({ product }: {
    product: JsonFormat
}) => <Avatar variant="square" style={{ marginRight: 8 }} image={product.featured_image} name={product.title} />;


function Connectedproducts({ post, postDetail, onReview, PLUGIN_NAME }: {
    PLUGIN_NAME: string,
    postDetail: JsonFormat,
    post: ANY,
    onReview: (value: ANY, key: ANY, updateToPostMain?: boolean) => void
}) {

    const classes = useStyles();

    const renderOption = (props: JsonFormat, option: JsonFormat, { selected }: { selected: boolean }) => (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                width: 1
            }}
            {...props}
        >
            <Checkbox
                icon={icon}
                checkedIcon={checkedIcon}
                style={{ marginRight: 8 }}
                checked={selected}
                color="primary"
            />
            <AvatarThumbnail product={option} />
            <div>
                <span className={classes.productID}>(ID: {option.id})</span> {option.title}
                <Price post={option} />
            </div>
            {Boolean(option.new_post) && <strong>&nbsp;{__p('(New Option)', PLUGIN_NAME)}</strong>}
        </Box>
    );


    const renderTags = (tagValue: JsonFormat[], getTagProps: ({ index }: { index: number }) => JsonFormat) => {

        return tagValue.map((option, index) => {
            const { onDelete, ...rest } = getTagProps({ index });

            return <ListItem key={index} button {...rest}>
                <ListItemIcon >
                    <AvatarThumbnail product={option} />
                </ListItemIcon>
                <ListItemText primary={
                    <div>
                        <span className={classes.productID}>(ID: {option.id})</span> {option.title}
                        <Price post={option} />
                    </div>
                } />
                <Icon icon="ClearRounded" className={classes.removeProductIcon} onClick={onDelete} />
            </ListItem>
        });
    };

    if (post) {
        return (
            <Grid
                container
                spacing={3}>
                <Grid item md={12} xs={12}>
                    <FieldForm
                        className={classes.selectProduct}
                        component='relationship_manytomany'
                        config={{
                            title: __p('Up-Selling', PLUGIN_NAME),
                            object: 'ecom_prod',
                            conditions: [
                                ['id', '!=', postDetail.id]
                            ],
                        }}
                        includeInputInList
                        renderTags={renderTags}
                        renderOption={renderOption}
                        disableListWrap
                        post={post}
                        name='connected_products_up_selling'
                        onReview={(value) => onReview(value, 'connected_products_up_selling')}
                    />
                </Grid>

                <Grid item md={12} xs={12}>
                    <FieldForm
                        className={classes.selectProduct}
                        component='relationship_manytomany'
                        config={{
                            title: __p('Cross-Selling', PLUGIN_NAME),
                            object: 'ecom_prod',
                            conditions: [
                                ['id', '!=', postDetail.id]
                            ],
                        }}
                        renderTags={renderTags}
                        renderOption={renderOption}
                        post={post}
                        name='connected_products_cross_selling'
                        onReview={(value) => onReview(value, 'connected_products_cross_selling')}
                    />
                </Grid>
            </Grid >
        )
    }

    return (
        <Grid
            container
            spacing={3}>
            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
            </Grid>

            <Grid item md={12} xs={12}>
                <Skeleton variant="rectangular" width={'100%'} height={52} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
                <Skeleton variant="rectangular" width={'100%'} style={{ margin: '4px 0' }} height={30} />
            </Grid>
        </Grid >
    )
}

export default Connectedproducts
