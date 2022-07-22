import { AutocompleteRenderInputParams } from '@mui/material';
import Box from 'components/atoms/Box';
import CircularProgress from 'components/atoms/CircularProgress';
import FieldForm from 'components/atoms/fields/FieldForm';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import TextField from 'components/atoms/TextField';
import Typography from 'components/atoms/Typography';
import { getImageUrl } from 'helpers/image';
import React from 'react';

function Main({ config, post, onReview, name }: FieldFormItemProps) {

    return (
        <FieldForm
            component={'relationship_onetomany'}
            config={{
                title: config.title,
                object: config.object
            }}
            renderOption={(props: JsonFormat, option: JsonFormat) => (
                <Box
                    sx={{
                        display: "flex",
                        width: 1,
                        alignItems: "center",
                        gridGap: 8
                    }}
                    {...props}
                >
                    {
                        Boolean(option.logo) &&
                        <img style={{ width: 150, maxHeight: 40, flexShrink: 0, objectFit: 'contain' }}
                            src={getImageUrl(option.logo)}
                            title={option.title}
                        />
                    }
                    <div style={{ maxWidth: 'calc( 100% - 150px)' }}>
                        <Typography variant="h6">{option.title}</Typography>
                        <Typography variant="body2"> {option.website}</Typography>
                        <Typography noWrap variant="body2"> {option.description}</Typography>
                    </div>
                </Box>
            )}

            // <div>
            //             {
            //                 Boolean(post[name + '_detail']?.logo) &&
            //                 <img style={{ width: 150, maxHeight: 40, flexShrink: 0, objectFit: 'contain' }} variant="square" src={getImageUrl(post[name + '_detail']?.logo)} title={post[name + '_detail']?.title} />
            //             }
            //         </div>

            renderInput={(params: AutocompleteRenderInputParams, detail: JsonFormat, loading: boolean) => (
                <TextField
                    {...params}
                    label={config.title}
                    variant="outlined"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                        startAdornment: (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                {
                                    Boolean(detail?.logo) &&
                                    <img
                                        style={{ marginRight: 4, maxWidth: 150, height: 24, flexShrink: 0, objectFit: 'contain' }}
                                        src={getImageUrl(detail.logo)}
                                        title={detail?.title}
                                    />
                                }
                            </Box>
                        )
                    }}
                />
            )}
            post={post}
            name={name}
            onReview={(value, key) => {
                onReview(value, key);
            }}
        />
    )

}

export default Main
