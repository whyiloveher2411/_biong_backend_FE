import Typography from 'components/atoms/Typography'
import React, { useEffect, useState } from 'react'
import { __ } from 'helpers/i18n'
import Markdown from 'components/atoms/Markdown'
import useAjax from 'hook/useApi'
import Page from 'components/templates/Page'

const GettingStarted = () => {

    const [source, setSource] = useState('')

    const useAjax1 = useAjax();

    useEffect(() => {

        useAjax1.ajax({
            url: 'docs/getting-started',
            success: (result: { text?: string }) => {
                if (result.text) {
                    setSource(result.text)
                }
            }
        });

    }, []);

    return (
        <Page
            title={__('Getting Started')}
            isHeaderSticky
            header={
                <>
                    <Typography gutterBottom variant="overline">
                        {__('Development')}
                    </Typography>
                    <Typography variant="h3">{__('Getting Started')}</Typography>
                </>
            }
        >
            {source && (
                <Markdown components={{ a: LinkRenderer }} skipHtml={true} escapeHtml={false}>
                    {source}
                </Markdown>
            )}
            {useAjax1.Loading}
        </Page>
    )
}

function LinkRenderer(props: ANY) {
    return (
        <a href={props.href} target="_blank" rel="noreferrer">
            {props.children}
        </a>
    );
}

export default GettingStarted
