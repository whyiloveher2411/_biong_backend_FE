import Box from 'components/atoms/Box';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import React from 'react';
import { useNavigate } from 'react-router-dom';

function Header({ back }: {
    back?: string
}) {

    const navigate = useNavigate();

    return (
        <>
            <Typography component="h2" gutterBottom variant="overline">
                {__('Appearance')}
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gridGap: 8
                }}
            >
                {
                    back &&
                    <Tooltip onClick={() => { navigate(back) }} title={__('Go Back')} aria-label="go-back">
                        <IconButton color="default" aria-label={__('Go Back')} component="span">
                            <Icon icon="ArrowBackOutlined" />
                        </IconButton>
                    </Tooltip>
                }
                <Typography component="h1" variant="h3">
                    {__('Menu')}
                </Typography>
            </Box>
        </>
    )
}

export default Header
