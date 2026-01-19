import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import Box from "components/atoms/Box";
import Typography from "components/atoms/Typography";
import React from "react";
import useAjax from "hook/useApi";
import TableCell from "components/atoms/TableCell";
import TableContainer from "components/atoms/TableContainer";
import TableRow from "components/atoms/TableRow";
import Paper from "components/atoms/Paper";
import TextField from "components/atoms/TextField";
import LoadingButton from "components/atoms/LoadingButton";
import CircularProgress from "components/atoms/CircularProgress";
import makeCSS from "components/atoms/makeCSS";
import { Theme } from "@mui/material/styles";
import {
    Grid,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    Checkbox,
    FormControlLabel,
    Button,
    IconButton,
    Tooltip,
    InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { TableVirtuoso } from "react-virtuoso";
import Language from "./Language";
import useConfirmDialog from "hook/useConfirmDialog";
import { useSearchParams } from "react-router-dom";

interface Language {
    code: string;
    name: string;
    flag_code: string;
    icon_url?: string;
}

interface LocalizeData {
    version: string;
    generated_at: string;
    groups: {
        [namespace: string]: {
            [key: string]: string;
        };
    };
}

interface ApiResponse {
    success: boolean;
    data: {
        languages: Language[];
        localize: LocalizeData;
        translations: {
            [langCode: string]: {
                [key: string]: string;
            };
        };
    };
}

interface TranslationItem {
    key: string;
    default: string;
    translations: {
        [langCode: string]: string;
    };
    originalTranslations: {
        [langCode: string]: string;
    };
}

const useStyles = makeCSS((theme: Theme) => ({
    container: {
        maxHeight: 650,
    },
    stickyCell: {
        position: "sticky",
        left: 0,
        backgroundColor: theme.palette.background.paper,
        zIndex: 2,
        borderRight: `1px solid ${theme.palette.divider}`,
        minWidth: 200,
    },
    headerCell: {
        position: "sticky",
        left: 0,
        zIndex: 3,
        backgroundColor: theme.palette.background.paper,
        borderRight: `1px solid ${theme.palette.divider}`,
        minWidth: 200,
    },
    editCell: {
        padding: "8px !important",
        minWidth: 250,
    },
    flagIcon: {
        width: 20,
        height: 15,
        marginRight: 8,
        objectFit: "cover",
    },
    namespaceHeader: {
        backgroundColor: theme.palette.grey[100],
        fontWeight: "bold",
    },
}));

// Global storage cho editing values
declare global {
    interface Window {
        __editingValues__?: {
            [key: string]: { [langCode: string]: string };
        };
    }
}

// Component riêng để tránh re-render không cần thiết
const EditableTextField = React.memo(
    ({
        value,
        placeholder,
        isChanged,
        shouldHighlight,
        onChange,
        onBlur,
        inputKey,
        itemKey,
        langCode,
        onScrollSync,
    }: {
        value: string;
        placeholder: string;
        isChanged: boolean;
        shouldHighlight: boolean;
        onChange: (value: string) => void;
        onBlur?: () => void;
        inputKey: string;
        itemKey: string;
        langCode: string;
        onScrollSync?: (itemKey: string, langCode: string, value: string) => void;
    }) => {
        const inputRef = React.useRef<HTMLInputElement>(null);
        const defaultValueRef = React.useRef(value);
        const isInitialMount = React.useRef(true);
        const lastValueRef = React.useRef(value);

        // Restore giá trị từ editingValuesRef khi mount (nếu có)
        React.useLayoutEffect(() => {
            if (inputRef.current) {
                // Kiểm tra xem có giá trị đang edit không (từ ref global)
                const editingValue = window.__editingValues__?.[itemKey]?.[langCode];
                if (editingValue !== undefined && editingValue !== value) {
                    defaultValueRef.current = editingValue;
                    lastValueRef.current = editingValue;
                    inputRef.current.value = editingValue;
                } else {
                    defaultValueRef.current = value;
                    lastValueRef.current = value;
                }
            }
        }, [itemKey, langCode]); // Bỏ value và onScrollSync khỏi dependencies để tránh vòng lặp

        // Chỉ update defaultValue khi value thay đổi và không phải lần mount đầu
        React.useEffect(() => {
            if (!isInitialMount.current) {
                // Chỉ update nếu input không đang focus
                if (document.activeElement !== inputRef.current) {
                    defaultValueRef.current = value;
                    lastValueRef.current = value;
                    if (inputRef.current) {
                        inputRef.current.value = value;
                    }
                }
            } else {
                isInitialMount.current = false;
                lastValueRef.current = value;
            }
        }, [value]);

        // Sync giá trị khi scroll (nếu input đang focus)
        React.useLayoutEffect(() => {
            const handleScroll = () => {
                if (inputRef.current && document.activeElement === inputRef.current) {
                    const currentValue = inputRef.current.value;
                    // Sync ngay khi scroll để tránh mất data
                    if (onScrollSync) {
                        onScrollSync(itemKey, langCode, currentValue);
                    }
                }
            };

            // Thêm event listener cho scroll trên window và container
            const container = inputRef.current?.closest('.MuiTableContainer-root') ||
                inputRef.current?.closest('[class*="TableContainer"]') ||
                inputRef.current?.closest('[class*="virtuoso"]') ||
                document.querySelector('[data-testid="virtuoso-scroller"]');

            if (container) {
                container.addEventListener('scroll', handleScroll, { passive: true });
                // Cũng listen trên window để catch mọi scroll event
                window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
                // Listen trên wheel event để catch scroll bằng mouse wheel
                container.addEventListener('wheel', handleScroll, { passive: true });
                return () => {
                    container.removeEventListener('scroll', handleScroll);
                    container.removeEventListener('wheel', handleScroll);
                    window.removeEventListener('scroll', handleScroll, { capture: true });
                };
            }
        }, [itemKey, langCode, onScrollSync]);

        // Sync giá trị trước khi unmount (cleanup) - sử dụng useLayoutEffect để chạy đồng bộ
        React.useLayoutEffect(() => {
            return () => {
                // Khi component unmount, sync giá trị cuối cùng
                if (inputRef.current) {
                    const currentValue = inputRef.current.value;
                    // Chỉ sync nếu giá trị khác với giá trị ban đầu
                    if (currentValue !== defaultValueRef.current) {
                        // Lưu vào global storage (không gọi onScrollSync để tránh trigger re-render)
                        if (!window.__editingValues__) {
                            window.__editingValues__ = {};
                        }
                        if (!window.__editingValues__[itemKey]) {
                            window.__editingValues__[itemKey] = {};
                        }
                        window.__editingValues__[itemKey][langCode] = currentValue;
                    }
                }
            };
        }, [itemKey, langCode]); // Bỏ onScrollSync khỏi dependencies để tránh vòng lặp

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            lastValueRef.current = newValue;

            // Lưu vào global storage ngay
            if (!window.__editingValues__) {
                window.__editingValues__ = {};
            }
            if (!window.__editingValues__[itemKey]) {
                window.__editingValues__[itemKey] = {};
            }
            window.__editingValues__[itemKey][langCode] = newValue;

            // Sync vào ref qua onScrollSync
            if (onScrollSync) {
                onScrollSync(itemKey, langCode, newValue);
            }

            // Sau đó mới gọi onChange
            onChange(newValue);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            // Sync giá trị cuối cùng khi blur
            const currentValue = e.target.value;
            if (onScrollSync) {
                onScrollSync(itemKey, langCode, currentValue);
            }
            if (onBlur) {
                onBlur();
            }
        };

        return (
            <TextField
                key={inputKey}
                inputRef={inputRef}
                inputProps={{
                    "data-key": inputKey,
                    "data-item-key": itemKey,
                    "data-lang-code": langCode,
                }}
                fullWidth
                size="small"
                defaultValue={defaultValueRef.current}
                onChange={handleChange}
                onBlur={handleBlur}
                variant="outlined"
                placeholder={placeholder}
                sx={{
                    "& .MuiOutlinedInput-root": {
                        backgroundColor: isChanged
                            ? "rgba(255, 235, 59, 0.1)"
                            : shouldHighlight
                                ? "rgba(255, 152, 0, 0.05)"
                                : "transparent",
                        "&:hover": {
                            backgroundColor: isChanged
                                ? "rgba(255, 235, 59, 0.15)"
                                : shouldHighlight
                                    ? "rgba(255, 152, 0, 0.1)"
                                    : "rgba(0, 0, 0, 0.04)",
                        },
                        "&.Mui-focused": {
                            backgroundColor: isChanged
                                ? "rgba(255, 235, 59, 0.2)"
                                : shouldHighlight
                                    ? "rgba(255, 152, 0, 0.15)"
                                    : "transparent",
                        },
                    },
                }}
            />
        );
    },
    (prevProps, nextProps) => {
        // Chỉ re-render nếu các props quan trọng thay đổi (không bao gồm value)
        return (
            prevProps.inputKey === nextProps.inputKey &&
            prevProps.placeholder === nextProps.placeholder &&
            prevProps.isChanged === nextProps.isChanged &&
            prevProps.shouldHighlight === nextProps.shouldHighlight
        );
    }
);

function Localization({ data }: { data: CreatePostTypeData }) {
    const classes = useStyles();
    const useApi = useAjax();
    const apiTranslateByAI = useAjax();
    const [searchParams, setSearchParams] = useSearchParams();

    // Đọc view từ URL params, mặc định là "localization"
    const viewFromUrl = searchParams.get("view") as "localization" | "language" | null;
    const initialView = (viewFromUrl === "localization" || viewFromUrl === "language")
        ? viewFromUrl
        : "localization";

    const [view, setView] = React.useState<"localization" | "language">(initialView);
    const [languages, setLanguages] = React.useState<Language[]>([]);
    const [localizeData, setLocalizeData] = React.useState<LocalizeData | null>(
        null
    );
    const [isLoadData, setIsLoadData] = React.useState<boolean>(false);
    const [translations, setTranslations] = React.useState<TranslationItem[]>(
        []
    );
    const [selectedTab, setSelectedTab] = React.useState<string>("");
    const [showUntranslatedOnly, setShowUntranslatedOnly] =
        React.useState<boolean>(false);
    const [highlightUntranslated, setHighlightUntranslated] =
        React.useState<boolean>(false);
    const [searchQuery, setSearchQuery] = React.useState<string>("");
    // State để force re-render khi global storage thay đổi - sử dụng debounce
    const [editingValuesVersion, setEditingValuesVersion] = React.useState(0);
    const editingValuesVersionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Đồng bộ view với URL params khi URL thay đổi (ví dụ: back/forward button)
    React.useEffect(() => {
        const viewFromUrl = searchParams.get("view") as "localization" | "language" | null;
        if (viewFromUrl === "localization" || viewFromUrl === "language") {
            setView(viewFromUrl);
        } else {
            // Nếu URL không có view param, mặc định là "localization"
            setView("localization");
        }
    }, [searchParams]);

    // Hàm để cập nhật view và URL params
    const handleViewChange = React.useCallback((newView: "localization" | "language") => {
        setView(newView);
        const newSearchParams = new URLSearchParams(searchParams.toString());
        if (newView === "localization") {
            // Xóa param view nếu về localization (mặc định)
            newSearchParams.delete("view");
        } else {
            newSearchParams.set("view", newView);
        }
        setSearchParams(newSearchParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const confirmSyncLanguage = useConfirmDialog({
        title: 'Xác nhận đồng bộ Languages',
        message: 'Bạn có chắc chắn muốn đồng bộ tất cả languages lên Firestore? Hãy đảm bảo bạn đã kiểm tra và xác nhận dữ liệu trước khi đồng bộ.'
    });

    const handleGetData = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/localization/keys",
            method: "POST",
            data: {
                action: "get",
                id: data.post.id,
            },
            success: (result: ApiResponse) => {
                if (result.success && result.data) {
                    setLanguages(result.data.languages);
                    setLocalizeData(result.data.localize);
                    processLocalizationData(
                        result.data.languages,
                        result.data.localize,
                        result.data.translations || {}
                    );
                    // Tự động chọn tab đầu tiên
                    const groupKeys = Object.keys(result.data.localize.groups);
                    if (groupKeys.length > 0) {
                        setSelectedTab(groupKeys[0]);
                    }
                    setIsLoadData(true);
                }
            },
        });
    };

    const processLocalizationData = (
        languagesData: Language[],
        localize: LocalizeData,
        translationsFromApi: {
            [langCode: string]: {
                [key: string]: string;
            };
        }
    ) => {
        const translationItems: TranslationItem[] = [];

        // Flatten groups object thành array
        Object.keys(localize.groups).forEach((namespace) => {
            Object.keys(localize.groups[namespace]).forEach((key) => {
                const fullKey = `${namespace}.${key}`;
                const defaultValue = localize.groups[namespace][key];

                const translations: { [langCode: string]: string } = {};
                const originalTranslations: { [langCode: string]: string } = {};

                languagesData.forEach((lang) => {
                    // Load translation từ API nếu có (key không có namespace)
                    let translationValue = translationsFromApi[lang.code]?.[key] || "";
                    // Restore từ global storage nếu có (giữ lại giá trị đang edit)
                    if (window.__editingValues__?.[fullKey]?.[lang.code] !== undefined) {
                        translationValue = window.__editingValues__[fullKey][lang.code];
                    }
                    translations[lang.code] = translationValue;
                    originalTranslations[lang.code] = translationsFromApi[lang.code]?.[key] || ""; // Lưu giá trị ban đầu từ API để so sánh
                });

                translationItems.push({
                    key: fullKey,
                    default: defaultValue,
                    translations,
                    originalTranslations,
                });
            });
        });

        setTranslations(translationItems);
    };

    React.useEffect(() => {
        handleGetData();
    }, []);

    // Sử dụng ref để lưu giá trị đang edit mà không trigger re-render
    const editingValuesRef = React.useRef<{
        [key: string]: { [langCode: string]: string };
    }>({});

    const handleTranslationChange = React.useCallback(
        (
            itemKey: string,
            langCode: string,
            value: string
        ) => {
            // Chỉ lưu vào ref, không update state để tránh re-render
            if (!editingValuesRef.current[itemKey]) {
                editingValuesRef.current[itemKey] = {};
            }
            editingValuesRef.current[itemKey][langCode] = value;

            // Lưu vào global storage
            if (!window.__editingValues__) {
                window.__editingValues__ = {};
            }
            if (!window.__editingValues__[itemKey]) {
                window.__editingValues__[itemKey] = {};
            }
            window.__editingValues__[itemKey][langCode] = value;

            // Force re-render để update highlight - sử dụng debounce để tránh re-render quá nhiều
            if (editingValuesVersionTimeoutRef.current) {
                clearTimeout(editingValuesVersionTimeoutRef.current);
            }
            editingValuesVersionTimeoutRef.current = setTimeout(() => {
                setEditingValuesVersion((prev) => prev + 1);
            }, 1000); // Debounce 1000ms để tránh re-render khi đang gõ (chỉ update highlight sau khi dừng gõ 1 giây)
        },
        []
    );

    const handleTranslationBlur = React.useCallback(
        (itemKey: string, langCode: string) => {
            const editingValue = editingValuesRef.current[itemKey]?.[langCode];
            if (editingValue !== undefined) {
                const itemIndex = translations.findIndex((t) => t.key === itemKey);
                if (itemIndex >= 0) {
                    setTranslations((prev) => {
                        const newTranslations = [...prev];
                        newTranslations[itemIndex].translations[langCode] = editingValue;
                        return newTranslations;
                    });
                    // Xóa khỏi ref
                    if (editingValuesRef.current[itemKey]) {
                        delete editingValuesRef.current[itemKey][langCode];
                        if (Object.keys(editingValuesRef.current[itemKey]).length === 0) {
                            delete editingValuesRef.current[itemKey];
                        }
                    }
                    // Xóa khỏi global storage sau khi sync
                    if (window.__editingValues__ && window.__editingValues__[itemKey]?.[langCode]) {
                        delete window.__editingValues__[itemKey][langCode];
                        if (window.__editingValues__[itemKey] && Object.keys(window.__editingValues__[itemKey]).length === 0) {
                            delete window.__editingValues__[itemKey];
                        }
                    }
                }
            }
            // Force update highlight ngay khi blur (clear timeout và update ngay)
            if (editingValuesVersionTimeoutRef.current) {
                clearTimeout(editingValuesVersionTimeoutRef.current);
                editingValuesVersionTimeoutRef.current = null;
            }
            setEditingValuesVersion((prev) => prev + 1);
        },
        [translations]
    );

    // Đếm số lượng key đã thay đổi - check cả global storage
    const changedKeysCount = React.useMemo(() => {
        let count = 0;
        translations.forEach((item) => {
            Object.keys(item.translations).forEach((langCode) => {
                // Kiểm tra giá trị từ global storage (đang edit) hoặc từ translations
                const editingValue = window.__editingValues__?.[item.key]?.[langCode];
                const currentValue = editingValue !== undefined
                    ? editingValue
                    : (item.translations[langCode] || "");
                const originalValue = item.originalTranslations[langCode] || "";
                if (currentValue !== originalValue) {
                    count++;
                }
            });
        });
        return count;
    }, [translations, editingValuesVersion]);

    // Kiểm tra xem có key nào đã thay đổi không
    const hasChangedKeys = changedKeysCount > 0;

    // Kiểm tra xem một key cụ thể có thay đổi không
    const isKeyChanged = React.useCallback(
        (item: TranslationItem, langCode: string) => {
            // Kiểm tra giá trị từ global storage (đang edit) hoặc từ translations
            const editingValue = window.__editingValues__?.[item.key]?.[langCode];
            const currentValue = editingValue !== undefined
                ? editingValue
                : (item.translations[langCode] || "");
            const originalValue = item.originalTranslations[langCode] || "";
            return currentValue !== originalValue;
        },
        []
    );

    // Kiểm tra xem một key có chưa dịch không
    const isKeyUntranslated = React.useCallback(
        (item: TranslationItem) => {
            if (languages.length === 0) return false;
            return languages.some((lang) => {
                // Ignore English
                if (lang.code === 'en') return false;
                const translationValue = item.translations[lang.code] || "";
                return !translationValue.trim();
            });
        },
        [languages]
    );

    // Tạo itemContent ở top level
    const itemContent = React.useCallback(
        (index: number, item: TranslationItem) => {
            // Bỏ prefix group (namespace) khỏi key
            const [, ...rest] = item.key.split(".");
            const keyWithoutNamespace = rest.join(".");
            const isUntranslated = isKeyUntranslated(item);

            return (
                <>
                    <TableCell
                        className={classes.stickyCell}
                        sx={{
                            width: 350,
                            minWidth: 350,
                            maxWidth: 350,
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                            backgroundColor:
                                highlightUntranslated && isUntranslated
                                    ? "rgba(255, 152, 0, 0.1)"
                                    : "transparent",
                        }}
                    >
                        {keyWithoutNamespace}
                    </TableCell>
                    <TableCell
                        className={classes.editCell}
                        sx={{
                            width: 300,
                            minWidth: 300,
                            maxWidth: 300,
                            backgroundColor:
                                highlightUntranslated && isUntranslated
                                    ? "rgba(255, 152, 0, 0.1)"
                                    : "transparent",
                        }}
                    >
                        <TextField
                            fullWidth
                            size="small"
                            value={item.default}
                            disabled
                            variant="outlined"
                        />
                    </TableCell>
                    {languages.length > 0 && languages.map((lang) => {
                        // Kiểm tra xem có giá trị đang edit trong global storage không
                        const editingValue = window.__editingValues__?.[item.key]?.[lang.code];
                        // Ưu tiên dùng giá trị từ global storage nếu có, nếu không thì dùng từ translations
                        const displayValue = editingValue !== undefined
                            ? editingValue
                            : (item.translations[lang.code] || "");
                        const isChanged = isKeyChanged(item, lang.code);
                        // Chỉ highlight ô này nếu ô này chưa dịch (không check toàn bộ key)
                        // Ignore English for highlighting
                        const isLangUntranslated = !displayValue.trim() && lang.code !== 'en';
                        const shouldHighlight = highlightUntranslated && isLangUntranslated;
                        return (
                            <TableCell
                                key={lang.code}
                                className={classes.editCell}
                                sx={{
                                    backgroundColor: isChanged
                                        ? "rgba(255, 235, 59, 0.2)"
                                        : shouldHighlight
                                            ? "rgba(255, 152, 0, 0.1)"
                                            : "transparent",
                                    width: 300,
                                    minWidth: 300,
                                    maxWidth: 300,
                                }}
                            >
                                <EditableTextField
                                    inputKey={`${item.key}-${lang.code}`}
                                    itemKey={item.key}
                                    langCode={lang.code}
                                    value={displayValue}
                                    placeholder={item.default}
                                    isChanged={isChanged}
                                    shouldHighlight={shouldHighlight}
                                    onChange={(value) =>
                                        handleTranslationChange(
                                            item.key,
                                            lang.code,
                                            value
                                        )
                                    }
                                    onBlur={() => handleTranslationBlur(item.key, lang.code)}
                                    onScrollSync={handleTranslationChange}
                                />
                            </TableCell>
                        );
                    })}
                </>
            );
        },
        [
            highlightUntranslated,
            languages,
            classes,
            handleTranslationChange,
            handleTranslationBlur,
            isKeyChanged,
            isKeyUntranslated,
            translations,
            editingValuesVersion,
        ]
    );

    const handleSave = () => {
        if (!localizeData) return;

        // Chuyển đổi translations về format theo ngôn ngữ
        // Format: { vi: { key: value, key2: value2 }, jp: { key: value } }
        const translationsByLanguage: {
            [langCode: string]: {
                [key: string]: string;
            };
        } = {};

        // Trước khi save, sync tất cả giá trị từ global storage vào translations
        const translationsToSave = translations.map((item) => {
            const updatedTranslations = { ...item.translations };
            // Sync từ global storage nếu có
            const editingValues = window.__editingValues__?.[item.key];
            if (editingValues) {
                Object.keys(editingValues).forEach((langCode) => {
                    updatedTranslations[langCode] = editingValues[langCode];
                });
            }
            return {
                ...item,
                translations: updatedTranslations,
            };
        });

        translationsToSave.forEach((item) => {
            // Chỉ xử lý nếu có ít nhất một translation thay đổi
            const hasChanges = Object.keys(item.translations).some((langCode) => {
                const currentValue = item.translations[langCode] || "";
                const originalValue = item.originalTranslations[langCode] || "";
                return currentValue !== originalValue;
            });

            if (hasChanges) {
                // Tách namespace ra khỏi key (bỏ tiền tố group)
                const [, ...rest] = item.key.split(".");
                const keyWithoutNamespace = rest.join(".");

                // Lưu các translations đã thay đổi theo từng ngôn ngữ
                Object.keys(item.translations).forEach((langCode) => {
                    const currentValue = item.translations[langCode] || "";
                    const originalValue = item.originalTranslations[langCode] || "";
                    if (currentValue !== originalValue) {
                        if (!translationsByLanguage[langCode]) {
                            translationsByLanguage[langCode] = {};
                        }
                        // Chỉ sử dụng key không có namespace
                        translationsByLanguage[langCode][keyWithoutNamespace] = currentValue;
                    }
                });
            }
        });

        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/localization/update",
            method: "POST",
            data: {
                action: "update",
                id: data.post.id,
                translations: translationsByLanguage,
            },
            success: () => {
                // Cập nhật originalTranslations sau khi lưu thành công
                setTranslations((prev) => {
                    return prev.map((item) => {
                        // Sync từ global storage trước khi update
                        const updatedTranslations = { ...item.translations };
                        const editingValues = window.__editingValues__?.[item.key];
                        if (editingValues) {
                            Object.keys(editingValues).forEach((langCode) => {
                                updatedTranslations[langCode] = editingValues[langCode];
                            });
                        }
                        return {
                            ...item,
                            translations: updatedTranslations,
                            originalTranslations: { ...updatedTranslations },
                        };
                    });
                });
                // Xóa global storage sau khi save thành công
                window.__editingValues__ = {};
            },
        });
    };

    const handleTranslateByAI = (languageCode: string) => {
        apiTranslateByAI.ajax({
            url: "plugin/vn4-e-learning/app-mobile/localization/translate-by-ai",
            method: "POST",
            data: {
                id: data.post.id,
                language_target: languageCode,
            },
            success: (result) => {
                // Re-fetch data after successful translation
                handleGetData();
            },
        });
    };

    if (!isLoadData) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    minHeight: 400,
                }}
            >
                <CircularProgress size={40} />
            </Box>
        );
    }

    if (!localizeData) {
        return (
            <Box>
                <Typography variant="h6">
                    Không có dữ liệu localization
                </Typography>
            </Box>
        );
    }

    // Nhóm translations theo namespace
    const groupedTranslations: { [namespace: string]: TranslationItem[] } = {};
    translations.forEach((item) => {
        const [namespace] = item.key.split(".");
        if (!groupedTranslations[namespace]) {
            groupedTranslations[namespace] = [];
        }
        groupedTranslations[namespace].push(item);
    });

    const groupNames = Object.keys(groupedTranslations);

    // Hàm filter theo search query
    const filterBySearchQuery = (items: TranslationItem[]): TranslationItem[] => {
        if (!searchQuery.trim()) return items;

        const query = searchQuery.toLowerCase().trim();
        return items.filter((item) => {
            // Tìm theo key
            if (item.key.toLowerCase().includes(query)) return true;

            // Tìm theo default value
            if (item.default.toLowerCase().includes(query)) return true;

            // Tìm theo text đã dịch ở tất cả ngôn ngữ
            return Object.values(item.translations).some(
                (translation) => translation && translation.toLowerCase().includes(query)
            );
        });
    };

    // Lấy tất cả translations đã filter theo search query
    const getFilteredTranslations = (): TranslationItem[] => {
        let allTranslations = translations;

        // Filter theo search query
        allTranslations = filterBySearchQuery(allTranslations);

        // Filter theo untranslated
        if (showUntranslatedOnly) {
            allTranslations = allTranslations.filter((item) => isKeyUntranslated(item));
        }

        return allTranslations;
    };

    const renderTable = (namespace: string | null, customTranslations?: TranslationItem[]) => {
        let namespaceTranslations = customTranslations
            ? customTranslations
            : (namespace ? (groupedTranslations[namespace] || []) : []);

        // Chỉ filter nếu không có customTranslations (vì customTranslations đã được filter sẵn)
        if (!customTranslations) {
            // Filter theo search query
            namespaceTranslations = filterBySearchQuery(namespaceTranslations);

            // Filter chỉ hiển thị key chưa dịch nếu checkbox được bật
            if (showUntranslatedOnly) {
                namespaceTranslations = namespaceTranslations.filter((item) => {
                    return isKeyUntranslated(item);
                });
            }
        }

        // Đếm số lượng key chưa translate cho namespace hiện tại
        const untranslatedCountByLanguageForNamespace: {
            [langCode: string]: number;
        } = {};
        if (languages.length > 0) {
            languages.forEach((lang) => {
                untranslatedCountByLanguageForNamespace[lang.code] = 0;
            });
            namespaceTranslations.forEach((item) => {
                Object.keys(item.translations).forEach((langCode) => {
                    // Ignore English for untranslated count
                    if (langCode === 'en') return;

                    const translationValue = item.translations[langCode] || "";
                    if (!translationValue.trim()) {
                        untranslatedCountByLanguageForNamespace[langCode] =
                            (untranslatedCountByLanguageForNamespace[langCode] || 0) +
                            1;
                    }
                });
            });
        }

        const fixedHeaderContent = () => (
            <TableRow>
                <TableCell
                    className={classes.headerCell}
                    sx={{
                        backgroundColor: "background.paper",
                        width: 350,
                        minWidth: 350,
                        maxWidth: 350,
                    }}
                >
                    Key
                </TableCell>
                <TableCell
                    sx={{
                        backgroundColor: "background.paper",
                        width: 300,
                        minWidth: 300,
                        maxWidth: 300,
                    }}
                >
                    Default
                </TableCell>
                {languages.length > 0 && languages.map((lang) => (
                    <TableCell
                        key={lang.code}
                        sx={{
                            backgroundColor: "background.paper",
                            width: 300,
                            minWidth: 300,
                            maxWidth: 300,
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                {lang.icon_url ? (
                                    <img
                                        src={lang.icon_url}
                                        alt=""
                                        className={classes.flagIcon}
                                    />
                                ) : (
                                    <img
                                        src={`https://flagcdn.com/w20/${lang.flag_code}.png`}
                                        alt=""
                                        className={classes.flagIcon}
                                    />
                                )}
                                <Typography variant="body2" component="span">
                                    {lang.name}
                                </Typography>
                                {untranslatedCountByLanguageForNamespace[lang.code] >
                                    0 && (
                                        <Chip
                                            label={
                                                untranslatedCountByLanguageForNamespace[
                                                lang.code
                                                ]
                                            }
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            sx={{
                                                minWidth: 24,
                                                height: 20,
                                                fontSize: "0.7rem",
                                            }}
                                        />
                                    )}
                            </Box>
                            <Tooltip title="Translate by AI">
                                <IconButton
                                    size="small"
                                    onClick={() => handleTranslateByAI(lang.code)}
                                    disabled={apiTranslateByAI.open}
                                    sx={{
                                        color: "primary.main",
                                        "&:hover": {
                                            backgroundColor: "primary.light",
                                        },
                                    }}
                                >
                                    <AutoAwesomeIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </TableCell>
                ))}
            </TableRow>
        );

        return (
            <Box
                sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <TableContainer
                    component={Paper}
                    sx={{ flex: 1, height: "calc(100vh - 300px)", minHeight: 400 }}
                >
                    <TableVirtuoso
                        data={namespaceTranslations}
                        fixedHeaderContent={fixedHeaderContent}
                        itemContent={itemContent}
                        style={{ height: "100%" }}
                        components={{
                            Table: (props) => (
                                <table
                                    {...props}
                                    style={{
                                        ...props.style,
                                        tableLayout: "fixed",
                                        width: "100%",
                                    }}
                                />
                            ),
                        }}
                    />
                </TableContainer>
            </Box>
        );
    };

    // Nếu view là "language", render component Language
    if (view === "language") {
        return (
            <Box sx={{ height: "100%" }}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleViewChange("localization")}
                    >
                        Quay lại Localization
                    </Button>
                </Box>
                <Language data={data} />
                {confirmSyncLanguage.component}
            </Box>
        );
    }

    return (
        <Box sx={{ height: "100%" }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                }}
            >
                <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showUntranslatedOnly}
                                onChange={(e) =>
                                    setShowUntranslatedOnly(e.target.checked)
                                }
                                color="primary"
                            />
                        }
                        label="Chỉ hiển thị những key chưa dịch"
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={highlightUntranslated}
                                onChange={(e) =>
                                    setHighlightUntranslated(e.target.checked)
                                }
                                color="primary"
                            />
                        }
                        label="Add style các key chưa dịch"
                    />
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm key, text dịch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ minWidth: 280 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery && (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setSearchQuery("")}
                                        edge="end"
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => handleViewChange("language")}
                    >
                        Languages
                    </Button>
                    <LoadingButton
                        loading={useApi.open}
                        variant="contained"
                        color="primary"
                        disabled={!hasChangedKeys}
                        onClick={handleSave}
                    >
                        Lưu thay đổi
                        {changedKeysCount > 0 && ` (${changedKeysCount})`}
                    </LoadingButton>
                </Box>
            </Box>

            {groupNames.length > 0 ? (
                <Grid
                    container
                    spacing={2}
                    sx={{ height: "calc(100% - 80px)" }}
                >
                    {/* Cột trái - Danh sách groups hoặc kết quả tìm kiếm */}
                    <Grid item xs={12} md={2}>
                        <Box sx={{ height: "100%" }}>
                            <List>
                                {searchQuery.trim() ? (
                                    // Khi có search, hiển thị 1 group "Kết quả tìm kiếm"
                                    <ListItem disablePadding>
                                        <ListItemButton
                                            selected={true}
                                            sx={{
                                                borderRadius: 1,
                                                mb: 1,
                                                "&.Mui-selected": {
                                                    backgroundColor: "primary.main",
                                                    color: "white",
                                                    "&:hover": {
                                                        backgroundColor: "primary.dark",
                                                    },
                                                    "& .MuiListItemText-primary": {
                                                        color: "white",
                                                    },
                                                    "& .MuiListItemText-secondary": {
                                                        color: "rgba(255,255,255,0.7)",
                                                    },
                                                    "& .MuiChip-root": {
                                                        backgroundColor: "rgba(255,255,255,0.2)",
                                                        color: "white",
                                                    },
                                                },
                                            }}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 1,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="subtitle1"
                                                            sx={{ color: "primary.contrastText" }}
                                                            fontWeight="bold"
                                                        >
                                                            Kết quả
                                                        </Typography>
                                                        <Chip
                                                            label={getFilteredTranslations().length}
                                                            size="small"
                                                            color="default"
                                                            variant="filled"
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography
                                                        variant="body2"
                                                        color="rgba(255,255,255,0.7)"
                                                    >
                                                        {getFilteredTranslations().length} keys
                                                    </Typography>
                                                }
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ) : (
                                    // Khi không search, hiển thị danh sách groups bình thường
                                    groupNames.map((namespace) => {
                                        const isSelected = selectedTab === namespace;
                                        const keyCount = groupedTranslations[namespace].length;

                                        return (
                                            <ListItem key={namespace} disablePadding>
                                                <ListItemButton
                                                    selected={isSelected}
                                                    onClick={() => setSelectedTab(namespace)}
                                                    sx={{
                                                        borderRadius: 1,
                                                        mb: 1,
                                                        "&.Mui-selected": {
                                                            backgroundColor: "primary.main",
                                                            color: "white",
                                                            "&:hover": {
                                                                backgroundColor: "primary.dark",
                                                            },
                                                            "& .MuiListItemText-primary": {
                                                                color: "white",
                                                            },
                                                            "& .MuiListItemText-secondary": {
                                                                color: "rgba(255,255,255,0.7)",
                                                            },
                                                            "& .MuiChip-root": {
                                                                backgroundColor: "rgba(255,255,255,0.2)",
                                                                color: "white",
                                                            },
                                                        },
                                                    }}
                                                >
                                                    <ListItemText
                                                        primary={
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 1,
                                                                }}
                                                            >
                                                                <Typography
                                                                    variant="subtitle1"
                                                                    sx={{
                                                                        color: isSelected
                                                                            ? "primary.contrastText"
                                                                            : "text.primary",
                                                                    }}
                                                                    fontWeight="bold"
                                                                >
                                                                    {namespace}
                                                                </Typography>
                                                                <Chip
                                                                    label={keyCount}
                                                                    size="small"
                                                                    color={isSelected ? "default" : "primary"}
                                                                    variant={isSelected ? "filled" : "outlined"}
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Typography
                                                                variant="body2"
                                                                color={
                                                                    isSelected
                                                                        ? "rgba(255,255,255,0.7)"
                                                                        : "text.secondary"
                                                                }
                                                            >
                                                                {keyCount} keys
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItemButton>
                                            </ListItem>
                                        );
                                    })
                                )}
                            </List>
                        </Box>
                    </Grid>

                    {/* Cột phải - Bảng translations */}
                    <Grid item xs={12} md={10}>
                        <Box
                            sx={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            {searchQuery.trim() ? (
                                // Khi có search, hiển thị kết quả tìm kiếm
                                getFilteredTranslations().length > 0 ? (
                                    renderTable(null, getFilteredTranslations())
                                ) : (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            height: "100%",
                                            flexDirection: "column",
                                            gap: 2,
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            color="text.secondary"
                                        >
                                            Không tìm thấy kết quả phù hợp với "{searchQuery}"
                                        </Typography>
                                    </Box>
                                )
                            ) : (
                                // Khi không search, hiển thị theo group được chọn
                                selectedTab && groupedTranslations[selectedTab] ? (
                                    renderTable(selectedTab)
                                ) : (
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            height: "100%",
                                            flexDirection: "column",
                                            gap: 2,
                                        }}
                                    >
                                        <Typography
                                            variant="h6"
                                            color="text.secondary"
                                        >
                                            Chọn một group để xem translations
                                        </Typography>
                                    </Box>
                                )
                            )}
                        </Box>
                    </Grid>
                </Grid>
            ) : (
                <Box>
                    <Typography variant="h6">
                        Không có dữ liệu localization
                    </Typography>
                </Box>
            )}
        </Box>
    );
}

export default Localization;
