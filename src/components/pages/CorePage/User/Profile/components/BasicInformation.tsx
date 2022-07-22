import Grid from 'components/atoms/Grid';
import CardHeader from 'components/atoms/CardHeader';
import CardContent from 'components/atoms/CardContent';
import CardActions from 'components/atoms/CardActions';
import Card from 'components/atoms/Card';
import Divider from 'components/atoms/Divider';
import LoadingButton from 'components/atoms/LoadingButton';
import React from 'react';
import { __ } from 'helpers/i18n';
import { UserProfileProps } from '..';
import FieldForm from 'components/atoms/fields/FieldForm';
import { UseAjaxProps } from 'hook/useApi';

function BasicInformation({ user, setUser, handleSubmit, enableEmail = false, ajaxHandle }: {
    handleSubmit: () => void,
    user: UserProfileProps,
    setUser: React.Dispatch<React.SetStateAction<UserProfileProps>>,
    enableEmail?: boolean,
    ajaxHandle: UseAjaxProps
}) {

    if (user) {

        return (
            <Grid
                container
                spacing={3}>
                <Grid item lg={4} md={6} xl={3} xs={12}>
                    <Card>
                        <CardContent
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                flexDirection: 'column',
                                textAlgin: 'center',
                            }}>
                            <div>
                                <FieldForm
                                    component={'image'}
                                    config={{
                                        title: '',
                                    }}
                                    post={user}
                                    name={'profile_picture'}
                                    onReview={value => {
                                        setUser(prev => ({
                                            ...prev,
                                            profile_picture: value,
                                        }));
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item lg={8} md={6} xl={9} xs={12}>
                    <Card>
                        <CardHeader title={__('Basic Information')} />
                        <Divider />
                        <CardContent>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <FieldForm
                                        component={'text'}
                                        config={{
                                            title: __('First Name'),
                                        }}
                                        post={user}
                                        name={'first_name'}
                                        onReview={value => {
                                            setUser(prev => ({
                                                ...prev,
                                                first_name: value,
                                            }));
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FieldForm
                                        component={'text'}
                                        config={{
                                            title: __('Last Name'),
                                        }}
                                        post={user}
                                        name={'last_name'}
                                        onReview={value => {
                                            setUser(prev => ({
                                                ...prev,
                                                last_name: value,
                                            }));
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FieldForm
                                        component={'text'}
                                        config={{
                                            title: __('Email'),
                                        }}
                                        disabled={!enableEmail}
                                        post={user}
                                        name={'email'}
                                        onReview={value => {
                                            setUser(prev => ({
                                                ...prev,
                                                email: value,
                                            }));
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FieldForm
                                        component={'text'}
                                        config={{
                                            title: __('Phone'),
                                        }}
                                        post={user.meta as JsonFormat}
                                        name={'number_phone'}
                                        onReview={value => {
                                            setUser(prev => ({
                                                ...prev,
                                                meta: {
                                                    ...prev.meta,
                                                    number_phone: value,
                                                }
                                            }));
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                        <Divider />
                        <CardActions>
                            <LoadingButton
                                loading={ajaxHandle.open}
                                onClick={handleSubmit}
                                color="success"
                                variant="contained">
                                {__('Save Changes')}
                            </LoadingButton>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
        )

    }

    return null;
}

export default BasicInformation
