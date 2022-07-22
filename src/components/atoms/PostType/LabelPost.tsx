import { default as LabelTab } from 'components/atoms/Label'
import makeCSS from 'components/atoms/makeCSS'
import { __ } from 'helpers/i18n'
import React from 'react'


const useStyles = makeCSS(() => ({
    root: {
        marginLeft: 4,
        borderRadius: 20,
    },
}))

function LabelPost({ post }: {
    post: JsonFormat
}) {

    const classes = useStyles()

    const showMoreInformation = (post: JsonFormat) => {

        if (!post) return [];

        let result = [];

        if (post.visibility === 'private') {
            result.push({ title: __('Private'), color: '#8604c4' });
        }

        if (post.password && post.visibility === 'password') {
            result.push({ title: __('Password protected'), color: '#3f51b5' });
        }

        if (post.post_date_gmt && post.post_date_gmt !== '0000-00-00 00:00:00') {
            result.push({ title: __('Schedule'), color: '#0079be' });
        }

        switch (post.status) {
            case 'publish':
                result.push({ title: __('Publish'), color: '#43a047' });
                break;
            case 'draft':
                result.push({ title: __('Draft'), color: '#757575' });
                break;
            case 'trash':
                result.push({ title: __('Trash'), color: '#e53935' });
                break;
            case 'pending':
                result.push({ title: __('Pending'), color: '#f68924' });
                break;
        }

        return result;
    }

    return <>
        {
            showMoreInformation(post).map((info, index) => (
                <LabelTab color={info.color} className={classes.root} key={index}>{info.title}</LabelTab>
            ))
        }
    </>
}

export default LabelPost
