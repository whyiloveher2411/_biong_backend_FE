import React, { useEffect } from 'react'
import Prism from 'prismjs'
import ReactMarkdown from 'react-markdown'
import { makeStyles } from '@mui/styles'
import { Theme } from '@mui/material'
import { addClasses } from 'helpers/dom'
import "prismjs/themes/prism-tomorrow.css";

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        '& h1': {
            ...theme.typography.h1,
            marginBottom: theme.spacing(1),
        },
        '& h2': {
            ...theme.typography.h2,
            marginBottom: theme.spacing(1),
        },
        '& h3': {
            ...theme.typography.h3,
            marginBottom: theme.spacing(1),
        },
        '& h4': {
            ...theme.typography.h4,
            marginBottom: theme.spacing(1),
        },
        '& h5': {
            ...theme.typography.h5,
            marginBottom: theme.spacing(1),
        },
        '& h6': {
            ...theme.typography.h6,
            marginBottom: theme.spacing(1),
        },
        '& p': {
            ...theme.typography.subtitle1,
            marginBottom: theme.spacing(2),
        },
        '& ul': {
            marginLeft: theme.spacing(3),
            marginBottom: theme.spacing(2),
        },
        '& ol': {
            marginLeft: theme.spacing(3),
            marginBottom: theme.spacing(2),
        },
        '& li': {
            ...theme.typography.subtitle1,
            marginBottom: theme.spacing(1),
        },
        '& hr': {
            marginTop: theme.spacing(3),
            marginBottom: theme.spacing(3),
            backgroundColor: theme.palette.divider,
            border: 0,
            height: 1,
        },
        '& a': {
            color: theme.palette.link,
            '&:hover': {
                textDecoration: 'underline',
            },
        },
    },
}))

const Markdown = ({ className = '', ...rest }: { [key: string]: ANY, className?: string, children: string }) => {

    const classes = useStyles()

    useEffect(() => {
        setTimeout(() => Prism.highlightAll(), 0)
    }, [])

    return (
        <div className={addClasses({ [classes.root]: true, [className]: true })}>
            <ReactMarkdown {...rest} />
        </div >
    )
}

export default Markdown
