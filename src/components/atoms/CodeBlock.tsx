import React from 'react'
import Prism from 'prismjs';
import "prismjs/themes/prism-okaidia.min.css";
import { Box, BoxProps } from '@mui/material';

const CodeBlock = React.forwardRef(({ html, sx, ...rest }: BoxProps & { html: string }, ref) => {
    React.useEffect(() => {
        Prism.highlightAll();
    }, [html]);

    return (
        <Box
            ref={ref}
            className="codeBlock"
            {...rest}
            sx={[(theme) => ({
                '& *': {
                    userSelect: 'text',
                },
                '& a': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                    '&:hover': {
                        opacity: 0.7,
                        textDecoration: 'underline',
                    }
                },
                '& blockquote': {
                    pl: 2.5,
                    borderLeft: '3px solid',
                    borderColor: 'dividerDark',
                    margin: '0.75rem 0px 0px',
                },
                '& code': {
                    fontFamily: 'Hack-ZeroSlash,monospace',
                    overflowWrap: 'anywhere',
                    padding: '0 4px',
                    ...(theme.palette.mode === 'light' ? {
                        backgroundColor: 'rgba(9,30,66,0.22)',
                        color: '#172b4d',
                        '--color': '#172b4d',
                    } : {
                        backgroundColor: '#3b3b4f',
                        color: '#dfdfe2',
                        '--color': '#dfdfe2',
                    }),
                },
                '& pre code': {
                    padding: '0',
                    whiteSpace: 'break-spaces',
                },
                '& img': {
                    borderRadius: '3px',
                    // backgroundColor: '#ebecf0',
                    boxShadow: 'rgb(9 30 66 / 20%) 0px 1px 1px, rgb(9 30 66 / 24%) 0px 0px 1px 0px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    maxWidth: '100%',
                    height: 'auto',
                },
                '& figcaption': {
                    marginTop: '-22px',
                    textAlign: 'center',
                    opacity: 0.8,
                    fontSize: 16,
                    fontStyle: 'italic',
                },
            }),
            (theme) => ({
                ...(typeof sx === 'function' ? sx(theme) : sx ?? {}),
            })
            ]}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
})

export default CodeBlock