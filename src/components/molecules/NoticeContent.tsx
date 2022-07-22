import { Theme, useMediaQuery } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { useTheme } from '@mui/system';
import Button from 'components/atoms/Button';
import Typography from 'components/atoms/Typography';
import { __ } from 'helpers/i18n';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';


const useStyles = makeStyles((theme: Theme) => ({
    imageContainer: {
        marginTop: theme.spacing(6),
        display: 'flex',
        justifyContent: 'center'
    },
    image: {
        maxWidth: '100%',
        width: 560,
        maxHeight: 300,
        height: 'auto'
    },
    buttonContainer: {
        marginTop: theme.spacing(6),
        display: 'flex',
        justifyContent: 'center'
    }
}));

interface NoticeContentProps {
    title: string,
    description: string,
    image: string,
    buttonLabel?: string,
    buttonLink?: string,
    disableButtonHome?: boolean
}

const NoticeContent = ({ title, description, image, buttonLabel = __('Back to home'), buttonLink = '/', disableButtonHome = false }: NoticeContentProps) => {

    const classes = useStyles();
    const theme = useTheme();
    const mobileDevice = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <React.Fragment>
            <Typography
                align="center"
                variant={mobileDevice ? 'h4' : 'h1'}
            >
                {title}
            </Typography>
            <Typography
                align="center"
                variant="subtitle2"
                sx={{
                    maxWidth: 700,
                    m: '0 auto',
                    mt: 1,
                }}
                dangerouslySetInnerHTML={{ __html: description }}
            />
            <div className={classes.imageContainer}>
                <img
                    alt="Under development"
                    className={classes.image}
                    src={image}
                />
            </div>
            {
                !disableButtonHome &&
                <div className={classes.buttonContainer}>
                    <Button
                        color="primary"
                        component={RouterLink}
                        to={buttonLink}
                        variant="outlined"
                    >
                        {buttonLabel}
                    </Button>
                </div>
            }

        </React.Fragment>
    );
};

export default NoticeContent;
