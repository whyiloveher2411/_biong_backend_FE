import React, { memo } from "react";
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
import RestoreIcon from "@mui/icons-material/Restore";
import IconButton from "components/atoms/IconButton";
import { TreeNode, Course, Lesson, Language, Question } from "./types";
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
    calculateNodeProgress,
    calculateTotalLessonFlashcards,
} from "./utils";
import useStreamSync, { extractMessageString } from "hook/useStreamSync";
import SyncProgressDialog from "components/molecules/SyncProgressDialog";
import useConfirmDialog from "hook/useConfirmDialog";

export interface ParentContext {
    courseId?: string | number;
    sectionId?: string | number;
    chapterId?: string | number;
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
}

const CourseTreeItem = memo(function CourseTreeItem({
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
}: CourseTreeItemProps) {
    const apiSetFinalTest = useAjax();
    const apiSyncCourse = useAjax();
    const [open, setOpen] = React.useState(false);
    const [syncProgressDialogOpen, setSyncProgressDialogOpen] = React.useState(false);
    const streamSync = useStreamSync();

    const confirmSync = useConfirmDialog({
        title: "Xác nhận đồng bộ khóa học",
        message: "Bạn có chắc chắn muốn đồng bộ khóa học này lên Firebase?",
    });

    const nodeType = getNodeType(node);

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
                    setTimeout(() => {
                        setSyncProgressDialogOpen(false);
                    }, 100);
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

    const nodeHasChildren = hasChildren(node);
    const childrenCount = getChildrenCount(node);
    const nodeColor = getNodeColor(node);
    const isMissingReward = nodeType === "lesson" && typeof index === 'number' && (index + 1) % 5 === 4;
    const backgroundColor = isMissingReward ? "hsla(0, 0%, 0%, 0.15)" : getNodeBackgroundColor(node, depth);
    const indentSize = 5;
    const basePadding = nodeType === "question" ? 8 : 2;
    const paddingLeft = depth > 0 ? depth * indentSize + basePadding : basePadding;

    const children = getChildren(node);

    const title = parseJsonTitle((node as Course).title || "", currentLanguageCode);

    // Calculate context for children
    const childContext: ParentContext = React.useMemo(() => {
        const ctx: ParentContext = { ...parentContext };
        if (nodeType === 'course') ctx.courseId = node.id;
        if (nodeType === 'section') ctx.sectionId = node.id;
        if (nodeType === 'chapter') ctx.chapterId = node.id;
        return ctx;
    }, [node.id, nodeType, parentContext]);

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

    const handleTrashOrRestoreQuestion = () => {
        if (nodeType !== "question") return;
        const question = node as Question;
        const isTrash = question.status === "trash";

        apiSetFinalTest.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/trash-question",
            method: "POST",
            data: {
                id: postId,
                question_id: node.id,
                action: isTrash ? "restore" : "trash",
            },
            success: () => {
                if (onReloadCourses) {
                    onReloadCourses();
                }
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
                            if (!nodeHasChildren) {
                                if (onEditNode) onEditNode(node.id, nodeType);
                            } else if (onAddChild) {
                                const childType = getChildType(nodeType);
                                if (childType) onAddChild(node.id, nodeType, childType);
                            }
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                        variant="body2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditNode) onEditNode(node.id, nodeType);
                                        }}
                                        sx={{
                                            fontWeight: nodeHasChildren ? 600 : 400,
                                            color: nodeHasChildren ? nodeColor : (
                                                nodeType === "question"
                                                    ? ((node as Question).verify ? "success.main" : "error.main")
                                                    : "text.primary"
                                            ),
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                            "&:hover": { textDecoration: "underline" },
                                        }}
                                    >
                                        {nodeType === 'question' && typeof index === 'number' ? `${index + 1}. ` : ''}
                                        {title || `Untitled ${getNodeLabel(node)}`}
                                    </Typography>

                                    <Chip
                                        label={getNodeLabel(node)}
                                        size="small"
                                        sx={{
                                            height: 16,
                                            fontSize: "0.625rem",
                                            backgroundColor: nodeColor,
                                            color: "white",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onEditNode) onEditNode(node.id, nodeType);
                                        }}
                                    />

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
                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
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
                                    >
                                        {streamSync.isSyncing ? "Syncing..." : "Sync to Firebase"}
                                    </Button>
                                </>
                            )}
                            {nodeType === "question" && (
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleTrashOrRestoreQuestion();
                                    }}
                                    sx={{
                                        color: (node as Question).status === "trash" ? "#1976d2" : "#d32f2f",
                                        p: 0.5,
                                    }}
                                >
                                    {(node as Question).status === "trash" ? <RestoreIcon fontSize="small" /> : <DeleteIcon fontSize="small" />}
                                </IconButton>
                            )}
                        </Box>
                    </ListItemButton>
                </Box>
            </ListItem>

            {nodeHasChildren && (
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
                                        {children.map((child, index) => (
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
                                                            index={index}
                                                        />
                                                    </div>
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
            />
        </Box>
    );
});

export default CourseTreeItem;
