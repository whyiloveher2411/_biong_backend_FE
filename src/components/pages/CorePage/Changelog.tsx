import Markdown from 'components/atoms/Markdown'
import Typography from 'components/atoms/Typography'
import Page from 'components/templates/Page'
import { __ } from 'helpers/i18n'
import useAjax from 'hook/useApi'
import React, { useEffect, useState } from 'react'

const GettingStarted = () => {

    const [source, setSource] = useState('')

    const useAjax1 = useAjax();

    useEffect(() => {

        useAjax1.ajax({
            url: 'docs/change-log',
            success: (result: { text?: string }) => {
                if (result.text) {
                    setSource(result.text)
                }
            }
        });

    }, []);

    return (
        <Page
            title={__('Changelog')}
            isHeaderSticky
            header={
                <>
                    <Typography gutterBottom variant="overline">
                        {__('Support')}
                    </Typography>
                    <Typography variant="h3">{__('Changelog')}</Typography>
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
