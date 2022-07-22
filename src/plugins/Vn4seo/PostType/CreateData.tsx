import Typography from 'components/atoms/Typography';
import Tooltip from 'components/atoms/Tooltip';
import Grid from 'components/atoms/Grid';
import CardHeader from 'components/atoms/CardHeader';
import CardContent from 'components/atoms/CardContent';
import Card from 'components/atoms/Card';
import Divider from 'components/atoms/Divider';
import React from 'react';
import { HookCreateDataProps } from 'components/pages/PostType/CreateData/Form';
import Tabs from 'components/atoms/Tabs';
import Icon from 'components/atoms/Icon';
import { __p } from 'helpers/i18n';
import General from './components/General';
import Social from './components/Social';
import Schema from './components/Schema';
// import { General, Schema, Social } from '../compoments/SEOPostType';

function CreateData(props: HookCreateDataProps) {

    const [render, setRender] = React.useState(0);

    React.useEffect(() => {

        try {
            if (props.data.post.meta) {
                if (typeof props.data.post.meta === 'string') {
                    props.data.post.meta = JSON.parse(props.data.post.meta);
                }
            }
        } catch (error) {
            props.data.post.meta = {};
        }

        if (props.data.post.meta === null || typeof props.data.post.meta !== 'object') {
            props.data.post.meta = {};
        }

        setRender(render + 1);

    }, [props.data.updatePost]);

    //eslint-disable-next-line
    const onReview = (key: any, value: any) => {

        if (!props.data.post.meta) props.data.post.meta = {};

        props.data.post.meta[key] = value;
    }

    if (props.data.post.meta !== null && typeof props.data.post.meta === 'object' && props.data.config?.public_view) {

        return (
            <Grid item md={12} xs={12}>
                <Card>
                    <CardHeader
                        title={<Typography variant="h5" >{__p('Search Engine Optimization', 'vn4seo')}</Typography>}
                    />
                    <Divider />
                    <CardContent>
                        <Tabs name="vn4seo_createdata" orientation='vertical' tabIcon={true} tabs={[
                            {
                                title: <Tooltip title="General"><Icon icon="Search" /></Tooltip>,
                                content: () => <General
                                    data={props.data.post.meta as JsonFormat}
                                    onReview={onReview}
                                />
                            },
                            {
                                title: <Tooltip title="Social"><Icon icon="ShareRounded" /></Tooltip>,
                                content: () => <Social
                                    data={props.data.post.meta as JsonFormat}
                                    onReview={onReview}
                                />
                            },
                            {
                                title: <Tooltip title="Json-LD"><Icon icon="CodeRounded" /></Tooltip>,
                                content: () => <Schema
                                    data={props.data.post.meta}
                                    onReview={onReview}
                                />
                            }
                        ]} />
                    </CardContent>
                </Card>
            </Grid>
        )
    }

    return null;
}

export default CreateData

export interface Vn4seoTabsProps {
    data: JsonFormat,
    onReview: (key: any, value: any) => void //eslint-disable-line
}
