import LoadingButton from 'components/atoms/LoadingButton'
import Card from 'components/atoms/Card'
import CardActions from 'components/atoms/CardActions'
import CardContent from 'components/atoms/CardContent'
import CardHeader from 'components/atoms/CardHeader'
import Divider from 'components/atoms/Divider'
import FieldForm from 'components/atoms/fields/FieldForm'
import Grid from 'components/atoms/Grid'
import { __ } from 'helpers/i18n'
import React from 'react'
import { UserProfileProps } from '..'
import { UseAjaxProps } from 'hook/useApi'

function Security({ user, setUser, handleSubmit, ajaxHandle, hasConfirmOldPassword = true }: {
    handleSubmit: () => void,
    user: UserProfileProps,
    setUser: React.Dispatch<React.SetStateAction<UserProfileProps>>,
    ajaxHandle: UseAjaxProps,
    hasConfirmOldPassword?: boolean,
}) {
    return (
        <Card>
            <CardHeader title={__('Security')} />
            <Divider />
            <CardContent>
                <Grid container spacing={3}>
                    {
                        hasConfirmOldPassword &&
                        <Grid item md={12} sm={12} xs={12}>
                            <Grid container spacing={3}>
                                <Grid item md={4} sm={6} xs={12}>

                                    <FieldForm
                                        component={'password'}
                                        config={{
                                            title: __('Current Password'),
                                            generator: false,
                                        }}
                                        post={user}
                                        name={'old_password'}
                                        onReview={(value) => {
                                            setUser(prev => ({
                                                ...prev,
                                                old_password: value
                                            }));
                                        }}
                                    />

                                </Grid>
                            </Grid>
                        </Grid>
                    }
                    <Grid item md={4} sm={6} xs={12}>
                        <FieldForm
                            component={'password'}
                            config={{
                                title: __('New Password'),
                                generator: true,
                            }}
                            post={user}
                            name={'password'}
                            onReview={(value) => {
                                setUser(prev => ({
                                    ...prev,
                                    password: value
                                }));
                            }}
                        />
                    </Grid>
                    <Grid item md={4} sm={6} xs={12}>
                        <FieldForm
                            component={'password'}
                            config={{
                                title: __('Confirm password'),
                                generator: false,
                                forceRender: true,
                                note: user.confirm_password && user.confirm_password !== user.password ? __('The password confirmation does not match.') : '',
                                error: user.confirm_password && user.confirm_password !== user.password
                            }}
                            post={user}
                            name={'confirm_password'}
                            onReview={(value) => {
                                setUser(prev => ({
                                    ...prev,
                                    confirm_password: value
                                }));
                            }}
                        />
                    </Grid>
                </Grid>
            </CardContent>
            <Divider />
            <CardActions>
                <LoadingButton
                    disabled={
                        (hasConfirmOldPassword && !user.old_password)
                        || (user.confirm_password && user.confirm_password !== user.password)
                        || user.confirm_password !== user.password
                        || !user.confirm_password
                    }
                    loading={ajaxHandle.open}
                    onClick={handleSubmit}
                    color="success"
                    variant="contained">
                    {__('Save Changes')}
                </LoadingButton>
            </CardActions>
        </Card>
    )
}

export default Security
