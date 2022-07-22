import Card from 'components/atoms/Card';
import CardContent from 'components/atoms/CardContent';
import Checkbox from 'components/atoms/Checkbox';
import { FieldFormItemProps } from 'components/atoms/fields/type';
import FormControlLabel from 'components/atoms/FormControlLabel';
import FormGroup from 'components/atoms/FormGroup';
import Grid from 'components/atoms/Grid';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import CircularCenter from 'components/molecules/CircularCenter';
import { usePermission } from 'hook/usePermission';
import React from 'react';

function VerifyWebsite({ post, onReview, config }: FieldFormItemProps) {

    const permission = usePermission('plugin_vn4seo_setting').plugin_vn4seo_setting;

    React.useEffect(() => {

        if (!Array.isArray(post['seo/sitemap/post_type'])) {

            let postType = [];

            try {
                postType = JSON.parse(post['seo/sitemap/post_type']) ?? [];
            } catch (error) {
                postType = [];
            }
            onReview(postType, 'seo/sitemap/post_type');
        }

    }, []);


    const handleChangeSiteMap = (e: React.ChangeEvent<HTMLInputElement>) => {

        let result = post['seo/sitemap/post_type'];

        let checked = e.target.checked, v = e.target.value, index = result.indexOf(v);

        if (checked && index === -1) {
            result.push(v);
        } else if (!checked && index !== -1) {
            result.splice(index, 1);
        }

        onReview(result, 'seo/sitemap/post_type');
    }


    if (!permission) {
        return <RedirectWithMessage />
    }

    if (Array.isArray(post['seo/sitemap/post_type'])) {
        return (
            <>
                <Card style={parseInt(post['seo/sitemap/active']) === 1 ? {} : { opacity: '.2', pointerEvents: 'none', cursor: 'not-allowed' }}>
                    <CardContent style={{ position: 'relative', minHeight: 350 }}>
                        {
                            config.listPostType === false &&
                            <CircularCenter />
                        }
                        <FormGroup row>
                            <Grid container spacing={1}>
                                {
                                    config.listPostType &&
                                    Object.keys(config.listPostType).map(key => (
                                        <Grid key={key} item md={4} xs={12}>
                                            <FormControlLabel
                                                control={<Checkbox
                                                    color="primary"
                                                    value={key}
                                                    checked={post['seo/sitemap/post_type'].indexOf(key) !== -1}
                                                    onChange={handleChangeSiteMap}
                                                    name="gilad"
                                                />}
                                                label={config.listPostType[key].title}
                                            />
                                        </Grid>
                                    ))
                                }

                            </Grid>
                        </FormGroup>
                    </CardContent>
                </Card>
            </>
        );
    }

    return <></>;

}

export default VerifyWebsite
