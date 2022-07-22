import Grid from 'components/atoms/Grid'
import makeCSS from 'components/atoms/makeCSS'
import Box from 'components/atoms/Box'
import Icon from 'components/atoms/Icon'
import Input from 'components/atoms/Input'
import Paper from 'components/atoms/Paper'
import Button from 'components/atoms/Button'
import React from 'react'
import { Theme } from '@mui/material'
import { __ } from 'helpers/i18n'

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    searchInput: {
        flexGrow: 1,
        fontSize: 14,
        height: 36,
        maxWidth: '100%',
        width: 160,
        "& input::placeholder": {
            opacity: .6,
            color: "inherit",
        },
    },
    searchIcon: {
        color: theme.palette.icon,
    },
    search: {
        flexGrow: 1,
        height: 42,
        gap: theme.spacing(2),
        padding: theme.spacing(0, 2),
        display: 'flex',
        borderRadius: theme.spacing(1),
        alignItems: 'center',
    },
}))

interface SearchBarProps {
    onSearch: (value: string) => void,
    value: undefined | string,
    className?: string,
}

const SearchBar = ({ onSearch, className = '', value, ...rest }: SearchBarProps) => {

    const classes = useStyles()

    const [inputValue, setInputValue] = React.useState('');

    return (
        <Grid
            {...rest}
            className={classes.root + ' ' + className}
            container
            spacing={3}>
            <Grid item>
                <Box sx={{
                    display: 'flex',
                    gap: 2
                }}>
                    <Paper className={classes.search} elevation={2}>
                        <Icon icon="Search" className={classes.searchIcon} />
                        <Input
                            className={classes.searchInput}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
                                setInputValue(e.target.value);
                            }}
                            onKeyPress={e => {
                                if (e.key === 'Enter') {
                                    onSearch(inputValue);
                                }
                            }}
                            disableUnderline
                            placeholder={__('Enter something...')}
                            value={inputValue}
                        />
                    </Paper>
                    <Button
                        onClick={() => {
                            onSearch(inputValue);
                        }}
                        color="inherit"
                        size="large"
                        variant="contained">
                        {__('Search')}
                    </Button>
                </Box>
            </Grid>
            <Grid item>

            </Grid>
        </Grid>
    )
}

export default SearchBar
