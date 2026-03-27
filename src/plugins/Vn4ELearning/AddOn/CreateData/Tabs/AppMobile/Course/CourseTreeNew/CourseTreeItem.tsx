import React from "react";
import Box from "components/atoms/Box";
import List from "components/atoms/List";
import ListItem from "components/atoms/ListItem";
import ListItemButton from "components/atoms/ListItemButton";
import Collapse from "components/atoms/Collapse";
import Typography from "components/atoms/Typography";
import Chip from "components/atoms/Chip";
import Button from "components/atoms/Button";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Checkbox from "components/atoms/Checkbox";
import {
    Droppable,
    Draggable,
    DragDropContext,
    DropResult,
    DraggableProvidedDragHandleProps,
} from "react-beautiful-dnd";
import useAjax from "hook/useApi";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreIcon from "@mui/icons-material/Restore";
import IconButton from "components/atoms/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "components/atoms/Menu";
import MenuItem from "components/atoms/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AnimationIcon from "@mui/icons-material/Animation";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { TreeNode, Course, Lesson, Language, Question, Section, Chapter } from "./types";
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
    parseJsonTitle,
    parseCourseLogoUrl,
    calculateNodeProgress,
    calculateTotalLessonFlashcards,
    getCourseLabelsViOrEn,
    getLessonIndexInSection,
    parseNumberChatAi,
} from "./utils";
import useStreamSync, { extractMessageString } from "hook/useStreamSync";
import SyncProgressDialog from "components/molecules/SyncProgressDialog";
import useConfirmDialog from "hook/useConfirmDialog";

export interface ParentContext {
    courseId?: string | number;
    courseKey?: string;
    sectionId?: string | number;
    chapterId?: string | number;
    sectionNode?: Section;
}

interface CourseTreeItemProps {
    node: TreeNode;
    depth?: number;
    isLast?: boolean;
    onEditNode?: (nodeId: string | number, nodeType: string) => void;
    onSelectCourseForEdit?: (courseId: string | number) => void;
    onBackToCourseList?: () => void;
    selectedCourseId?: string | number | null;
    index?: number;
    isFlatMode?: boolean;
    onAddChild?: (
        parentId: string | number,
        parentType: string,
        childType: string
    ) => void;
    onUpdateOrder?: (
        parentId: string | number,
        parentType: string,
        sourceIndex: number,
        destinationIndex: number
    ) => void;
    dragHandleProps?: DraggableProvidedDragHandleProps | null;
    expandedNodes?: Set<string>;
    onExpandAll?: (nodeKey: string) => void;
    onCollapse?: (nodeKey: string) => void;
    onExpandNode?: (nodeKey: string) => void;
    languages?: Language[];
    currentLanguageCode: string;
    parentContext?: ParentContext;
    postId?: string | number;
    onReloadCourses?: () => void;
    onUpdateLessonStatus?: (lessonId: string | number, isFinalTest: boolean) => void;
    onPreviewLesson?: (node: Lesson) => void;
}

function CourseTreeItem({
    node,
    depth = 0,
    isLast = false,
    onEditNode,
    onAddChild,
    onUpdateOrder,
    onSelectCourseForEdit,
    onBackToCourseList,
    selectedCourseId,
    index,
    dragHandleProps,
    expandedNodes,
    onExpandAll,
    onCollapse,
    onExpandNode,
    languages,
    currentLanguageCode,
    parentContext,
    postId,
    onReloadCourses,
    onUpdateLessonStatus,
    onPreviewLesson,
    isFlatMode = false,
}: CourseTreeItemProps) {
    const apiSetFinalTest = useAjax();
    const apiSyncCourse = useAjax();
    const apiPermanentDelete = useAjax();
    const [open, setOpen] = React.useState(false);
    const [syncProgressDialogOpen, setSyncProgressDialogOpen] = React.useState(false);
    const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = React.useState(false);
    const streamSync = useStreamSync();

    const confirmSync = useConfirmDialog({
        title: "Xác nhận đồng bộ khóa học",
        message: "Bạn có chắc chắn muốn đồng bộ khóa học này lên Firebase?",
    });

    const nodeType = getNodeType(node);

    const [anchorElApi, setAnchorElApi] = React.useState<null | HTMLElement>(null);
    const openMenuApi = Boolean(anchorElApi);

    const handleOpenMenuApi = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorElApi(event.currentTarget);
    };

    const handleCloseMenuApi = () => {
        setAnchorElApi(null);
    };

    const prefixLink = 'https://spacedev-app.s3.ap-southeast-1.amazonaws.com/uploads/course_data/courses';
    const courseKey = (nodeType === 'course' ? (node as Course).key : parentContext?.courseKey) || '';

    const apiLinks = React.useMemo(() => {
        if (!courseKey) return [];
        const links: { title: string; url: string; flag?: string }[] = [];

        if (nodeType === "course") {
            // Config chung của course
            links.push({
                title: "Config khóa học",
                url: `${prefixLink}/${courseKey}/info.json`,
            });

            // Config theo từng ngôn ngữ
            languages?.forEach((lang) => {
                links.push({
                    title: `Cấu trúc (${lang.title})`,
                    url: `${prefixLink}/${courseKey}/translate/${lang.code}/info.json`,
                    flag: lang.flag_code,
                });
                links.push({
                    title: `Flash card (${lang.title})`,
                    url: `${prefixLink}/${courseKey}/translate/${lang.code}/flash_card.json`,
                    flag: lang.flag_code,
                });
            });
        } else if (nodeType === "chapter") {
            // Ví dụ:
            // https://spacedev-app.s3.ap-southeast-1.amazonaws.com/uploads/course_data/courses/vibe_coding/translate/en/chapters/chapter_1_welcome_to_the_world_of_vibe_coding_and_ai_assisted_development.json
            const chapterKey = (node as Chapter).key || "";
            if (chapterKey) {
                languages?.forEach((lang) => {
                    links.push({
                        title: `Chapter (${lang.title})`,
                        url: `${prefixLink}/${courseKey}/translate/${lang.code}/chapters/${chapterKey}.json`,
                        flag: lang.flag_code,
                    });
                });
            }
        } else if (nodeType === "lesson") {
            // Ví dụ:
            // https://spacedev-app.s3.ap-southeast-1.amazonaws.com/uploads/course_data/courses/vibe_coding/translate/en/lessons/lesson_131_what_is_version_control_and_why_do_we_need_it/info.json
            const lessonKey = (node as Lesson).key || "";
            if (lessonKey) {
                languages?.forEach((lang) => {
                    links.push({
                        title: `Nội dung bài học (${lang.title})`,
                        url: `${prefixLink}/${courseKey}/translate/${lang.code}/lessons/lesson_${lessonKey}/info.json`,
                        flag: lang.flag_code,
                    });
                    links.push({
                        title: `Flash card bài học (${lang.title})`,
                        url: `${prefixLink}/${courseKey}/translate/${lang.code}/lessons/lesson_${lessonKey}/flash_card.json`,
                        flag: lang.flag_code,
                    });
                });
            }
        }

        return links;
    }, [nodeType, node, courseKey, languages]);


    const handleSyncCourseToFirebase = () => {
        if (nodeType !== "course" || !postId) {
            return;
        }

        confirmSync.onConfirm(() => {
            setSyncProgressDialogOpen(true);
            streamSync.reset();

            streamSync.sync({
                url: "plugin/vn4-e-learning/app-mobile/course-new/sync-course-to-firestore",
                data: {
                    id: String(postId),
                    course_id: node.id,
                },
                onProgress: (data) => {
                    // Progress handled by hook
                },
                onComplete: (data) => {
                    const message = extractMessageString(data.message) || "Đồng bộ khóa học lên Firebase thành công";
                    apiSyncCourse.showMessage(message, "success");
                },
                onError: (error) => {
                    apiSyncCourse.showMessage(
                        error || "Không thể đồng bộ khóa học lên Firebase",
                        "error"
                    );
                },
            });
        });
    };

    React.useEffect(() => {
        if (expandedNodes) {
            const nodeKey = getNodeKey(node);
            const isInExpandedNodes = expandedNodes.has(nodeKey);
            if (isInExpandedNodes && !open) {
                setOpen(true);
            } else if (!isInExpandedNodes && open) {
                setOpen(false);
            }
        }
    }, [expandedNodes, node]);

    let nodeHasChildren = hasChildren(node);
    const childrenCount = getChildrenCount(node);
    const nodeColor = getNodeColor(node);
    const lessonIndexInSection = nodeType === "lesson" && parentContext?.sectionNode
        ? getLessonIndexInSection(node as Lesson, parentContext.sectionNode)
        : -1;
    const isMissingReward = nodeType === "lesson" && lessonIndexInSection >= 0 && (lessonIndexInSection + 1) % 5 === 4;
    const isTrash = (node as { status?: string }).status === 'trash';
    const isCompleted = (nodeType === 'lesson' || nodeType === 'course') && (node as Lesson | Course).is_completed;
    // Nếu là course và hiện tại chưa có children trong cấu trúc,
    // sử dụng thông tin summary (count_section) để quyết định hiển thị icon expand/collapse.
    if (!nodeHasChildren && nodeType === "course") {
        const courseNode = node as Course;
        let summaryData = courseNode.summary_data;
        if (typeof summaryData === "string") {
            try {
                summaryData = JSON.parse(summaryData);
            } catch (e) {
                summaryData = undefined;
            }
        }
        const summary = summaryData as {
            count_section?: number;
        } | undefined;

        if (summary && (summary.count_section || 0) > 0) {
            nodeHasChildren = true;
        }
    }

    const backgroundColor = isTrash ? "#ffebee" : (isCompleted ? "#e8f5e9" : (isMissingReward ? "hsla(0, 0%, 0%, 0.15)" : getNodeBackgroundColor(node, depth)));
    const indentSize = 5;
    const basePadding = nodeType === "question" ? 8 : 2;
    const paddingLeft = depth > 0 ? depth * indentSize + basePadding : basePadding;

    const children = getChildren(node);

    const title = parseJsonTitle((node as Course).title || "", currentLanguageCode);
    const isChapterMissingColorHex = nodeType === "chapter" && !(node as Chapter).colorHex?.trim();
    const nodeTypeChipLabel = isChapterMissingColorHex ? "Yêu cầu update colorHex" : getNodeLabel(node);
    const chapterColorHex = nodeType === "chapter" ? (node as Chapter).colorHex?.trim() : undefined;

    // Calculate context for children
    const childContext: ParentContext = React.useMemo(() => {
        const ctx: ParentContext = { ...parentContext };
        if (nodeType === 'course') {
            ctx.courseId = node.id;
            ctx.courseKey = (node as Course).key;
        }
        if (nodeType === 'section') {
            ctx.sectionId = node.id;
            ctx.sectionNode = node as Section;
        }
        if (nodeType === 'chapter') ctx.chapterId = node.id;
        return ctx;
    }, [node.id, nodeType, parentContext, (node as Course).key]);

    const isFinalTestLesson = nodeType === "lesson" && Boolean((node as Lesson).is_final_test);

    const handleSetFinalTest = () => {
        if (nodeType !== "lesson") return;
        const lessonId = String(node.id);

        if (!parentContext || !parentContext.chapterId) {
            apiSetFinalTest.showMessage("Không tìm thấy chương của bài học", "error");
            return;
        }

        apiSetFinalTest.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/set-final-test",
            method: "POST",
            data: {
                id: postId,
                lesson_id: lessonId,
                chapter_id: parentContext.chapterId,
                section_id: parentContext.sectionId,
                course_id: parentContext.courseId,
            },
            success: () => {
                if (onUpdateLessonStatus) {
                    onUpdateLessonStatus(node.id, !isFinalTestLesson);
                } else if (onReloadCourses) {
                    onReloadCourses();
                }
            },
        });
    };

    const handleTrashOrRestoreNode = () => {
        const supportedTypes = ["lesson", "section", "chapter", "course", "question"];
        if (!supportedTypes.includes(nodeType)) return;

        const currentNode = node as Lesson | Section | Chapter | Course | Question;
        const isTrash = currentNode.status === "trash";

        const url = "plugin/vn4-e-learning/app-mobile/course-new/trash-post";

        interface TrashParams {
            id: string | number | undefined;
            action: string;
            type: string;
            post_id: string | number;
        }

        const params: TrashParams = {
            id: postId,
            action: isTrash ? "restore" : "trash",
            type: nodeType,
            post_id: node.id,
        };

        apiSetFinalTest.ajax({
            url: url,
            method: "POST",
            data: params,
            success: () => {
                if (onReloadCourses) {
                    onReloadCourses();
                }
            },
        });
    };

    const handlePermanentDelete = () => {
        const supportedTypes = ["lesson", "section", "chapter", "course", "question"];
        if (!supportedTypes.includes(nodeType)) return;

        const url = "plugin/vn4-e-learning/app-mobile/course-new/permanent-delete-post";

        interface PermanentDeleteParams {
            id: string | number | undefined;
            type: string;
            post_id: string | number;
        }

        const params: PermanentDeleteParams = {
            id: postId,
            type: nodeType,
            post_id: node.id,
        };

        apiPermanentDelete.ajax({
            url: url,
            method: "POST",
            data: params,
            success: () => {
                setDeleteConfirmDialogOpen(false);
                if (onReloadCourses) {
                    onReloadCourses();
                }
            },
            error: () => {
                apiPermanentDelete.showMessage(`Không thể xóa vĩnh viễn ${getNodeLabel(node)}`, "error");
            },
        });
    };

    return (
        <Box sx={{ position: "relative" }}>
            <ListItem disablePadding sx={{ position: "relative", zIndex: 1 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "stretch",
                        width: "100%",
                        borderRadius: 1,
                        mb: 0.5,
                        backgroundColor: backgroundColor,
                        borderLeft: `3px solid ${nodeColor}`,
                        borderRight: (node as Course | Lesson).link_data_craw_json ? `3px solid ${nodeColor}` : undefined,
                        overflow: "hidden",
                        ml: paddingLeft,
                        transition: "all 0.2s ease",
                        "&:hover": {
                            boxShadow: `0 2px 8px ${nodeColor}20`,
                            transform: "translateX(2px)",
                        },
                    }}
                >
                    {dragHandleProps && (
                        <Box
                            {...dragHandleProps}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minWidth: 40,
                                color: "text.secondary",
                                cursor: "grab",
                                "&:hover": {
                                    color: nodeColor,
                                    backgroundColor: "rgba(0,0,0,0.05)",
                                },
                            }}
                        >
                            <DragIndicatorIcon sx={{ fontSize: 20 }} />
                        </Box>
                    )}

                    <Box
                        onClick={() => {
                            if (nodeHasChildren) {
                                const newOpen = !open;
                                setOpen(newOpen);
                                const nodeKey = getNodeKey(node);
                                if (newOpen && onExpandNode) {
                                    onExpandNode(nodeKey);
                                } else if (!newOpen && onCollapse) {
                                    onCollapse(nodeKey);
                                }
                            }
                        }}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            px: 1,
                            py: 1,
                            cursor: nodeHasChildren ? "pointer" : "default",
                            flexShrink: 0,
                            "&:hover": {
                                backgroundColor: nodeHasChildren
                                    ? "rgba(0,0,0,0.05)"
                                    : "transparent",
                            },
                        }}
                    >
                        {nodeHasChildren ? (
                            <Box sx={{ display: "flex", color: nodeColor }}>
                                {open ? (
                                    <ExpandMoreIcon sx={{ fontSize: 20 }} />
                                ) : (
                                    <ChevronRightIcon sx={{ fontSize: 20 }} />
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ width: 20 }} />
                        )}
                    </Box>

                    {nodeHasChildren && onExpandAll ? (
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
                                px: 1,
                                py: 1,
                                color: nodeColor,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                flexShrink: 0,
                                "&:hover": {
                                    backgroundColor: "rgba(0,0,0,0.08)",
                                    transform: "scale(1.1)",
                                },
                            }}
                            title="Mở rộng tối đa"
                        >
                            <UnfoldMoreIcon sx={{ fontSize: 18 }} />
                        </Box>
                    ) : (
                        <Box sx={{ width: 34, flexShrink: 0 }} /> // Placeholder for alignment
                    )}

                    <ListItemButton
                        onClick={() => {
                            if (onEditNode) onEditNode(node.id, nodeType);
                        }}
                        sx={{
                            flex: 1,
                            py: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1.5
                        }}
                    >
                        {/* LEFT SIDE: Title, Checkbox, Badge, Add Button, Count */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flex: 1, flexWrap: "wrap" }}>
                            <Box sx={{ color: nodeHasChildren ? nodeColor : "text.secondary", display: 'flex' }}>
                                {getFolderIcon(nodeHasChildren, open)}
                            </Box>
                            {nodeType === "course" && (() => {
                                const logoUrl = parseCourseLogoUrl((node as Course).logo);
                                if (!logoUrl) return null;
                                return (
                                    <Box
                                        component="img"
                                        src={logoUrl}
                                        alt=""
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            objectFit: "cover",
                                            borderRadius: 1.5,
                                            flexShrink: 0,
                                        }}
                                    />
                                );
                            })()}
                            {nodeType === "lesson" && (
                                <Checkbox
                                    size="small"
                                    checked={isFinalTestLesson}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        handleSetFinalTest();
                                    }}
                                    sx={{ p: 0.5 }}
                                />
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography
                                        variant="body2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditNode) onEditNode(node.id, nodeType);
                                        }}
                                        sx={{
                                            fontWeight: (node as ANY).status === 'trash' ? "bold" : (nodeHasChildren ? 600 : 400),
                                            color: (node as ANY).status === 'trash' ? "error.main" : (nodeHasChildren ? nodeColor : (
                                                nodeType === "question"
                                                    ? ((node as Question).verify ? "success.main" : "error.main")
                                                    : "text.primary"
                                            )),
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            "&:hover": { textDecoration: "underline" },
                                        }}
                                    >
                                        {nodeType === 'question' && typeof index === 'number' ? `${index + 1}. ` : ''}
                                        {title || `Untitled ${getNodeLabel(node)}`}
                                        {(node as ANY).status === 'trash' && " - Deleted"}
                                    </Typography>

                                    {nodeType === "course" && (node as Course).isComingSoon ? (
                                        <Chip
                                            label="Coming Soon"
                                            size="small"
                                            sx={{
                                                height: 16,
                                                fontSize: "0.625rem",
                                                backgroundColor: "warning.main",
                                                color: "white",
                                                fontWeight: 600,
                                                cursor: "default",
                                            }}
                                        />
                                    ) : null}

                                    {nodeType === "course" && (() => {
                                        const labels = getCourseLabelsViOrEn(node as Course);
                                        if (!labels.length) return null;
                                        return (
                                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                                {labels.map((label, idx) => (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            px: 0.75,
                                                            py: 0.25,
                                                            borderRadius: 16,
                                                            fontSize: "0.7rem",
                                                            fontWeight: 600,
                                                            color: label.color || "#ffffff",
                                                            backgroundColor: label.background_color || "#1976d2",
                                                            maxWidth: 160,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {label.title}
                                                    </Box>
                                                ))}
                                            </Box>
                                        );
                                    })()}

                                    <Chip
                                        label={nodeTypeChipLabel}
                                        size="small"
                                        sx={{
                                            height: 16,
                                            fontSize: "0.625rem",
                                            backgroundColor: chapterColorHex || nodeColor,
                                            color: "white",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditNode) onEditNode(node.id, nodeType);
                                        }}
                                    />

                                    {Boolean((node as ANY).isPublished) && (
                                        <Chip
                                            label="Published"
                                            size="small"
                                            sx={{
                                                height: 16,
                                                fontSize: "0.625rem",
                                                backgroundColor: "success.main",
                                                color: "white",
                                                fontWeight: 600,
                                                cursor: "default",
                                            }}
                                        />
                                    )}

                                    {nodeType === "lesson" && ((node as Lesson).special?.active) && (
                                        <Box
                                            sx={{
                                                p: '4px 8px',
                                                backgroundColor: "#289303",
                                                borderRadius: '32px',
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src="/images/gift_box.png"
                                                alt="gift"
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    objectFit: "contain",
                                                }}
                                            />
                                            {
                                                (node as Lesson).special?.lessonId ?
                                                    <Typography sx={{ color: "white" }}>Thử thách</Typography>
                                                    :
                                                    <Typography sx={{ color: "white" }}>Phần thưởng miễn phí</Typography>
                                            }
                                        </Box>
                                    )}
                                    {isMissingReward && !((node as Lesson).special?.active) && (
                                        <Box
                                            sx={{
                                                p: '4px 8px',
                                                backgroundColor: "#d32f2f",
                                                borderRadius: '32px',
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                            }}
                                        >
                                            <Box
                                                component="img"
                                                src="/images/gift_box.png"
                                                alt="gift"
                                                sx={{
                                                    width: 24,
                                                    height: 24,
                                                    objectFit: "contain",
                                                }}
                                            />
                                            <Typography sx={{ color: "white" }}>Node chưa có phần thưởng</Typography>
                                        </Box>
                                    )}
                                </Box>
                                {nodeType === 'course' && (() => {
                                    const courseNode = node as Course;
                                    let summaryData = courseNode.summary_data;
                                    if (typeof summaryData === 'string') {
                                        try {
                                            summaryData = JSON.parse(summaryData);
                                        } catch (e) {
                                            summaryData = {};
                                        }
                                    }
                                    const summary = summaryData as {
                                        count_section?: number;
                                        count_chapter?: number;
                                        count_lesson?: number;
                                        count_lesson_no_question?: number;
                                        count_question?: number;
                                    };

                                    if (!summary) return null;

                                    return (
                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: "wrap" }}>
                                            <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                                                Sections: <b>{summary.count_section || 0}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                                                Chapters: <b>{summary.count_chapter || 0}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                                                Lessons: <b>{summary.count_lesson || 0}</b>
                                                {!!summary.count_lesson_no_question && (
                                                    <Box component="span" sx={{ color: "warning.main", ml: 0.5, fontWeight: 500 }}>
                                                        ({summary.count_lesson_no_question} empty)
                                                    </Box>
                                                )}
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
                                                Questions: <b>{summary.count_question || 0}</b>
                                            </Typography>
                                        </Box>
                                    );
                                })()}
                            </Box>


                            {/* Flashcard badges cho Course & Lesson */}
                            {nodeType === "course" && (() => {
                                const courseNode = node as Course;
                                const x = courseNode.count_app_course_flashcard || 0;
                                const y = calculateTotalLessonFlashcards(courseNode);

                                if (x > 0 || y > 0) {
                                    return (
                                        <Box
                                            sx={{
                                                p: '4px 8px',
                                                backgroundColor: "#1976d2",
                                                borderRadius: '32px',
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 1,
                                                mr: 1
                                            }}
                                        >
                                            <Typography sx={{ color: "white", fontSize: "0.75rem" }}>
                                                {x} course | {y} lesson Flash card
                                            </Typography>
                                        </Box>
                                    );
                                }
                                return null;
                            })()}

                            {nodeType === "lesson" && ((node as Lesson).count_app_course_flashcard || 0) > 0 && (
                                <Box
                                    sx={{
                                        p: '4px 8px',
                                        backgroundColor: "#1976d2",
                                        borderRadius: '32px',
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        mr: 1
                                    }}
                                >
                                    <Typography sx={{ color: "white", fontSize: "0.75rem" }}>
                                        {((node as Lesson).count_app_course_flashcard)} Flash card
                                    </Typography>
                                </Box>
                            )}

                            {/* Text số câu hỏi chưa verify cho từng cấp (giống style summary counts) */}
                            {nodeType === "course" && (node as Course).count_question_not_verify ? (
                                <Typography
                                    variant="caption"
                                    sx={{ fontSize: "0.7rem", color: "error.main", fontWeight: 600, mr: 1 }}
                                >
                                    {(node as Course).count_question_not_verify} questions not verified
                                </Typography>
                            ) : null}

                            {nodeType === "section" && (node as Section).count_question_not_verify ? (
                                <Typography
                                    variant="caption"
                                    sx={{ fontSize: "0.7rem", color: "error.main", mr: 1 }}
                                >
                                    {(node as Section).count_question_not_verify} questions not verified
                                </Typography>
                            ) : null}

                            {nodeType === "chapter" && (node as Chapter).count_question_not_verify ? (
                                <Typography
                                    variant="caption"
                                    sx={{ fontSize: "0.7rem", color: "error.main", mr: 1 }}
                                >
                                    {(node as Chapter).count_question_not_verify} questions not verified
                                </Typography>
                            ) : null}

                            {nodeType === "lesson" && (node as Lesson).count_question_not_verify ? (
                                <Typography
                                    variant="caption"
                                    sx={{ fontSize: "0.7rem", color: "error.main", mr: 1 }}
                                >
                                    {(node as Lesson).count_question_not_verify} questions not verified
                                </Typography>
                            ) : null}

                            {/* Rive image count - hiển thị tinh tế khi có giá trị */}
                            {nodeType === "course" && ((node as Course).number_rive_image ?? 0) > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                                    <AnimationIcon sx={{ fontSize: 14, color: "error.main" }} />
                                    <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "error.main", fontWeight: 500 }}>
                                        {(node as Course).number_rive_image} Rive
                                    </Typography>
                                </Box>
                            )}
                            {nodeType === "section" && ((node as Section).number_rive_image ?? 0) > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                                    <AnimationIcon sx={{ fontSize: 14, color: "error.main" }} />
                                    <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "error.main", fontWeight: 500 }}>
                                        {(node as Section).number_rive_image} Rive
                                    </Typography>
                                </Box>
                            )}
                            {nodeType === "chapter" && ((node as Chapter).number_rive_image ?? 0) > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                                    <AnimationIcon sx={{ fontSize: 14, color: "error.main" }} />
                                    <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "error.main", fontWeight: 500 }}>
                                        {(node as Chapter).number_rive_image} Rive
                                    </Typography>
                                </Box>
                            )}
                            {nodeType === "lesson" && ((node as Lesson).number_rive_image ?? 0) > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                                    <AnimationIcon sx={{ fontSize: 14, color: "error.main" }} />
                                    <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "error.main", fontWeight: 500 }}>
                                        {(node as Lesson).number_rive_image} Rive
                                    </Typography>
                                </Box>
                            )}

                            {/* Chat AI count - format "[notResponse]/[total]" hoặc "0" hoặc number (legacy) */}
                            {(nodeType === "course" || nodeType === "section" || nodeType === "chapter" || nodeType === "lesson") && (() => {
                                const p = parseNumberChatAi((node as Course | Section | Chapter | Lesson).number_chat_ai);
                                if (!p.hasChatAi) return null;
                                const chatColor = p.isAllComplete ? "success.main" : "#610bd9";
                                return (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1 }}>
                                        <SmartToyIcon sx={{ fontSize: 14, color: chatColor }} />
                                        <Typography variant="caption" sx={{ fontSize: "0.7rem", color: chatColor, fontWeight: 500 }}>
                                            {p.displayText}
                                        </Typography>
                                    </Box>
                                );
                            })()}

                            {onAddChild && (() => {
                                const childType = getChildType(nodeType);
                                if (childType) {
                                    return (
                                        <Button
                                            size="small"
                                            variant="text"
                                            startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddChild(node.id, nodeType, childType);
                                            }}
                                            sx={{
                                                textTransform: "none",
                                                color: nodeColor,
                                                fontSize: "0.75rem",
                                                minWidth: "auto",
                                                px: 1,
                                                "&:hover": { backgroundColor: `${nodeColor}15` }
                                            }}
                                        >
                                            Add {childType.charAt(0).toUpperCase() + childType.slice(1)}
                                        </Button>
                                    );
                                }
                                return null;
                            })()}

                            {nodeHasChildren && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        backgroundColor: "rgba(0,0,0,0.05)",
                                        borderRadius: 1,
                                        px: 0.5,
                                        py: 0.1,
                                    }}
                                >
                                    <Typography variant="caption" sx={{ color: nodeColor, fontWeight: 700, fontSize: "0.6rem" }}>
                                        {childrenCount}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* RIGHT SIDE: Delete Button (for Questions) and Sync Button (for Courses) */}
                        <Box sx={{ display: "flex", alignItems: "center", marginLeft: "auto", paddingLeft: 1, gap: 1 }}>
                            {/* Progress Bar */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 1 }}>
                                <Box sx={{ width: 60, height: 4, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
                                    <Box
                                        sx={{
                                            width: `${calculateNodeProgress(node, languages || [])}%`,
                                            height: '100%',
                                            bgcolor: calculateNodeProgress(node, languages || []) === 100 ? 'success.main' : 'warning.main',
                                            transition: 'width 0.3s ease'
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary', minWidth: 24, textAlign: 'right' }}>
                                    {calculateNodeProgress(node, languages || [])}%
                                </Typography>
                            </Box>

                            {nodeType === "course" && (
                                <>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (String(selectedCourseId) === String(node.id)) {
                                                if (onBackToCourseList) onBackToCourseList();
                                            } else if (onSelectCourseForEdit) {
                                                onSelectCourseForEdit(String(node.id));
                                            }
                                        }}
                                        sx={{
                                            textTransform: "none",
                                            fontSize: "0.75rem",
                                            py: 0.5,
                                            mr: 1,
                                            whiteSpace: "nowrap"
                                        }}
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
                                        disabled={streamSync.isSyncing}
                                        sx={{
                                            textTransform: "none",
                                            fontSize: "0.75rem",
                                            py: 0.5,
                                            mr: 1
                                        }}
                                        endIcon={<SyncIcon />}
                                    >
                                        {streamSync.isSyncing ? "Syncing..." : "Sync to Firebase"}
                                    </Button>
                                </>
                            )}
                            {nodeType === "lesson" && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<FactCheckIcon sx={{ fontSize: 16 }} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onPreviewLesson) onPreviewLesson(node as Lesson);
                                    }}
                                    sx={{
                                        textTransform: "none",
                                        fontSize: "0.75rem",
                                        py: 0.5,
                                        mr: 1,
                                        whiteSpace: "nowrap",
                                        borderColor: "success.main",
                                        color: "success.main",
                                        '&:hover': {
                                            borderColor: "success.dark",
                                            backgroundColor: "success.light",
                                        }
                                    }}
                                >
                                    Preview
                                </Button>
                            )}
                            {(nodeType === "lesson" || nodeType === "section" || nodeType === "chapter" || nodeType === "course") && (
                                <>
                                    {apiLinks.length > 0 && (
                                        <IconButton
                                            size="small"
                                            onClick={handleOpenMenuApi}
                                            sx={{ color: "text.secondary", p: 0.5 }}
                                            title="API Links"
                                        >
                                            <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTrashOrRestoreNode();
                                        }}
                                        sx={{
                                            color: (node as Lesson | Section | Chapter | Course).status === "trash" ? "#1976d2" : "#d32f2f",
                                            p: 0.5,
                                        }}
                                    >
                                        {(node as Lesson | Section | Chapter | Course).status === "trash" ? <RestoreIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
                                    </IconButton>
                                    {(node as Lesson | Section | Chapter | Course).status === "trash" && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmDialogOpen(true);
                                            }}
                                            disabled={apiPermanentDelete.open}
                                            sx={{
                                                color: "#d32f2f",
                                                p: 0.5,
                                            }}
                                            title={`Xóa vĩnh viễn ${getNodeLabel(node)}`}
                                        >
                                            <DeleteForeverIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </>
                            )}
                            {nodeType === "question" && (
                                <>
                                    {apiLinks.length > 0 && (
                                        <IconButton
                                            size="small"
                                            onClick={handleOpenMenuApi}
                                            sx={{ color: "text.secondary", p: 0.5 }}
                                            title="API Links"
                                        >
                                            <MoreVertIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTrashOrRestoreNode();
                                        }}
                                        sx={{
                                            color: (node as Question).status === "trash" ? "#1976d2" : "#d32f2f",
                                            p: 0.5,
                                        }}
                                    >
                                        {(node as Question).status === "trash" ? <RestoreIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
                                    </IconButton>
                                    {(node as Question).status === "trash" && (
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmDialogOpen(true);
                                            }}
                                            disabled={apiPermanentDelete.open}
                                            sx={{
                                                color: "#d32f2f",
                                                p: 0.5,
                                            }}
                                            title={`Xóa vĩnh viễn ${getNodeLabel(node)}`}
                                        >
                                            <DeleteForeverIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </>
                            )}
                        </Box>
                    </ListItemButton>
                </Box>
            </ListItem>

            {nodeHasChildren && !isFlatMode && (
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <Box sx={{ position: "relative" }}>
                        <Box
                            sx={{
                                position: "absolute",
                                left: 10, // Center under the expand icon
                                top: 0,
                                bottom: 0,
                                width: 1,
                                backgroundColor: "divider",
                                zIndex: 0,
                            }}
                        />
                        <DragDropContext
                            onDragEnd={(result: DropResult) => {
                                if (!result.destination || !onUpdateOrder) return;
                                if (result.source.index === result.destination.index) return;

                                onUpdateOrder(
                                    node.id,
                                    nodeType,
                                    result.source.index,
                                    result.destination.index
                                );
                            }}
                        >
                            <Droppable droppableId={`droppable-${node.id}`} type={getChildType(nodeType) || ""}>
                                {(provided) => (
                                    <List
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        disablePadding
                                        sx={{ position: "relative", zIndex: 1, pl: 2.5 }}
                                    >
                                        {(() => {
                                            let validIndexCounter = 0;
                                            return children.map((child, index) => {
                                                const isTrash = (child as { status?: string }).status === 'trash';
                                                const validIndex = isTrash ? -1 : validIndexCounter++;
                                                return (
                                                    <Draggable
                                                        key={getNodeKey(child)}
                                                        draggableId={getNodeKey(child)}
                                                        index={index}
                                                    >
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                            >
                                                                <CourseTreeItem
                                                                    key={getNodeKey(child)}
                                                                    node={child}
                                                                    depth={depth + 1}
                                                                    isLast={index === children.length - 1}
                                                                    onEditNode={onEditNode}
                                                                    onAddChild={onAddChild}
                                                                    onUpdateOrder={onUpdateOrder}
                                                                    dragHandleProps={provided.dragHandleProps}
                                                                    expandedNodes={expandedNodes}
                                                                    onExpandAll={onExpandAll}
                                                                    onExpandNode={onExpandNode}
                                                                    onCollapse={onCollapse}
                                                                    currentLanguageCode={currentLanguageCode}
                                                                    languages={languages}
                                                                    parentContext={childContext}
                                                                    postId={postId}
                                                                    onReloadCourses={onReloadCourses}
                                                                    onUpdateLessonStatus={onUpdateLessonStatus}
                                                                    onSelectCourseForEdit={onSelectCourseForEdit}
                                                                    onBackToCourseList={onBackToCourseList}
                                                                    selectedCourseId={selectedCourseId}
                                                                    index={validIndex}
                                                                    onPreviewLesson={onPreviewLesson}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            });
                                        })()}
                                        {provided.placeholder}
                                    </List>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </Box>
                </Collapse>
            )}

            {confirmSync.component}

            <SyncProgressDialog
                open={syncProgressDialogOpen}
                onClose={() => setSyncProgressDialogOpen(false)}
                progress={streamSync.progress}
                currentStage={streamSync.currentStage}
                messages={streamSync.messages}
                error={streamSync.error}
                isSyncing={streamSync.isSyncing}
                totalObjects={streamSync.totalObjects}
                completedObjects={streamSync.completedObjects}
                warnings={streamSync.warnings}
            />

            {/* Dialog xác nhận xóa vĩnh viễn */}
            <Dialog
                open={deleteConfirmDialogOpen}
                onClose={() => setDeleteConfirmDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{ color: "error.main" }}>
                    Xác nhận xóa vĩnh viễn
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Bạn có chắc chắn muốn xóa vĩnh viễn {getNodeLabel(node)} này không?
                        Hành động này không thể hoàn tác.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteConfirmDialogOpen(false)}
                        disabled={apiPermanentDelete.open}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handlePermanentDelete}
                        disabled={apiPermanentDelete.open}
                    >
                        {apiPermanentDelete.open ? "Đang xóa..." : "Xóa vĩnh viễn"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Menu
                anchorEl={anchorElApi}
                open={openMenuApi}
                onClose={handleCloseMenuApi}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
                {apiLinks.map((link, idx) => (
                    <MenuItem
                        key={idx}
                        onClick={() => {
                            window.open(link.url, '_blank');
                            handleCloseMenuApi();
                        }}
                    >
                        {link.flag && (
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <img
                                    src={`https://flagcdn.com/w20/${link.flag}.png`}
                                    alt=""
                                    style={{ width: 20, height: 15, objectFit: "cover" }}
                                />
                            </ListItemIcon>
                        )}
                        <ListItemText
                            primary={link.title}
                            primaryTypographyProps={{ variant: 'body2' }}
                        />
                        <OpenInNewIcon sx={{ fontSize: 14, ml: 1, color: 'text.disabled' }} />
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
}

export default CourseTreeItem;
