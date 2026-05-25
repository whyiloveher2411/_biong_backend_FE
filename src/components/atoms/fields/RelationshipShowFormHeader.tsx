import React from 'react';
import { InputAdornment, Stack, TextField } from '@mui/material';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchIcon from '@mui/icons-material/Search';
import Box from 'components/atoms/Box';
import Button from 'components/atoms/Button';
import FormHelperText from 'components/atoms/FormHelperText';
import IconButton from 'components/atoms/IconButton';
import Typography from 'components/atoms/Typography';
import useDebounce from 'hook/useDebounce';
import { __ } from 'helpers/i18n';
import { Link } from 'react-router-dom';

type SearchProps = {
    queryUrl: { search?: string; [key: string]: ANY };
    setQueryUrl: React.Dispatch<React.SetStateAction<ANY>>;
};

function RelationshipShowFormSearch({ queryUrl, setQueryUrl }: SearchProps) {
    const [search, setSearch] = React.useState(String(queryUrl.search || ''));
    const debouncedSearch = useDebounce(search, 500);

    React.useEffect(() => {
        setSearch(String(queryUrl.search || ''));
    }, [queryUrl.search]);

    React.useEffect(() => {
        if (debouncedSearch !== (queryUrl.search || '')) {
            setQueryUrl((prev: ANY) => ({ ...prev, search: debouncedSearch }));
        }
    }, [debouncedSearch, queryUrl.search, setQueryUrl]);

    return (
        <TextField
            size="small"
            placeholder={__('Search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
                minWidth: { xs: '100%', sm: 200 },
                maxWidth: { sm: 280 },
                '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    bgcolor: 'background.default',
                },
            }}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                ),
            }}
        />
    );
}

export type RelationshipShowFormHeaderProps = {
    title: string;
    listPostTypeLink: string;
    note?: string;
    onAdd: () => void;
    queryUrl: { search?: string; [key: string]: ANY };
    setQueryUrl: React.Dispatch<React.SetStateAction<ANY>>;
    toolbarStart?: React.ReactNode;
    toolbarEnd?: React.ReactNode;
    showSearch?: boolean;
    /** Nằm trong PostTypeTablePanel — không vẽ card riêng. */
    embedded?: boolean;
};

export default function RelationshipShowFormHeader({
    title,
    listPostTypeLink,
    note,
    onAdd,
    queryUrl,
    setQueryUrl,
    toolbarStart,
    toolbarEnd,
    showSearch = true,
    embedded = false,
}: RelationshipShowFormHeaderProps) {
    return (
        <Box
            sx={
                embedded
                    ? undefined
                    : {
                          mb: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                      }
            }
        >
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
                sx={{ px: 2, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
                    {title}
                </Typography>
                <Button
                    component={Link}
                    to={listPostTypeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="text"
                    color="primary"
                    size="small"
                    startIcon={<OpenInNewOutlinedIcon fontSize="small" />}
                    sx={{ textTransform: 'none', alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}
                >
                    {__('Open full list')}
                </Button>
            </Stack>

            <Stack
                direction={{ xs: 'column', md: 'row' }}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                spacing={1.5}
                sx={{ px: 2, py: 1.5 }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ gap: 1, flex: 1, minWidth: 0 }}
                >
                    {toolbarStart}
                </Stack>

                <Stack
                    direction="row"
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ gap: 1, flexShrink: 0 }}
                >
                    {toolbarEnd}
                    {showSearch ? (
                        <RelationshipShowFormSearch queryUrl={queryUrl} setQueryUrl={setQueryUrl} />
                    ) : null}
                    <IconButton
                        onClick={onAdd}
                        color="primary"
                        aria-label={__('Add')}
                        sx={{
                            border: '1px solid',
                            borderColor: 'primary.main',
                            borderRadius: 1.5,
                            width: 36,
                            height: 36,
                        }}
                    >
                        <AddRoundedIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Stack>

            {note ? (
                <Box sx={{ px: 2, pb: 1.25 }}>
                    <FormHelperText>
                        <span dangerouslySetInnerHTML={{ __html: note }} />
                    </FormHelperText>
                </Box>
            ) : null}
        </Box>
    );
}
