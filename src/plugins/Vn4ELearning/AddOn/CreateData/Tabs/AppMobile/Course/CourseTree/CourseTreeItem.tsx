import React from "react";
import Box from "components/atoms/Box";
import List from "components/atoms/List";
import ListItem from "components/atoms/ListItem";
import ListItemButton from "components/atoms/ListItemButton";
import Collapse from "components/atoms/Collapse";
import Typography from "components/atoms/Typography";
import Chip from "components/atoms/Chip";
import Button from "components/atoms/Button";
import LinearProgress from "components/atoms/LinearProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "react-beautiful-dnd";
import useAjax from "hook/useApi";
import { TreeNode, Course, CourseNodeMap, Translate, Lesson } from "./types";
import {
    getNodeType,
    getNodeKey,
    getChildrenCount,
    getFolderIcon,
    getNodeLabel,
    getChildType,
    getNodeColor,
    getNodeBackgroundColor,
    hasChildren,
    getChildren,
} from "./utils";
import { getLanguageCodeFromTranslate, findTranslateParent, calculateTranslationProgress } from "./helpers";
import LanguageFlags from "./LanguageFlags";

interface CourseTreeItemProps {
    node: TreeNode;
    depth?: number;
    isLast?: boolean;
    onEditNode?: (nodeId: string, nodeType: string) => void;
    onSelectCourseForEdit?: (courseId: string) => void;
    onBackToCourseList?: () => void;
    selectedCourseId?: string | null;
    onCreateCopyFromEnglish?: (langCode: string, nodeKey: string, nodeType: string, courseId: string) => void;
    onAddChild?: (
        parentId: string,
        parentType: string,
        childType: string
    ) => void;
    onUpdateOrder?: (
        parentId: string,
        parentType: string,
        sourceIndex: number,
        destinationIndex: number
    ) => void;
    dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
    expandedNodes?: Set<string>;
    onExpandAll?: (nodeKey: string) => void;
    onCollapse?: (nodeKey: string) => void;
    onExpandNode?: (nodeKey: string) => void;
    languages?: Array<{ code: string; title: string; flag_code: string; icon_url?: string }>;
    courseNodeMap?: CourseNodeMap;
    findCourseIdByPostId?: (postId: string, coursesList: Course[], nodeType?: string) => string | null;
    courses?: Course[] | null;
    showAllLanguages?: boolean;
    postId?: string | number;
}

export default function CourseTreeItem({
    node,
    depth = 0,
    isLast = false,
    onEditNode,
    onCreateCopyFromEnglish,
    onAddChild,
    onUpdateOrder,
    onSelectCourseForEdit,
    onBackToCourseList,
    selectedCourseId,
    dragHandleProps,
    expandedNodes,
    onExpandAll,
    onCollapse,
    onExpandNode,
    languages,
    courseNodeMap,
    findCourseIdByPostId,
    courses,
    showAllLanguages = true,
    postId,
}: CourseTreeItemProps) {
    const apiCreateContentAi = useAjax();
    const apiSyncCourse = useAjax();
    const [aiDialogOpen, setAiDialogOpen] = React.useState(false);
    const [aiDialogValue, setAiDialogValue] = React.useState("");
    const [aiDialogTranslateId, setAiDialogTranslateId] = React.useState<string | null>(null);
    const [aiDialogLessonId, setAiDialogLessonId] = React.useState<string | null>(null);
    const [aiDialogCourseId, setAiDialogCourseId] = React.useState<string | null>(null);
    const [aiDialogNodeType, setAiDialogNodeType] = React.useState<"translate" | "lesson" | null>(null);
    const [open, setOpen] = React.useState(false); // Mặc định đóng tất cả, chỉ hiển thị danh sách khóa học

    // Tự động mở/đóng dựa trên expandedNodes
    React.useEffect(() => {
        if (expandedNodes) {
            const nodeKey = getNodeKey(node);
            const isInExpandedNodes = expandedNodes.has(nodeKey);
            if (isInExpandedNodes && !open) {
                // Tự động mở nếu node có trong expandedNodes và chưa mở
                setOpen(true);
            } else if (!isInExpandedNodes && open) {
                // Tự động đóng nếu node không còn trong expandedNodes và đang mở
                // Điều này xảy ra khi toggle đóng hết hoặc khi node bị xóa khỏi expandedNodes
                setOpen(false);
            }
        }
    }, [expandedNodes, node.id, open]);
    
    const nodeType = getNodeType(node);
    
    // Kiểm tra hasChildren: với course, đếm translate dựa trên showAllLanguages
    let nodeHasChildren = hasChildren(node);
    if (nodeType === "course" && languages && languages.length > 0) {
        const course = node as Course;
        if (course.translates) {
            if (showAllLanguages) {
                // Đếm tất cả translate
                nodeHasChildren = course.translates.length > 0;
            } else {
                // Chỉ đếm translate có ngôn ngữ là "en" hoặc translate mới chưa có language code
                const enTranslates = course.translates.filter((translate: Translate) => {
                    const langCode = getLanguageCodeFromTranslate(translate, languages);
                    return langCode === "en" || langCode === "";
                });
                nodeHasChildren = enTranslates.length > 0;
            }
        } else {
            nodeHasChildren = false;
        }
    }
    
    // Tính childrenCount: với course, đếm translate dựa trên showAllLanguages
    let childrenCount = getChildrenCount(node);
    if (nodeType === "course" && languages && languages.length > 0) {
        const course = node as Course;
        if (course.translates) {
            if (showAllLanguages) {
                // Đếm tất cả translate
                childrenCount = course.translates.length;
            } else {
                // Chỉ đếm translate có ngôn ngữ là "en" hoặc translate mới chưa có language code
                const enTranslates = course.translates.filter((translate: Translate) => {
                    const langCode = getLanguageCodeFromTranslate(translate, languages);
                    return langCode === "en" || langCode === "";
                });
                childrenCount = enTranslates.length;
            }
        } else {
            childrenCount = 0;
        }
    }
    const nodeColor = getNodeColor(node);
    const backgroundColor = getNodeBackgroundColor(node, depth);
    const indentSize = 5; // Giảm xuống 5px mỗi level để giảm khoảng cách cho question
    // Giảm thêm khoảng cách cho question (level sâu nhất)
    const basePadding = nodeType === "question" ? 0 : 2;
    const paddingLeft =
        depth > 0 ? depth * indentSize + basePadding : basePadding;

    // Tính toán currentLanguage cho node hiện tại
    let currentLanguage = "";
    if (languages && languages.length > 0 && courses) {
        if (nodeType === "translate") {
            const translateNode = node as Translate;
            currentLanguage = getLanguageCodeFromTranslate(translateNode, languages);
        } else if (nodeType !== "course") {
            const translateParent = findTranslateParent(node, courses);
            if (translateParent) {
                currentLanguage = getLanguageCodeFromTranslate(translateParent, languages);
            }
        }
    }

    // Filter children: hiển thị translate dựa trên showAllLanguages nếu node là course
    let children = getChildren(node);
    if (nodeType === "course" && languages && languages.length > 0) {
        const course = node as Course;
        if (course.translates) {
            if (showAllLanguages) {
                // Hiển thị tất cả translate
                children = course.translates as TreeNode[];
            } else {
                // Chỉ hiển thị translate có ngôn ngữ là "en" hoặc translate mới chưa có language code
                children = course.translates.filter((translate: Translate) => {
                    const langCode = getLanguageCodeFromTranslate(translate, languages);
                    return langCode === "en" || langCode === "";
                }) as TreeNode[];
            }
        }
    }
    const isLastChild = (index: number) => index === children.length - 1;

    // Tính toán tiến trình dịch (hiển thị cho course, translate, section, chapter, lesson, question)
    const translationProgress = React.useMemo(() => {
        // Lấy courseId để tính tiến trình
        // Với course, courseId là chính node.id
        // Với các node khác, tìm courseId từ courses
        let currentCourseId: string | null = null;
        if (nodeType === "course") {
            currentCourseId = node.id;
        } else {
            currentCourseId = findCourseIdByPostId && courses
                ? findCourseIdByPostId(node.id, courses, nodeType)
                : null;
        }
        
        return calculateTranslationProgress(node, languages, courseNodeMap, currentCourseId);
    }, [node, nodeType, languages, courseNodeMap, findCourseIdByPostId, courses]);

    const handleOpenAiContentDialog = () => {
        if ((nodeType !== "translate" && nodeType !== "lesson") || !findCourseIdByPostId || !courses) {
            return;
        }
        const courseId = findCourseIdByPostId(node.id, courses, nodeType);
        if (!courseId) {
            apiCreateContentAi.showMessage("Không tìm thấy khóa học", "error");
            return;
        }
        setAiDialogCourseId(courseId);
        setAiDialogNodeType(nodeType);
        if (nodeType === "translate") {
            setAiDialogTranslateId(String(node.id));
            setAiDialogLessonId(null);
        } else if (nodeType === "lesson") {
            // Với lesson, cần tìm translate parent
            const translateParent = findTranslateParent(node, courses);
            if (!translateParent || !translateParent.id) {
                apiCreateContentAi.showMessage("Không tìm thấy bản dịch", "error");
                return;
            }
            setAiDialogLessonId(String(node.id));
            setAiDialogTranslateId(String(translateParent.id));
        }
        setAiDialogValue("");
        setAiDialogOpen(true);
    };

    const handleCloseAiContentDialog = () => {
        setAiDialogOpen(false);
        setAiDialogValue("");
        setAiDialogTranslateId(null);
        setAiDialogLessonId(null);
        setAiDialogCourseId(null);
        setAiDialogNodeType(null);
    };

    const handleSubmitAiContent = () => {
        if (!aiDialogCourseId) {
            apiCreateContentAi.showMessage("Thiếu thông tin course", "error");
            return;
        }

        // Với translate: dùng API create-content-course-by-ai
        if (aiDialogNodeType === "translate") {
            if (!aiDialogTranslateId) {
                apiCreateContentAi.showMessage("Thiếu thông tin bản dịch", "error");
                return;
            }
            apiCreateContentAi.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course/create-content-course-by-ai",
                method: "POST",
                data: {
                    course_id: aiDialogCourseId,
                    translate_id: aiDialogTranslateId,
                    content: aiDialogValue.trim(),
                },
                success: () => {
                    handleCloseAiContentDialog();
                },
                error: () => {
                    apiCreateContentAi.showMessage("Không thể tạo nội dung bằng AI", "error");
                },
            });
            return;
        }

        // Với lesson: dùng API create-content-lesson-by-ai
        if (aiDialogNodeType === "lesson") {
            if (!aiDialogLessonId || !aiDialogTranslateId) {
                apiCreateContentAi.showMessage("Thiếu thông tin lesson hoặc bản dịch", "error");
                return;
            }
            apiCreateContentAi.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course/create-content-lesson-by-ai",
                method: "POST",
                data: {
                    course_id: aiDialogCourseId,
                    translate_id: aiDialogTranslateId,
                    lesson_id: aiDialogLessonId,
                    content: aiDialogValue.trim(),
                },
                success: () => {
                    handleCloseAiContentDialog();
                },
                error: () => {
                    apiCreateContentAi.showMessage("Không thể tạo nội dung bằng AI", "error");
                },
            });
            return;
        }
    };

    const handleSyncCourseToFirebase = () => {
        if (nodeType !== "course" || !postId) {
            return;
        }
        apiSyncCourse.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course/sync-course-to-firestore",
            method: "POST",
            data: {
                id: postId,
                course_id: node.id,
            },
            success: () => {
                // API sẽ tự động hiển thị thông báo qua showMessage
            },
            error: () => {
                apiSyncCourse.showMessage("Không thể đồng bộ khóa học lên Firebase", "error");
            },
        });
    };

    return (
        <Box sx={{ position: "relative" }}>
            {/* Đường nối dọc */}
            {depth > 0 && (
                <Box
                    sx={{
                        position: "absolute",
                        left: depth * indentSize - 0.5,
                        top: 0,
                        bottom: isLast ? "50%" : 0,
                        width: 1, // Giảm từ 1.5 xuống 1
                        backgroundColor: "divider",
                        zIndex: 0,
                    }}
                />
            )}

            <ListItem disablePadding sx={{ position: "relative", zIndex: 1 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "stretch",
                        width: "100%",
                        borderRadius: 0.5,
                        mx: 0,
                        mb: 0.5,
                        backgroundColor: backgroundColor,
                        borderLeft: `2px solid ${nodeColor}`,
                        borderTop:
                            depth === 0 ? `1px solid ${nodeColor}` : "none",
                        borderBottom:
                            depth === 0 ? `1px solid ${nodeColor}` : "none",
                        overflow: "hidden",
                    }}
                >
                    {/* Icon order - đặt ở đầu dòng, sát border left */}
                    {dragHandleProps && (
                        <Box
                            {...dragHandleProps}
                            onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                                e.stopPropagation()
                            }
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 40,
                                alignSelf: "stretch",
                                pl: 1,
                                pr: 1,
                                py: 1,
                                color: "text.secondary",
                                cursor: "grab",
                                flexShrink: 0,
                                transition: "background-color 0.2s ease",
                                "&:active": {
                                    cursor: "grabbing",
                                },
                                "&:hover": {
                                    color: nodeColor,
                                    backgroundColor: "rgba(0,0,0,0.05)",
                                },
                            }}
                        >
                            <DragIndicatorIcon sx={{ fontSize: 20 }} />
                        </Box>
                    )}

                    {/* Phần 1: Phần trước label - Click để expand/collapse */}
                    <Box
                        onClick={() => {
                            if (nodeHasChildren) {
                                const newOpen = !open;
                                setOpen(newOpen);
                                const nodeKey = getNodeKey(node);
                                if (newOpen && onExpandNode) {
                                    // Nếu mở node, thêm vào expandedNodes
                                    onExpandNode(nodeKey);
                                } else if (!newOpen && onCollapse) {
                                    // Nếu đóng node, xóa khỏi expandedNodes
                                    onCollapse(nodeKey);
                                }
                            }
                        }}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            pl: paddingLeft,
                            pr: 2,
                            py: 1,
                            cursor: nodeHasChildren ? "pointer" : "default",
                            flexShrink: 0,
                            backgroundColor: nodeHasChildren
                                ? "transparent"
                                : "transparent",
                            transition: "background-color 0.2s ease",
                            "&:hover": {
                                backgroundColor: nodeHasChildren
                                    ? "rgba(0,0,0,0.05)"
                                    : "transparent",
                            },
                        }}
                    >
                        {/* Icon arrow để expand/collapse - chỉ hiển thị khi có children */}
                        {nodeHasChildren ? (
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 20,
                                    height: 20,
                                    color: nodeColor,
                                }}
                            >
                                {open ? (
                                    <ExpandMoreIcon sx={{ fontSize: 18 }} />
                                ) : (
                                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ width: 20, height: 20 }} />
                        )}
                        {/* Folder/File icon */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                color: nodeHasChildren
                                    ? nodeColor
                                    : "text.secondary",
                                flexShrink: 0,
                            }}
                        >
                            {getFolderIcon(nodeHasChildren, open)}
                        </Box>
                    </Box>

                    {/* Button mở rộng tối đa - tách riêng, chỉ hiển thị khi có children */}
                    {nodeHasChildren && onExpandAll && (
                        <Box
                            onClick={(e) => {
                                e.stopPropagation();
                                const nodeKey = getNodeKey(node);
                                onExpandAll(nodeKey);
                            }}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pl: 1,
                                pr: 1,
                                py: 1,
                                minHeight: 40,
                                minWidth: 24,
                                color: nodeColor,
                                cursor: "pointer",
                                borderRadius: 1,
                                transition: "all 0.2s ease",
                                flexShrink: 0,
                                alignSelf: "stretch",
                                "&:hover": {
                                    backgroundColor: "rgba(0,0,0,0.08)",
                                    transform: "scale(1.1)",
                                },
                            }}
                            title="Mở rộng tối đa"
                        >
                            <UnfoldMoreIcon sx={{ fontSize: 18 }} />
                        </Box>
                    )}

                    {/* Phần 2: Phần title và các button - Click vào dòng để thêm (hoặc edit nếu không có children), click vào title để edit */}
                    <ListItemButton
                        onClick={() => {
                            const nodeType = getNodeType(node);
                            // Nếu node không có children (như question), click vào dòng sẽ edit
                            if (!nodeHasChildren) {
                                if (onEditNode) {
                                    onEditNode(node.id, nodeType);
                                }
                            } else {
                                // Click vào dòng sẽ thêm child (chapter, lesson, ...)
                                if (onAddChild) {
                                    const childType = getChildType(nodeType);
                                    if (childType) {
                                        onAddChild(node.id, nodeType, childType);
                                    }
                                }
                            }
                        }}
                        sx={{
                            flex: 1,
                            pr: 0.5,
                            py: 1,
                            minHeight: 40,
                            transition: "all 0.2s ease",
                            cursor: "pointer",
                            "&:hover": {
                                backgroundColor: "action.hover",
                                transform: "translateX(2px)",
                                boxShadow: `0 2px 4px ${nodeColor}30`,
                            },
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                width: "100%",
                                gap: 0.5,
                                flex: 1,
                                minWidth: 0,
                            }}
                        >
                            <Typography
                                variant="body2"
                                onClick={(e) => {
                                    // Click vào title sẽ edit item hiện tại
                                    e.stopPropagation();
                                    if (onEditNode) {
                                        const nodeType = getNodeType(node);
                                        onEditNode(node.id, nodeType);
                                    }
                                }}
                                sx={{
                                    fontWeight: nodeHasChildren ? 600 : 400,
                                    color: nodeHasChildren
                                        ? nodeColor
                                        : "text.primary",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    fontSize:
                                        depth === 0 ? "0.8125rem" : "0.75rem",
                                    cursor: "pointer",
                                    "&:hover": {
                                        textDecoration: "underline",
                                        color: nodeColor,
                                    },
                                }}
                            >
                                {node.title || `Untitled ${getNodeLabel(node)}`}
                            </Typography>
                            <Chip
                                label={getNodeLabel(node)}
                                size="small"
                                sx={{
                                    height: 16,
                                    fontSize: "0.625rem",
                                    minWidth: "auto",
                                    px: 0.5,
                                    backgroundColor: nodeColor,
                                    color: "white",
                                    fontWeight: 500,
                                    border: "none",
                                    flexShrink: 0,
                                }}
                            />
                            {/* Button Add Child sau chip label */}
                            {onAddChild &&
                                (() => {
                                    const nodeType = getNodeType(node);
                                    const childType = getChildType(nodeType);
                                    if (childType) {
                                        const childLabels: Record<
                                            string,
                                            string
                                        > = {
                                            translate: "Thêm Translate",
                                            section: "Thêm Section",
                                            chapter: "Thêm Chapter",
                                            lesson: "Thêm Lesson",
                                            question: "Thêm Question",
                                        };
                                        return (
                                            <Button
                                                size="small"
                                                variant="text"
                                                startIcon={
                                                    <AddIcon
                                                        sx={{ fontSize: 12 }}
                                                    />
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAddChild(
                                                        node.id,
                                                        nodeType,
                                                        childType
                                                    );
                                                }}
                                                sx={{
                                                    fontSize: "0.7rem",
                                                    py: 0.25,
                                                    px: 0.75,
                                                    minWidth: "auto",
                                                    color: nodeColor,
                                                    fontWeight: 500,
                                                    textTransform: "none",
                                                    "&:hover": {
                                                        backgroundColor: `${nodeColor}15`,
                                                    },
                                                }}
                                            >
                                                {childLabels[childType] ||
                                                    `Thêm ${childType}`}
                                            </Button>
                                        );
                                    }
                                    return null;
                                })()}
                            {/* Count indicator */}
                            {nodeHasChildren && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.25,
                                        backgroundColor: "rgba(0,0,0,0.05)",
                                        borderRadius: 0.5,
                                        px: 0.5,
                                        py: 0.125,
                                        flexShrink: 0,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: nodeColor,
                                            fontWeight: 600,
                                            fontSize: "0.625rem",
                                            lineHeight: 1,
                                        }}
                                    >
                                        {open ? "^" : "^"}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: nodeColor,
                                            fontWeight: 600,
                                            fontSize: "0.625rem",
                                            lineHeight: 1,
                                        }}
                                    >
                                        {childrenCount}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                        {/* Thanh tiến trình dịch và Language flags ở cuối dòng */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", flexShrink: 0 }}>
                            {nodeType === "course" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (String(selectedCourseId) === String(node.id)) {
                                                onBackToCourseList && onBackToCourseList();
                                            } else if (onSelectCourseForEdit) {
                                                onSelectCourseForEdit(node.id);
                                            }
                                        }}
                                        sx={{ whiteSpace: "nowrap" }}
                                    >
                                        {String(selectedCourseId) === String(node.id)
                                            ? "<- Danh sách khóa học"
                                            : "Chọn ->"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSyncCourseToFirebase();
                                        }}
                                        disabled={apiSyncCourse.open}
                                        sx={{ whiteSpace: "nowrap" }}
                                    >
                                        {apiSyncCourse.open ? "Đang đồng bộ..." : "Sync to firebase"}
                                    </Button>
                                </>
                            )}
                            {(nodeType === "translate" || nodeType === "lesson") && (
                                <>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenAiContentDialog();
                                        }}
                                        disabled={apiCreateContentAi.open}
                                        sx={{ whiteSpace: "nowrap" }}
                                    >
                                        {apiCreateContentAi.open ? "Đang tạo..." : "Thêm nội dung bằng AI"}
                                    </Button>
                                    {/* Label Sololearn đặt sát bên cạnh button thêm nội dung bằng AI */}
                                    {(() => {
                                        const hasSololearnData =
                                            nodeType === "translate"
                                                ? (node as Translate).data_sololearn
                                                : (node as Lesson).data_sololearn;
                                        return hasSololearnData ? (
                                            <Chip
                                                label="Sololearn"
                                                size="small"
                                                sx={{
                                                    height: 20,
                                                    fontSize: "0.65rem",
                                                    minWidth: "auto",
                                                    px: 0.75,
                                                    backgroundColor: "#ff6b35",
                                                    color: "white",
                                                    fontWeight: 600,
                                                    border: "1px solid #ff8c5a",
                                                    borderRadius: 1,
                                                    boxShadow:
                                                        "0 1px 2px rgba(255, 107, 53, 0.3)",
                                                    flexShrink: 0,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                }}
                                            />
                                        ) : null;
                                    })()}
                                </>
                            )}
                            {/* Thanh tiến trình dịch - đặt trước language flags */}
                            {translationProgress !== null && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                        minWidth: 80,
                                        flexShrink: 0,
                                    }}
                                >
                                    <LinearProgress
                                        variant="determinate"
                                        value={translationProgress}
                                        sx={{
                                            flex: 1,
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: "rgba(0,0,0,0.1)",
                                            "& .MuiLinearProgress-bar": {
                                                borderRadius: 3,
                                                backgroundColor:
                                                    translationProgress === 100
                                                        ? "#4caf50"
                                                        : translationProgress >= 50
                                                        ? "#ff9800"
                                                        : "#f44336",
                                            },
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: "text.secondary",
                                            fontWeight: 600,
                                            fontSize: "0.625rem",
                                            minWidth: 35,
                                            textAlign: "right",
                                        }}
                                    >
                                        {translationProgress}%
                                    </Typography>
                                </Box>
                            )}
                            {/* Language flags ở cuối dòng */}
                            {languages && languages.length > 0 && courseNodeMap && findCourseIdByPostId && courses && (
                                <LanguageFlags
                                    node={node}
                                    languages={languages}
                                    courseNodeMap={courseNodeMap}
                                    courseId={findCourseIdByPostId(node.id, courses, nodeType)}
                                    currentLanguage={currentLanguage}
                                    onEditNode={onEditNode}
                                    onCreateCopyFromEnglish={onCreateCopyFromEnglish}
                                    courses={courses}
                                />
                            )}
                        </Box>
                    </ListItemButton>
                </Box>
            </ListItem>
            <Dialog open={aiDialogOpen} onClose={handleCloseAiContentDialog} fullWidth maxWidth="md">
                <DialogTitle>Thêm nội dung bằng AI</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nội dung"
                        fullWidth
                        multiline
                        minRows={6}
                        value={aiDialogValue}
                        onChange={(e) => setAiDialogValue(e.target.value)}
                        disabled={apiCreateContentAi.open}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAiContentDialog} disabled={apiCreateContentAi.open}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitAiContent}
                        disabled={apiCreateContentAi.open}
                    >
                        {apiCreateContentAi.open ? "Đang gửi..." : "Submit"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Children với đường nối */}
            {nodeHasChildren && (
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <Box sx={{ position: "relative", pl: indentSize }}>
                        {/* Đường nối dọc cho children */}
                        <Box
                            sx={{
                                position: "absolute",
                                left: indentSize / 2 - 0.5,
                                top: 0,
                                bottom: 0,
                                width: 1,
                                backgroundColor: "divider",
                                zIndex: 0,
                            }}
                        />
                        <DragDropContext
                            onDragEnd={(result: DropResult) => {
                                if (!result.destination || !onUpdateOrder)
                                    return;
                                if (
                                    result.source.index ===
                                    result.destination.index
                                )
                                    return;

                                const nodeType = getNodeType(node);
                                onUpdateOrder(
                                    node.id,
                                    nodeType,
                                    result.source.index,
                                    result.destination.index
                                );
                            }}
                        >
                            <Droppable
                                droppableId={`droppable-${node.id}-${nodeType}`}
                            >
                                {(provided) => (
                                    <List
                                        component="div"
                                        disablePadding
                                        sx={{ position: "relative", zIndex: 1 }}
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                    >
                                        {children.map((child: TreeNode, index: number) => (
                                            <Draggable
                                                key={child.id}
                                                draggableId={`draggable-${child.id}`}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <Box
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        sx={{
                                                            ...provided
                                                                .draggableProps
                                                                .style,
                                                            opacity:
                                                                snapshot.isDragging
                                                                    ? 0.8
                                                                    : 1,
                                                            transform:
                                                                snapshot.isDragging
                                                                    ? `${provided.draggableProps.style?.transform} rotate(2deg)`
                                                                    : provided
                                                                          .draggableProps
                                                                          .style
                                                                          ?.transform,
                                                            transition:
                                                                snapshot.isDragging
                                                                    ? "none"
                                                                    : "all 0.2s ease",
                                                        }}
                                                    >
                                                        <CourseTreeItem
                                                            node={child}
                                                            depth={depth + 1}
                                                            isLast={isLastChild(
                                                                index
                                                            )}
                                                            onEditNode={
                                                                onEditNode
                                                            }
                                                            onCreateCopyFromEnglish={
                                                                onCreateCopyFromEnglish
                                                            }
                                                            onAddChild={
                                                                onAddChild
                                                            }
                                                            onUpdateOrder={
                                                                onUpdateOrder
                                                            }
                                                            onSelectCourseForEdit={
                                                                onSelectCourseForEdit
                                                            }
                                                            onBackToCourseList={
                                                                onBackToCourseList
                                                            }
                                                            selectedCourseId={
                                                                selectedCourseId
                                                            }
                                                            dragHandleProps={
                                                                provided.dragHandleProps
                                                            }
                                                            expandedNodes={
                                                                expandedNodes
                                                            }
                                                            onExpandAll={
                                                                onExpandAll
                                                            }
                                                            onCollapse={
                                                                onCollapse
                                                            }
                                                            onExpandNode={
                                                                onExpandNode
                                                            }
                                                            languages={languages}
                                                            courseNodeMap={courseNodeMap}
                                                            findCourseIdByPostId={findCourseIdByPostId}
                                                            courses={courses}
                                                            showAllLanguages={showAllLanguages}
                                                            postId={postId}
                                                        />
                                                    </Box>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </List>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </Box>
                </Collapse>
            )}
        </Box>
    );
}
