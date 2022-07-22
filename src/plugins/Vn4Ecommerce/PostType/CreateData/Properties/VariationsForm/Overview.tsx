import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Chip from 'components/atoms/Chip';
import FieldForm from 'components/atoms/fields/FieldForm';
import Grid from 'components/atoms/Grid';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import React from 'react';
import { AttrValueItemProps, ValuesOfAttributesProps } from '..';

function Overview({ times, post, handleOnReviewValue, listValuesAttributes, handleToggleDeleteVariantionCurrent, PLUGIN_NAME }
    : {
        times: number,
        PLUGIN_NAME: string,
        post: JsonFormat,
        handleOnReviewValue: (name: string) => (value: ANY) => void,
        handleToggleDeleteVariantionCurrent: () => void,
        listValuesAttributes: {
            [key: string]: ValuesOfAttributesProps;
        }
    }
) {
    return (
        <Card>
            <CardContent>
                <Grid container spacing={3}>
                    <Grid item md={6}>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                gridGap: 24,
                                justifyContent: "space-between",
                                height: '100%'
                            }}
                        >
                            <Grid container spacing={3}>
                                <Grid item md={12}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            gridGap: 8
                                        }}
                                    >
                                        <Typography variant="subtitle1" style={{ marginBottom: 8 }}>Options: {post.label} </Typography>
                                        {
                                            Boolean(post.delete) &&
                                            <Chip
                                                size="small"
                                                label={__('Removed')}
                                                color="error"
                                                onDelete={handleToggleDeleteVariantionCurrent}
                                            />
                                        }
                                    </Box>
                                </Grid>
                                {
                                    post.attributes.map((attValue: AttrValueItemProps) => (
                                        listValuesAttributes['id_' + attValue.ecom_prod_attr]?.title ?
                                            <Grid key={attValue.id} item md={12}>
                                                <FieldForm
                                                    component="text"
                                                    config={{
                                                        title: listValuesAttributes['id_' + attValue.ecom_prod_attr]?.title,
                                                        inputProps: {
                                                            disabled: true
                                                        }
                                                    }}
                                                    name="name"
                                                    post={{ name: attValue.title }}
                                                    onReview={() => { }} //eslint-disable-line
                                                />
                                            </Grid>
                                            :
                                            <React.Fragment key={attValue.id}></React.Fragment>
                                    ))
                                }

                                <Grid item md={12}>
                                    <FieldForm
                                        component="text"
                                        config={{
                                            title: 'Title',
                                        }}
                                        name="title"
                                        post={post}
                                        onReview={handleOnReviewValue('title')}
                                    />
                                </Grid>
                                {/* <Grid item md={12}>
                                    <FieldForm
                                        compoment="textarea"
                                        config={{
                                            title: __('Description'),
                                        }}
                                        name="description"
                                        post={post}
                                        onReview={handleOnReviewValue('description')}
                                    />
                                </Grid> */}
                            </Grid>
                            <Box
                                sx={{
                                    flexShrink: 0,
                                    display: "flex",
                                    gridGap: 8
                                }}
                            >
                                {
                                    post.delete ?
                                        <Button color="success" onClick={handleToggleDeleteVariantionCurrent} variant="contained" >{__('Restore')}</Button>
                                        :
                                        <Button color="error" onClick={handleToggleDeleteVariantionCurrent} variant="contained" >{__('Delete')}</Button>
                                }
                            </Box>
                        </Box>
                    </Grid>
                    <Grid item md={6}>
                        {
                            times % 2 === 0 ?
                                <FieldForm
                                    component="image"
                                    times={times}
                                    config={{
                                        title: 'Images',
                                        multiple: true,
                                        widthThumbnail: '120px',
                                    }}
                                    name="images"
                                    post={post}
                                    onReview={handleOnReviewValue('images')}
                                />
                                :
                                <div>
                                    <FieldForm
                                        component="image"
                                        times={times}
                                        config={{
                                            title: 'Images',
                                            multiple: true,
                                            widthThumbnail: '120px',
                                        }}
                                        name="images"
                                        post={post}
                                        onReview={handleOnReviewValue('images')}
                                    />
                                </div>
                        }

                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    )
}

export default Overview
