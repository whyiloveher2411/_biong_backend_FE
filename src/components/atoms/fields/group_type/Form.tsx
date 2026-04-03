import { Box, Button, Theme } from "@mui/material";
import Autocomplete from "components/atoms/Autocomplete";
import FormControl from "components/atoms/FormControl";
import FormHelperText from "components/atoms/FormHelperText";
import FormLabel from "components/atoms/FormLabel";
import makeCSS from "components/atoms/makeCSS";
import Table from "components/atoms/Table";
import TableBody from "components/atoms/TableBody";
import TableCell from "components/atoms/TableCell";
import TableContainer from "components/atoms/TableContainer";
import TableRow from "components/atoms/TableRow";
import TextField from "components/atoms/TextField";
import React from "react";
import FieldForm from "../FieldForm";
import SpecialNotes from "../SpecialNotes";
import { FieldFormItemProps } from "../type";

const useStyles = makeCSS((theme: Theme) => ({
    root: {
        width: "100%",
    },
    heading: {
        fontSize: theme.typography.pxToRem(15),
    },
    secondaryHeading: {
        fontSize: theme.typography.pxToRem(15),
        color: theme.palette.text.secondary,
    },
    icon: {
        verticalAlign: "bottom",
        height: 20,
        width: 20,
    },
    dragcontext: {
        marginTop: 8,
    },
    details: {
        alignItems: "center",
    },
    column: {
        flexBasis: "33.33%",
    },
    helper: {
        borderLeft: `2px solid ${theme.palette.divider}`,
        padding: theme.spacing(1, 2),
    },
    link: {
        color: theme.palette.primary.main,
        textDecoration: "none",
        "&:hover": {
            textDecoration: "underline",
        },
    },
    padding0: {
        padding: "8px 0 0 0",
    },
    cell: {
        verticalAlign: "top",
        border: "none",
    },
    stt: {
        fontWeight: 500,
    },
    accordion: {
        "&.Mui-expanded": {
            margin: 0,
        },
        "& $stt": {
            color: "#dedede",
        },
        "&.Mui-disabled $stt": {
            color: "#939393",
        },
    },
    accorDelete: {
        "&>.MuiAccordionSummary-root": {
            background: "#e53935",
        },
        "&>.MuiAccordionSummary-root .MuiTypography-body1": {
            color: "white",
        },
        "&>.MuiAccordionSummary-root .MuiSvgIcon-root": {
            color: "white",
        },
    },
    emptyValue: {
        marginTop: 8,
        padding: 16,
        border: "1px dashed #b4b9be",
        cursor: "pointer",
        borderRadius: 4,
        color: "#555d66",
    },
    templateNote: {
        marginTop: 8,
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #ffcc80",
        background: "#fff8e1",
        color: "#8a4b00",
        fontSize: 13,
        lineHeight: 1.5,
        "& strong": {
            fontWeight: 700,
        },
    },
}));

export default React.memo(
    function GroupForm(props: FieldFormItemProps) {
        const classes = useStyles();

        const { config, post, name, onReview } = props;

        const [, setRender] = React.useState(0);

        let valueInital: JsonFormat = {};

        const keyField = props.config.key_field ? props.config.key_field : 'type';

        try {
            if (typeof post[name] === "object") {
                valueInital = post[name];
            } else {
                if (post[name]) {
                    valueInital = JSON.parse(post[name]);
                }
            }
        } catch (error) {
            valueInital = {};
        }

        const [type, setType] = React.useState(
            valueInital?.[keyField]
                ? valueInital[keyField]
                : Object.keys(config.templates)[0]
        );

        // console.log(valueInital);

        // if (valueInital && !valueInital[0]) {
        //   valueInital[0] = {
        //     open: true,
        //     confirmDelete: false,
        //     delete: 0,
        //   }
        // }

        post[name] = valueInital;

        let configKey = Object.keys(config.templates[type]?.sub_fields ?? {}) ?? [];

        const onTypeChange = (newType: string) => {
            try {
                if (typeof post[name] !== "object") {
                    if (post && post[name]) {
                        post[name] = JSON.parse(post[name]);
                    }
                }
            } catch (error) {
                post[name] = {};
            }
            if (typeof post[name] !== "object" || post[name] === null) {
                post[name] = {};
            }
            post[name] = {
                ...post[name],
                [keyField]: newType,
            };
            setType(newType);
            console.log("onChangeInputGroup", post[name]);
            onReview(post[name]);
            setRender((prev) => prev + 1);
        };

        const onChangeInputRepeater = (value: ANY, key: ANY) => {
            try {
                if (typeof post[name] !== "object") {
                    if (post && post[name]) {
                        post[name] = JSON.parse(post[name]);
                    }
                }
            } catch (error) {
                post[name] = [];
            }

            if (typeof key === "object" && key !== null) {
                post[name] = {
                    ...post[name],
                    ...key,
                };
            } else {
                post[name] = {
                    ...post[name],
                    [key]: value,
                };
            }

            post[name][keyField] = type;

            console.log("onChangeInputGroup", post[name]);
            onReview(post[name]);
            setRender((prev) => prev + 1);
        };

        const templateKeys = Object.keys(config.templates);
        const templateCount = templateKeys.length;
        const useSelect = templateCount > 3;

        // Tạo map để biết mỗi template thuộc group nào
        const templateToGroupMap: { [key: string]: string } = {};
        if (config.group) {
            Object.keys(config.group).forEach((groupKey) => {
                const group = config.group[groupKey];
                if (
                    group &&
                    group.templates &&
                    Array.isArray(group.templates)
                ) {
                    group.templates.forEach((templateKey: string) => {
                        templateToGroupMap[templateKey] =
                            group.title || groupKey;
                    });
                }
            });
        }

        const templateOptions = templateKeys.map((typeStr) => ({
            _key: typeStr,
            title: config.templates[typeStr].title,
            group: templateToGroupMap[typeStr] || "",
        }));

        const currentTemplate =
            templateOptions.find((opt) => opt._key === type) ||
            templateOptions[0];
        const currentTemplateConfig = config.templates[type];

        return (
            <FormControl className={classes.root} component="div">
                <Box
                    sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <FormLabel
                        component="legend"
                        sx={{ fontSize: 20, fontWeight: 500 }}
                    >
                        {config.title}
                    </FormLabel>
                    {useSelect ? (
                        <Autocomplete
                            options={templateOptions}
                            getOptionLabel={(option) => option.title || ""}
                            disableClearable
                            size="small"
                            sx={{ width: "100%" }}
                            groupBy={(option) => option.group || ""}
                            renderInput={(params) => (
                                <TextField {...params} variant="outlined" />
                            )}
                            renderOption={(props, option) => (
                                <li
                                    {...props}
                                    style={{
                                        paddingLeft: option.group
                                            ? "32px"
                                            : "16px",
                                    }}
                                >
                                    {option.title}
                                </li>
                            )}
                            onChange={(_e, value) => {
                                if (value) {
                                    onTypeChange(value._key);
                                }
                            }}
                            value={currentTemplate}
                            isOptionEqualToValue={(option, value) =>
                                option._key === value._key
                            }
                        />
                    ) : (
                        templateKeys.map((typeStr) => (
                            <Button
                                key={typeStr}
                                size="small"
                                sx={{
                                    textTransform: "unset",
                                    fontSize: 16,
                                }}
                                color={type === typeStr ? "primary" : "inherit"}
                                variant={
                                    type === typeStr ? "contained" : "outlined"
                                }
                                onClick={() => {
                                    onTypeChange(typeStr);
                                }}
                            >
                                {config.templates[typeStr].title}
                            </Button>
                        ))
                    )}
                    {Boolean(currentTemplateConfig?.note) && (
                        <Box className={classes.templateNote} sx={{ width: "100%" }}>
                            <strong>Note:</strong>{" "}
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: currentTemplateConfig.note,
                                }}
                            />
                        </Box>
                    )}
                </Box>
                {Boolean(config.note) && (
                    <FormHelperText sx={{ marginTop: 4 }}>
                        <span
                            dangerouslySetInnerHTML={{ __html: config.note }}
                        ></span>
                    </FormHelperText>
                )}
                <SpecialNotes specialNotes={config.special_notes} />
                {Boolean(post[name]) && config.layout === "table" ? (
                    <TableContainer>
                        <Table
                            sx={{
                                backgroundColor: "#fff",
                                border: "1px solid #e0e0e0",
                                borderRadius: 2,
                            }}
                        >
                            <TableBody>
                                <TableRow>
                                    {configKey &&
                                        configKey.map((key) => {
                                            return (
                                                <TableCell
                                                    key={key}
                                                    className={classes.cell}
                                                >
                                                    <FieldForm
                                                        component={
                                                            config.templates[
                                                                type
                                                            ].sub_fields[key]
                                                                .view
                                                                ? config
                                                                    .templates[
                                                                    type
                                                                ].sub_fields[
                                                                    key
                                                                ].view
                                                                : "text"
                                                        }
                                                        config={
                                                            config.templates[
                                                                type
                                                            ].sub_fields[key]
                                                        }
                                                        post={post[name] ?? {}}
                                                        name={key}
                                                        onReview={(
                                                            value,
                                                            key2 = key
                                                        ) =>
                                                            onChangeInputRepeater(
                                                                value,
                                                                key2
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                            );
                                        })}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", border: "1px solid #e0e0e0", borderRadius: 2, backgroundColor: "#a4a4a44a", padding: 2 }}>
                        {configKey &&
                            configKey.map((key) => {
                                return (
                                    <Box key={key}>
                                        <FieldForm
                                            component={
                                                config.templates[type]
                                                    .sub_fields[key].view
                                                    ? config.templates[type]
                                                        .sub_fields[key].view
                                                    : "text"
                                            }
                                            config={
                                                config.templates[type]
                                                    .sub_fields[key]
                                            }
                                            post={post[name] ?? {}}
                                            name={key}
                                            onReview={(value, key2 = key) =>
                                                onChangeInputRepeater(
                                                    value,
                                                    key2
                                                )
                                            }
                                        />
                                    </Box>
                                );
                            })}
                    </Box>
                )}
            </FormControl>
        );
    },
    (props1, props2) => {
        return props1.post[props1.name] === props2.post[props2.name];
    }
);
