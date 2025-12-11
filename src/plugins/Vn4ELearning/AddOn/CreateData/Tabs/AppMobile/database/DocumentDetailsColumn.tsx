import React from "react";
import Box from "components/atoms/Box";
import Typography from "components/atoms/Typography";
import Button from "components/atoms/Button";
import IconButton from "components/atoms/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FolderIcon from "@mui/icons-material/Folder";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import { Collection } from "./types";
import CircularProgress from "components/atoms/CircularProgress";

interface DocumentDetailsColumnProps {
    selectedDocument: string | null;
    collections: Collection[];
    selectedCollection: string | null;
    data: CreatePostTypeData;
    documentData: Record<string, unknown>;
    onEditDocument: () => void;
    subCollections: Collection[];
    ajaxSubCollections: { open: boolean };
    onSubCollectionClick?: (subCollection: Collection) => void;
    activeSubCollections?: string[]; // Danh sách các sub-collection đang active (đã được mở)
    width?: number;
    onResizeStart?: (e: React.MouseEvent) => void;
    isResizing?: boolean;
}

const DocumentDetailsColumn: React.FC<DocumentDetailsColumnProps> = ({
    selectedDocument,
    collections,
    selectedCollection,
    data,
    documentData,
    onEditDocument,
    subCollections,
    ajaxSubCollections,
    onSubCollectionClick,
    activeSubCollections = [],
    width = 600,
    onResizeStart,
    isResizing = false,
}) => {
    const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(
        new Set()
    );

    const selectedCollectionData = collections.find(
        (collection) => collection.title === selectedCollection
    );

    const toggleExpanded = (key: string) => {
        setExpandedKeys((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const renderValue = (
        value: unknown,
        key: string,
        level = 0
    ): React.ReactNode => {
        const isExpanded = expandedKeys.has(key);
        const indent = level * 20;

        if (value === null) {
            return (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        ml: `${indent}px`,
                    }}
                >
                    <Typography sx={{ color: "#666", fontFamily: "monospace" }}>
                        null
                    </Typography>
                </Box>
            );
        }

        if (value === undefined) {
            return (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        ml: `${indent}px`,
                    }}
                >
                    <Typography sx={{ color: "#666", fontFamily: "monospace" }}>
                        undefined
                    </Typography>
                </Box>
            );
        }

        if (typeof value === "boolean") {
            return (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        ml: `${indent}px`,
                    }}
                >
                    <Typography
                        sx={{ color: "#1976d2", fontFamily: "monospace" }}
                    >
                        {value ? "true" : "false"}
                    </Typography>
                </Box>
            );
        }

        if (typeof value === "string") {
            return (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        ml: `${indent}px`,
                    }}
                >
                    <Typography
                        sx={{ color: "#2e7d32", fontFamily: "monospace" }}
                    >
                        "{value}"
                    </Typography>
                </Box>
            );
        }

        if (typeof value === "number") {
            return (
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        ml: `${indent}px`,
                    }}
                >
                    <Typography
                        sx={{ color: "#1976d2", fontFamily: "monospace" }}
                    >
                        {value}
                    </Typography>
                </Box>
            );
        }

        if (Array.isArray(value)) {
            return (
                <Box>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                        }}
                        onClick={() => toggleExpanded(key)}
                    >
                        <IconButton size="small" sx={{ p: 0.5, mr: 0.5 }}>
                            {isExpanded ? (
                                <ExpandMoreIcon sx={{ fontSize: 16 }} />
                            ) : (
                                <ChevronRightIcon sx={{ fontSize: 16 }} />
                            )}
                        </IconButton>
                        <Typography
                            sx={{
                                color: "#666",
                                fontFamily: "monospace",
                                fontSize: "14px",
                            }}
                        >
                            array ({value.length})
                        </Typography>
                    </Box>
                    {isExpanded && (
                        <Box sx={{ ml: 3, mt: 0.5 }}>
                            {value.map((item, index) => (
                                <Box key={index} sx={{ mb: 0.5 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                color: "#1976d2",
                                                fontFamily: "monospace",
                                                fontSize: "14px",
                                                minWidth: "fit-content",
                                            }}
                                        >
                                            [{index}]:
                                        </Typography>
                                        <Box sx={{ ml: 1, flex: 1 }}>
                                            {renderValue(
                                                item,
                                                `${key}[${index}]`,
                                                level + 1
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            );
        }

        if (typeof value === "object" && value !== null) {
            const obj = value as Record<string, unknown>;
            const keys = Object.keys(obj);

            // Filter out Firebase internal fields
            const filteredKeys = keys.filter(
                (key) =>
                    !key.startsWith("_") &&
                    key !== "mapValue" &&
                    key !== "fields" &&
                    key !== "arrayValue" &&
                    key !== "stringValue" &&
                    key !== "integerValue" &&
                    key !== "doubleValue" &&
                    key !== "booleanValue" &&
                    key !== "nullValue" &&
                    key !== "timestampValue" &&
                    key !== "geoPointValue" &&
                    key !== "referenceValue"
            );

            return (
                <Box>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                        }}
                        onClick={() => toggleExpanded(key)}
                    >
                        <IconButton size="small" sx={{ p: 0.5, mr: 0.5 }}>
                            {isExpanded ? (
                                <ExpandMoreIcon sx={{ fontSize: 16 }} />
                            ) : (
                                <ChevronRightIcon sx={{ fontSize: 16 }} />
                            )}
                        </IconButton>
                        <Typography
                            sx={{
                                color: "#666",
                                fontFamily: "monospace",
                                fontSize: "14px",
                            }}
                        >
                            object ({filteredKeys.length})
                        </Typography>
                    </Box>
                    {isExpanded && (
                        <Box sx={{ ml: 3, mt: 0.5 }}>
                            {filteredKeys.map((objKey) => (
                                <Box key={objKey} sx={{ mb: 0.5 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                color: "#1976d2",
                                                fontFamily: "monospace",
                                                fontSize: "14px",
                                                minWidth: "fit-content",
                                            }}
                                        >
                                            {objKey}:
                                        </Typography>
                                        <Box sx={{ ml: 1, flex: 1 }}>
                                            {renderValue(
                                                obj[objKey],
                                                `${key}.${objKey}`,
                                                level + 1
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            );
        }

        return (
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    ml: `${indent}px`,
                }}
            >
                <Typography sx={{ color: "#666", fontFamily: "monospace" }}>
                    {String(value)}
                </Typography>
            </Box>
        );
    };

    return (
        <Box
            sx={{
                width: `${width}px`,
                minWidth: "400px",
                backgroundColor: "#fafafa",
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid #e0e0e0",
                position: "relative",
                flexShrink: 0,
            }}
        >
            <Box
                sx={{
                    p: 2,
                    borderBottom: "1px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    height: 52,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: "bold",
                        color: "#1976d2",
                        fontSize: "14px",
                    }}
                >
                    Document Details
                </Typography>
                {selectedDocument && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={onEditDocument}
                        sx={{ ml: 1 }}
                    >
                        Edit
                    </Button>
                )}
            </Box>
            {selectedCollection && selectedCollectionData ? (
                <Box
                    sx={{
                        p: 2,
                        flex: 1,
                        overflow: "auto",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <>
                        <Box
                            sx={{
                                mb: 2,
                                pb: 2,
                                borderBottom: "1px solid #e0e0e0",
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                }}
                            >
                                {ajaxSubCollections.open ? (
                                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                                        <CircularProgress size={20} />
                                    </Box>
                                ) : selectedDocument &&
                                  subCollections.length > 0 ? (
                                    subCollections.map((subCollection) => {
                                        const isActive = activeSubCollections.includes(subCollection.title);
                                        return (
                                        <Box
                                            key={subCollection.title}
                                            onClick={() => {
                                                if (onSubCollectionClick) {
                                                    onSubCollectionClick(subCollection);
                                                }
                                            }}
                                            sx={{
                                                p: 1,
                                                borderRadius: "4px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                                cursor: "pointer",
                                                backgroundColor: isActive ? "#e3f2fd" : "transparent",
                                                border: isActive ? "1px solid #1976d2" : "1px solid transparent",
                                                "&:hover": {
                                                    backgroundColor: isActive ? "#e3f2fd" : "#f5f5f5",
                                                },
                                            }}
                                        >
                                            <FolderIcon
                                                sx={{
                                                    fontSize: 18,
                                                    color: "#1976d2",
                                                }}
                                            />
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontSize: "13px",
                                                    color: isActive ? "#1976d2" : "#1976d2",
                                                    fontWeight: isActive ? "600" : "500",
                                                }}
                                            >
                                                {subCollection.title}
                                            </Typography>
                                        </Box>
                                        );
                                    })
                                ) : (
                                    <Box
                                        sx={{
                                            p: 2,
                                            textAlign: "center",
                                            color: "text.secondary",
                                            flex: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography variant="body2">
                                            Không có sub collections
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                        {!selectedDocument ? (
                            <Box
                                sx={{
                                    p: 2,
                                    textAlign: "center",
                                    color: "text.secondary",
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Typography variant="body2">
                                    Chọn một document để xem chi tiết
                                </Typography>
                            </Box>
                        ) : Object.keys(documentData).length === 0 ? (
                            <Box
                                sx={{
                                    p: 2,
                                    textAlign: "center",
                                    color: "text.secondary",
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Typography variant="body2">
                                    Document này chưa có dữ liệu
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    fontFamily: "monospace",
                                    fontSize: "14px",
                                    p: 2,
                                    flex: 1,
                                    overflow: "auto",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                }}
                            >
                                {Object.entries(documentData).map(
                                    ([key, value]) => (
                                        <Box key={key} sx={{ mb: 0.5 }}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        color: "#1976d2",
                                                        fontFamily: "monospace",
                                                        fontSize: "14px",
                                                        minWidth: "fit-content",
                                                    }}
                                                >
                                                    {key}:
                                                </Typography>
                                                <Box sx={{ ml: 1, flex: 1 }}>
                                                    {renderValue(value, key)}
                                                </Box>
                                            </Box>
                                        </Box>
                                    )
                                )}
                            </Box>
                        )}
                    </>
                </Box>
            ) : (
                <Box
                    sx={{
                        p: 2,
                        textAlign: "center",
                        color: "text.secondary",
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Typography variant="body2">
                        Chọn một document để xem chi tiết
                    </Typography>
                </Box>
            )}
            {onResizeStart && (
                <Box
                    onMouseDown={onResizeStart}
                    sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        cursor: "col-resize",
                        backgroundColor: isResizing ? "#1976d2" : "transparent",
                        "&:hover": {
                            backgroundColor: "#1976d2",
                        },
                        zIndex: 10,
                        transition: "background-color 0.2s ease",
                    }}
                />
            )}
        </Box>
    );
};

export default DocumentDetailsColumn;
