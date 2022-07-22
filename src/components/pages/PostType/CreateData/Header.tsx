import Box from 'components/atoms/Box';
import Fab from 'components/atoms/Fab';
import Grid from 'components/atoms/Grid';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import makeCSS from 'components/atoms/makeCSS';
import LabelPost from 'components/atoms/PostType/LabelPost';
import Tooltip from 'components/atoms/Tooltip';
import Typography from 'components/atoms/Typography';
import Hook from 'components/function/Hook';
import { __ } from 'helpers/i18n';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const useStyles = makeCSS({
    infopage: {
        lineHeight: '20px',
        margin: 0
    },
    backToList: {
        cursor: 'pointer',
    },
    grid: {
        marginBottom: 0
    },
})

interface HeaderProps {
    title: string,
    postType: string,
    data: ANY,
    hiddenAddButton?: boolean,
}

const Header = ({ title, data, postType, hiddenAddButton = false }: HeaderProps) => {

    const classes = useStyles()

    const navigate = useNavigate();

    const handleBackToList = () => {
        navigate('/post-type/' + postType + '/list');
    };

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 3
            }}
            className={classes.grid}
        >
            <Grid item>
                <Typography className={classes.infopage} component="h2" gutterBottom variant="overline">

                    <Tooltip className={classes.backToList} onClick={handleBackToList} title={__('Go Back')} aria-label="go-back"><IconButton color="default" aria-label="Go Back" component="span">
                        <Icon icon="ArrowBackOutlined" />
                    </IconButton></Tooltip>

                    {__('Content')} / <span className={classes.backToList} onClick={handleBackToList}>{data.config?.title}</span> / {title} <LabelPost post={data.post} />
                </Typography>

                <Hook hook="PostType/Action" screen="detail" post={data.post ?? null} />
            </Grid>
            <Grid item style={{ paddingTop: 0 }}>
                {
                    !hiddenAddButton &&
                    <Tooltip title={__('Add new')} aria-label={__('Add new')}><Link to={`/post-type/${postType}/new`}>
                        <Fab size="small" color="primary" aria-label="add">
                            <Icon icon="AddRounded" />
                        </Fab>
                    </Link></Tooltip>
                }
            </Grid>
        </Box>
    )
}

export default Header
