import { Theme } from '@mui/material';
import { withStyles } from '@mui/styles';
import Box from 'components/atoms/Box';
import LoadingButton from 'components/atoms/LoadingButton';
import Checkbox from 'components/atoms/Checkbox';
import FieldForm from 'components/atoms/fields/FieldForm';
import FormControlLabel from 'components/atoms/FormControlLabel';
import Icon from 'components/atoms/Icon';
import IconButton from 'components/atoms/IconButton';
import InputAdornment from 'components/atoms/InputAdornment';
import Page from 'components/templates/Page';
import makeCSS from 'components/atoms/makeCSS';
import Paper from 'components/atoms/Paper';
import Table from 'components/atoms/Table';
import TableBody from 'components/atoms/TableBody';
import TableCell from 'components/atoms/TableCell';
import TableContainer from 'components/atoms/TableContainer';
import TableHead from 'components/atoms/TableHead';
import TablePagination from 'components/atoms/TablePagination';
import TableRow from 'components/atoms/TableRow';
import Typography from 'components/atoms/Typography';
import RedirectWithMessage from 'components/function/RedirectWithMessage';
import NotFound from 'components/molecules/NotFound';
import { addClasses } from 'helpers/dom';
import { getLanguage, getLanguages, __ } from 'helpers/i18n';
import { fade } from 'helpers/mui4/color';
import useAjax from 'hook/useApi';
import useDraggableScroll from 'hook/useDraggableScroll';
import { usePermission } from 'hook/usePermission';
import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
// import useDraggableScroll from 'utils/useDraggableScroll';

const StickyTableCell = withStyles((theme: Theme) => ({
    head: {
        left: 0,
        position: "sticky",
        zIndex: 3,
    },
    body: {
        backgroundColor: theme.palette.background.paper,
        minWidth: "50px",
        left: 0,
        position: "sticky",
        zIndex: 1,
        borderRight: '1px solid ' + theme.palette.divider,
    }
}))(TableCell);

const useStyles = makeCSS((theme: Theme) => ({
    container: {
        maxHeight: 650,
    },
    tdCell: {
        width: 400,
    },
    editCell: {
        borderLeft: '1px solid transparent',
        borderRight: '1px solid transparent',
        borderTop: '1px solid transparent',
        padding: 8,
        cursor: 'pointer',
        position: 'relative',
        '&:hover': {
            border: '1px solid ' + fade(theme.palette.text.primary, 0.3)
        },
        '& .MuiInputBase-root': {
            padding: '6px 0 6px 14px',
        },
        '&:hover $editButton': {
            display: 'block',
        },
    },
    hasChange: {
        backgroundColor: fade(theme.palette.success.main, 0.12)
    },
    boxLoading: {
        zIndex: 1,
        backgroundColor: fade(theme.palette.text.primary, 0.1)
    },
    noContentTrans: {
        borderColor: fade(theme.palette.secondary.main, 0.3)
    },
    editButton: {
        display: 'none',
        position: 'absolute',
        right: 0,
        top: 'calc(50% - 15px)'
    },
    textPlainValue: {
        paddingRight: 20,
    }
}));

const languages = getLanguages();
const languageCurrent = getLanguage();

function Localization() {

    const permission = usePermission('localization_management').localization_management;

    const { tab } = useParams();
    const navigate = useNavigate();

    const classes = useStyles();
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const [listLanguageWithTrans, setListLanguageWithTrans] = React.useState<{
        [key: string]: {
            [key: string]: TransItem;
        };
    }>({});

    const [untranslated, setUntranslated] = React.useState<string | false>(false);

    const [percentCompleted, setPercentCompleted] = React.useState<{
        [key: string]: string
    }>({});

    const [keysChange, setKeysChange] = React.useState({});

    const [group, setGroup] = React.useState<GroupProps>({
        options: {},
        selected: 'core'
    });

    const [keys, setKeys] = React.useState<string[]>([]);

    const refScroll = React.useRef(null);

    const { onMouseDown } = useDraggableScroll(refScroll)

    const useApi = useAjax({ loadingType: 'custom' });

    const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const addRows = (trans: {
        [key: string]: {
            [key: string]: string | null;
        };
    }) => {

        if (trans && typeof trans === 'object' && !Array.isArray(trans)) {

            let keysTrans = Object.keys(trans[languageCurrent.code]),
                result: {
                    [key: string]: {
                        [key: string]: TransItem
                    }
                } = {},
                percentCompleted: { [key: string]: string } = {};

            languages.forEach(lang => {

                let countTranslated = 0;

                let dataForLang: {
                    [key: string]: TransItem
                } = {};

                keysTrans.forEach(key => {
                    dataForLang[key] = {
                        isEdit: false,
                        valueAfterEdit: trans[lang.code][key],
                        value: trans[lang.code][key],
                        valueOld: trans[lang.code][key],
                    };

                    if (trans[lang.code][key]) {
                        countTranslated++;
                    }
                });

                percentCompleted[lang.code] = countTranslated + ' - ' + Number(countTranslated * 100 / keysTrans.length).toFixed(1) + '%';
                result[lang.code] = dataForLang;
            });

            setPercentCompleted(() => percentCompleted);

            setListLanguageWithTrans(result);

            setKeysChange({});

            setKeys(keysTrans);

        } else {
            setPercentCompleted({});

            setListLanguageWithTrans({});
        }
    }

    const handleClickEditTrans = (langCode: string, key: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        setListLanguageWithTrans((prev) => {
            prev[langCode][key].isEdit = true;
            return { ...prev };
        });
    }

    const handleClickCancelEditTrans = (langCode: string, key: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        setListLanguageWithTrans((prev) => {
            prev[langCode][key].isEdit = false;
            prev[langCode][key].valueAfterEdit = prev[langCode][key].value;
            return { ...prev };
        });
    }

    const handleClickSaveEditTrans = (langCode: string, key: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setListLanguageWithTrans((prev) => {
            prev[langCode][key].isEdit = false;
            prev[langCode][key].value = prev[langCode][key].valueAfterEdit;

            setKeysChangeAfterSave(prev);

            return { ...prev };
        });
    }

    const handleChangeTrans = (langCode: string, key: string) => (value: string) => {
        setListLanguageWithTrans((prev) => {
            prev[langCode][key].valueAfterEdit = value;
            return { ...prev };
        });
    }

    const checkTransHasBeenChanged = (langCode: string, key: string) => {
        return listLanguageWithTrans[langCode][key].value !== listLanguageWithTrans[langCode][key].valueOld
            && !(listLanguageWithTrans[langCode][key].value === '' && !listLanguageWithTrans[langCode][key].valueOld);
    }

    const setKeysChangeAfterSave = (trans: {
        [key: string]: {
            [key: string]: TransItem
        };
    }) => {

        let result: {
            [key: string]: {
                [key: string]: string | null
            }
        } = {};

        languages.forEach(lang => {

            keys.forEach(key => {
                if (trans[lang.code][key].value && trans[lang.code][key].valueOld !== trans[lang.code][key].value) {
                    if (!result[key]) {
                        result[key] = {};
                    }
                    result[key][lang.code] = trans[lang.code][key].value;
                }
            });

        });
        setKeysChange(result);
    }

    const handleSubmitTrans = () => {

        useApi.ajax({
            url: 'localization/save-changes',
            data: {
                data: keysChange,
                languages: languages,
                group: tab,
            },
            success: (result) => {
                if (result.trans) {
                    addRows(result.trans);
                    setKeysChange({});
                }
            }
        });

    }

    React.useEffect(() => {

        setKeys([]);
        setKeysChange({});
        setPage(0);

        if (permission && tab) {
            useApi.ajax({
                url: 'localization/get-trans-text',
                data: {
                    group: tab
                },
                success: (result: LocalizationDataProps) => {
                    if (result.trans) {
                        addRows(result.trans);
                    }

                    if (result.group) {
                        setGroup(result.group);
                    }
                }
            });
        }
    }, [tab]);

    if (!tab) {
        return <Navigate to={'/localization/core'} />;
    }

    if (group && group.options.core && !group.options[tab]) {
        return <Navigate to={'/localization/' + Object.keys(group.options)[0]} />;
    }

    if (!permission) {
        return <RedirectWithMessage />
    }

    let dataAfterFilterPage = keys.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    if (untranslated !== false) {
        dataAfterFilterPage = keys.filter(item => !listLanguageWithTrans[untranslated][item].valueOld).slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }

    return (
        <Page
            title={__('Localization')}
            isHeaderSticky
            header={
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <div>
                        <Typography component="h2" gutterBottom variant="overline">{__('Settings')}</Typography>
                        <Typography component="h1" variant="h3">
                            {__('Localization')}
                        </Typography>
                    </div>
                    <LoadingButton
                        color="success"
                        variant="contained"
                        loading={useApi.open}
                        disabled={Object.keys(keysChange).length === 0}
                        onClick={handleSubmitTrans}
                    >
                        {__('Save Changes')}
                    </LoadingButton>
                </Box>
            }
        >
            <FieldForm
                component="select"
                config={{
                    title: __('Group'),
                    list_option: group?.options ?? {},
                    inputProps: {
                        groupBy: (option: GroupItemProps) => option.group
                    }
                }}
                post={{ group: group?.selected }}
                name="group"
                onReview={(value) => navigate('/localization/' + value)}

            />
            <div style={{ position: 'relative', marginTop: 16 }}>
                <TableContainer component={Paper} className={classes.container + ' custom_scroll'} ref={refScroll} onMouseDown={onMouseDown}>
                    <Table stickyHeader aria-label="sticky table">
                        <TableHead>
                            <TableRow>
                                <StickyTableCell>
                                    <div className={classes.tdCell}>
                                        {__('Key')}
                                    </div>
                                </StickyTableCell>
                                {
                                    keys.length > 0 &&
                                    languages.map(lang => (
                                        <TableCell key={lang.code}>
                                            <Box
                                                className={classes.tdCell}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gridGap: 12
                                                }}

                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: "center",
                                                        gridGap: 12
                                                    }}
                                                >
                                                    <img
                                                        loading="lazy"
                                                        width="20"
                                                        src={`https://flagcdn.com/w20/${lang.flag.toLowerCase()}.png`}
                                                        srcSet={`https://flagcdn.com/w40/${lang.flag.toLowerCase()}.png 2x`}
                                                        alt=""
                                                    />
                                                    {lang.label} ({percentCompleted[lang.code]})
                                                </Box>
                                                <FormControlLabel
                                                    control={<Checkbox
                                                        onClick={() => {
                                                            if (untranslated === lang.code) {
                                                                setUntranslated(false);
                                                            } else {
                                                                setUntranslated(lang.code);
                                                            }
                                                        }}
                                                        name={lang.code}
                                                        checked={untranslated === lang.code}
                                                        color="primary"
                                                    />}
                                                    labelPlacement="start"
                                                    label={__('Un-translated')}
                                                />
                                            </Box>
                                        </TableCell>
                                    ))
                                }
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                dataAfterFilterPage.length > 0 ?
                                    dataAfterFilterPage.map((key, index) => {
                                        return (
                                            <TableRow tabIndex={-1} key={index}>
                                                <StickyTableCell>
                                                    <div className={classes.tdCell}>
                                                        {key}
                                                    </div>
                                                </StickyTableCell>
                                                {
                                                    languages.map(lang => (
                                                        <TableCell key={lang.code} className={addClasses({
                                                            [classes.editCell]: true,
                                                            [classes.hasChange]:
                                                                listLanguageWithTrans[lang.code]
                                                                && checkTransHasBeenChanged(lang.code, key)
                                                                && !listLanguageWithTrans[lang.code][key].isEdit,
                                                            [classes.noContentTrans]: !listLanguageWithTrans[lang.code][key].value
                                                        })} >

                                                            <div className={classes.tdCell}>
                                                                {
                                                                    listLanguageWithTrans[lang.code][key].isEdit ?
                                                                        <FieldForm
                                                                            component="textarea"
                                                                            config={{
                                                                                title: '',
                                                                                size: 'small',
                                                                                inputProps: {
                                                                                    endAdornment: <InputAdornment position="end" >
                                                                                        <IconButton
                                                                                            aria-label="save"
                                                                                            color="primary"
                                                                                            onClick={handleClickSaveEditTrans(lang.code, key)}
                                                                                        >
                                                                                            <Icon icon="SaveOutlined" />
                                                                                        </IconButton>
                                                                                        <IconButton
                                                                                            aria-label="cancel"
                                                                                            color="inherit"
                                                                                            onClick={handleClickCancelEditTrans(lang.code, key)}
                                                                                        >
                                                                                            <Icon icon="ClearRounded" />
                                                                                        </IconButton>
                                                                                    </InputAdornment>
                                                                                }
                                                                            }}
                                                                            post={{ key: listLanguageWithTrans[lang.code][key].valueAfterEdit }}
                                                                            name="key"
                                                                            onReview={handleChangeTrans(lang.code, key)}
                                                                        />
                                                                        :
                                                                        <div className={classes.textPlainValue}>
                                                                            {listLanguageWithTrans[lang.code][key].value}
                                                                            <IconButton
                                                                                aria-label="cancel"
                                                                                className={classes.editButton}
                                                                                onClick={handleClickEditTrans(lang.code, key)}
                                                                                size='small'
                                                                            >
                                                                                <Icon icon="EditOutlined" />
                                                                            </IconButton>
                                                                        </div>
                                                                }
                                                            </div>
                                                        </TableCell>
                                                    ))}
                                            </TableRow>
                                        );
                                    })
                                    :
                                    <TableRow>
                                        <TableCell colSpan={100} style={{ height: 450 }}>
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    top: 80,
                                                    pointerEvents: 'none'
                                                }}>
                                                <NotFound
                                                    subTitle=""
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                            }
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 100, 200, 500]}
                    count={keys.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
                {
                    useApi.open &&
                    <Box className={classes.boxLoading}
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: 1,
                            position: "absolute",
                            top: 0,
                            bottom: 0
                        }}
                    >
                        {useApi.Loading}
                    </Box>
                }
            </div>

        </Page >
    )
}

export default Localization

interface GroupItemProps {
    title: string,
    group: string,
    path: string,
}

interface GroupProps {
    options: {
        [key: string]: GroupItemProps
    },
    selected: string,
}

interface LocalizationDataProps {
    group: GroupProps,
    trans: {
        [key: string]: {
            [key: string]: string | null
        }
    }
}

interface TransItem {
    isEdit: boolean;
    valueAfterEdit: string | null;
    value: string | null;
    valueOld: string | null;
}