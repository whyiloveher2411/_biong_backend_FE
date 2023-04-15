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
import DrawerCustom from 'components/molecules/DrawerCustom'
import FieldForm from 'components/atoms/fields/FieldForm'
import MoreButton from 'components/atoms/MoreButton'
import { ShowPostTypeData } from '.'
import useQuery from 'hook/useQuery'
import { toCamelCase } from 'helpers/string'

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
    data: ShowPostTypeData | false,
    onSearch: (value: string) => void,
    value: undefined | string,
    className?: string,
    onFilter: (filter: Array<{
        key: string,
        condition: '=' | '!=',
        value: string,
    }>) => void,
}

const SearchBar = ({ data, onSearch, onFilter, className = '', value, ...rest }: SearchBarProps) => {

    const classes = useStyles()

    const [openFilter, setOpenFilter] = React.useState(false);

    const [inputValue, setInputValue] = React.useState('');

    const [filters, setFilters] = React.useState<Array<{
        key: string,
        condition: '=' | '!=',
        value: string,
    }>>([]);

    const paramUrl = useQuery({ filters: '' });

    React.useEffect(() => {

        if (paramUrl.filters) {
            const filters = JSON.parse(paramUrl.filters.toString());
            setFilters(filters);
        }

    }, []);

    return (<>
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
                <Button color="inherit" onClick={() => setOpenFilter(true)} variant='outlined'>{__('Filter')}</Button>
            </Grid>
        </Grid>
        <DrawerCustom
            title="Filter"
            open={openFilter}
            activeOnClose
            onClose={() => setOpenFilter(false)}
            restDialogContent={{
                sx: {
                    pt: '24px !important'
                }
            }}
            headerAction={<>
                <Button
                    variant='contained'
                    color='success'
                    onClick={() => {
                        onFilter(filters);
                        setOpenFilter(false);
                    }}
                >Apply Filter</Button>
            </>}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                {
                    data ?
                        filters.map((item, index) => (
                            <Box key={index}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '4fr 0.1fr 4fr',
                                    gap: 1,
                                    alignItems: 'center',
                                }}
                            >
                                <FieldForm
                                    component='select'
                                    config={{
                                        title: 'Key',
                                        list_option: data.config.fields
                                    }}
                                    post={item}
                                    name='key'
                                    onReview={(value) => {
                                        setFilters(prev => {
                                            prev[index].key = value;
                                            return [...prev];
                                        });
                                    }}
                                />
                                <MoreButton
                                    actions={[
                                        {
                                            '=': {
                                                title: '=',
                                                action: () => {
                                                    setFilters(prev => {
                                                        prev[index].condition = '=';
                                                        return [...prev];
                                                    });
                                                },
                                            },
                                            '!=': {
                                                title: '!=',
                                                action: () => {
                                                    setFilters(prev => {
                                                        prev[index].condition = '!=';
                                                        return [...prev];
                                                    });
                                                },
                                            }
                                        }
                                    ]}

                                >
                                    <Button sx={{ fontSize: 20, fontWeight: 600 }}>
                                        {item.condition}
                                    </Button>
                                </MoreButton>

                                {
                                    (() => {
                                        try {
                                            let compoment = toCamelCase(data.config.fields[item.key].view ?? '');
                                            //eslint-disable-next-line
                                            let resolved = require('./FieldFiter/' + compoment).default;
                                            return React.createElement(resolved, {
                                                config: data.config.fields[item.key],
                                                data: item,
                                                onReview: (value: ANY) => {
                                                    setFilters(prev => {
                                                        prev[index] = { ...prev[index], ...value };
                                                        return [...prev];
                                                    });
                                                }
                                            });
                                        } catch (error) {
                                            //
                                        }

                                        return <FieldForm
                                            component={data.config.fields[item.key].view ?? 'text'}
                                            config={data.config.fields[item.key]}
                                            post={item}
                                            name='value'
                                            onReview={(value) => {
                                                setFilters(prev => {
                                                    prev[index].value = value;
                                                    return [...prev];
                                                });
                                            }}
                                        />
                                    })()
                                }
                            </Box>
                        ))
                        : null

                }
            </Box>
            <Box
                sx={{
                    display: 'flex',
                    mt: 2,
                }}
            >
                <Button sx={{ ml: 'auto' }}
                    onClick={() => {
                        setFilters(prev => [...prev, { key: data ? Object.keys(data.config.fields)[0] : '', condition: '=', value: '' }]);
                    }}
                    variant='contained'>Thêm điều kiện</Button>
            </Box>
        </DrawerCustom>
    </>)
}

export default SearchBar
