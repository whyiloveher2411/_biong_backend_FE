import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import React from "react";
import useAjax from "hook/useApi";
import Box from "components/atoms/Box";
import List from "components/atoms/List";
import ListItem from "components/atoms/ListItem";
import ListItemButton from "components/atoms/ListItemButton";
import Collapse from "components/atoms/Collapse";
import Typography from "components/atoms/Typography";
import Skeleton from "components/atoms/Skeleton";
import Chip from "components/atoms/Chip";
import Button from "components/atoms/Button";
import DrawerEditPost from "components/atoms/PostType/DrawerEditPost";
import { DataResultApiProps } from "components/atoms/fields/relationship_onetomany_show/Form";
import Menu from "components/atoms/Menu";
import MenuItem from "components/atoms/MenuItem";
import IconButton from "components/atoms/IconButton";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import SyncIcon from "@mui/icons-material/Sync";
import { useNavigate, useLocation } from "react-router-dom";
import {
    DragDropContext,
    Droppable,
    Draggable,
    DropResult,
} from "react-beautiful-dnd";
import useConfirmDialog from "hook/useConfirmDialog";

interface Question {
    id: string;
    title: string;
}

interface Lesson {
    id: string;
    title: string;
    questions?: Question[];
}

interface Chapter {
    id: string;
    title: string;
    lessons?: Lesson[];
}

interface Section {
    id: string;
    title: string;
    chapters?: Chapter[];
}

interface Translate {
    id: string;
    title: string;
    language?: string;
    sections?: Section[];
}

interface Course {
    id: string;
    title: string;
    translates?: Translate[];
}

type TreeNode = Course | Translate | Section | Chapter | Lesson | Question;

function getNodeType(
    node: TreeNode
): "course" | "translate" | "section" | "chapter" | "lesson" | "question" {
    if ("translates" in node) return "course";
    if ("sections" in node) return "translate";
    if ("chapters" in node) return "section";
    if ("lessons" in node) return "chapter";
    if ("questions" in node) return "lesson";
    return "question";
}

// Hàm tạo key duy nhất cho node (nodeId-nodeType để tránh conflict khi các node khác loại có cùng ID)
function getNodeKey(node: TreeNode): string {
    return `${node.id}-${getNodeType(node)}`;
}

function getChildrenCount(node: TreeNode): number {
    const children = getChildren(node);
    return children.length;
}

function getFolderIcon(hasChildren: boolean, isOpen: boolean): React.ReactNode {
    if (!hasChildren) {
        return <InsertDriveFileIcon sx={{ fontSize: 14 }} />;
    }
    return isOpen ? (
        <FolderOpenIcon sx={{ fontSize: 14 }} />
    ) : (
        <FolderIcon sx={{ fontSize: 14 }} />
    );
}

function getNodeLabel(node: TreeNode): string {
    const type = getNodeType(node);
    const labels: Record<string, string> = {
        course: "Course",
        translate: "Translate",
        section: "Section",
        chapter: "Chapter",
        lesson: "Lesson",
        question: "Question",
    };
    return labels[type] || "";
}

function getNodeObjectType(nodeType: string): string {
    const objectTypes: Record<string, string> = {
        course: "sac_course",
        translate: "sac_translate",
        section: "sac_section",
        chapter: "sac_chapter",
        lesson: "sac_lesson",
        question: "sac_question",
    };
    return objectTypes[nodeType] || "";
}

function getChildType(parentType: string): string {
    const childTypes: Record<string, string> = {
        course: "translate",
        translate: "section",
        section: "chapter",
        chapter: "lesson",
        lesson: "question",
    };
    return childTypes[parentType] || "";
}

function getNodeColor(node: TreeNode): string {
    const type = getNodeType(node);
    const colors: Record<string, string> = {
        course: "#1976d2", // Blue
        translate: "#388e3c", // Green
        section: "#f57c00", // Orange
        chapter: "#7b1fa2", // Purple
        lesson: "#0288d1", // Light Blue
        question: "#616161", // Grey
    };
    return colors[type] || "#616161";
}

function getNodeBackgroundColor(node: TreeNode, depth: number): string {
    const type = getNodeType(node);
    const backgrounds: Record<string, string> = {
        course: "rgba(25, 118, 210, 0.05)",
        translate: "rgba(56, 142, 60, 0.05)",
        section: "rgba(245, 124, 0, 0.05)",
        chapter: "rgba(123, 31, 162, 0.05)",
        lesson: "rgba(2, 136, 209, 0.05)",
        question: "rgba(97, 97, 97, 0.03)",
    };
    return backgrounds[type] || "transparent";
}

function hasChildren(node: TreeNode): boolean {
    const type = getNodeType(node);
    switch (type) {
        case "course": {
            const course = node as Course;
            return !!(course.translates && course.translates.length > 0);
        }
        case "translate": {
            const translate = node as Translate;
            return !!(translate.sections && translate.sections.length > 0);
        }
        case "section": {
            const section = node as Section;
            return !!(section.chapters && section.chapters.length > 0);
        }
        case "chapter": {
            const chapter = node as Chapter;
            return !!(chapter.lessons && chapter.lessons.length > 0);
        }
        case "lesson": {
            const lesson = node as Lesson;
            return !!(lesson.questions && lesson.questions.length > 0);
        }
        default:
            return false;
    }
}

function getChildren(node: TreeNode): TreeNode[] {
    const type = getNodeType(node);
    switch (type) {
        case "course":
            return (node as Course).translates || [];
        case "translate":
            return (node as Translate).sections || [];
        case "section":
            return (node as Section).chapters || [];
        case "chapter":
            return (node as Chapter).lessons || [];
        case "lesson":
            return (node as Lesson).questions || [];
        default:
            return [];
    }
}

function CourseTreeItem({
    node,
    depth = 0,
    isLast = false,
    onEditNode,
    onAddChild,
    onUpdateOrder,
    dragHandleProps,
    expandedNodes,
    onExpandAll,
    onCollapse,
    onExpandNode,
}: {
    node: TreeNode;
    depth?: number;
    isLast?: boolean;
    onEditNode?: (nodeId: string, nodeType: string) => void;
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
}) {
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
    const nodeHasChildren = hasChildren(node);
    const childrenCount = getChildrenCount(node);
    const nodeColor = getNodeColor(node);
    const backgroundColor = getNodeBackgroundColor(node, depth);
    const indentSize = 5; // Giảm xuống 5px mỗi level để giảm khoảng cách cho question
    const nodeType = getNodeType(node);
    // Giảm thêm khoảng cách cho question (level sâu nhất)
    const basePadding = nodeType === "question" ? 0 : 2;
    const paddingLeft =
        depth > 0 ? depth * indentSize + basePadding : basePadding;

    const children = getChildren(node);
    const isLastChild = (index: number) => index === children.length - 1;

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
                            {/* Count indicator ở cuối */}
                            {nodeHasChildren && (
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.25,
                                        ml: "auto",
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
                    </ListItemButton>
                </Box>
            </ListItem>

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
                                        {children.map((child, index) => (
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
                                                            onAddChild={
                                                                onAddChild
                                                            }
                                                            onUpdateOrder={
                                                                onUpdateOrder
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

function CourseTree({ data }: { data: CreatePostTypeData }) {
    const api = useAjax();
    const apiSyncCourses = useAjax();
    const apiExportCourse = useAjax();
    const apiImportCourse = useAjax();
    const navigate = useNavigate();
    const location = useLocation();
    const [courses, setCourses] = React.useState<Course[] | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const [drawerData, setDrawerData] = React.useState<
        DataResultApiProps | false
    >(false);
    const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
        new Set()
    );
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);
    const confirmSync = useConfirmDialog({
        title: "Xác nhận đồng bộ Courses",
        message:
            "Bạn có chắc chắn muốn đồng bộ tất cả courses lên Firestore? Hãy đảm bảo bạn đã kiểm tra và xác nhận dữ liệu trước khi đồng bộ.",
    });
    const confirmImport = useConfirmDialog({
        title: "Xác nhận Import Course",
        message:
            "Bạn có chắc chắn muốn import course? Dữ liệu hiện tại có thể bị ghi đè.",
    });

    const handleBackToOverview = () => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete("view"); // Xóa view param để quay về overview
        navigate(`${location.pathname}?${searchParams.toString()}`);
    };

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleExportCourse = () => {
        handleCloseMenu();
        apiExportCourse.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course/export-course",
            method: "POST",
            data: {
                id: data.post.id,
                debug: 1,
            },
            success: (result: ANY) => {
                //
            },
        });
    };

    const handleImportCourse = () => {
        handleCloseMenu();
        confirmImport.onConfirm(() => {
            apiImportCourse.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course/import-course",
                method: "POST",
                data: {
                    id: data.post.id,
                },
                success: (result: ANY) => {
                    // Reload danh sách courses
                    api.ajax({
                        url: "plugin/vn4-e-learning/app-mobile/course/get-course",
                        method: "POST",
                        data: {
                            id: data.post.id,
                        },
                        loading: false,
                        success: (result: ANY) => {
                            //
                        },
                    });
                },
            });
        });
    };

    const handleSyncCourses = () => {
        handleCloseMenu();
        confirmSync.onConfirm(() => {
            apiSyncCourses.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course/sync-course-to-firestore",
                method: "POST",
                data: {
                    id: data.post.id,
                },
                success: (result) => {
                    // API sẽ tự động hiển thị thông báo qua showMessage
                },
            });
        });
    };

    const handleAddCourse = () => {
        api.ajax({
            url: "post-type/show-post-relationship",
            method: "POST",
            data: {
                object: "sac_course",
                mainType: data.post.type,
                id: data.post.id,
                field: "app_mobile",
                view: "relationship_onetomany_show",
                page: 1,
                rowsPerPage: 5,
            },
            success: (result: DataResultApiProps) => {
                if (result.rows) {
                    result.action = "ADD_NEW";
                    result.type = "sac_course";
                    setDrawerData({ ...result });
                    setOpenDrawer(true);
                }
            },
        });
    };

    const handleAddChild = (
        parentId: string,
        parentType: string,
        childType: string
    ) => {
        const childObjectType = getNodeObjectType(childType);
        if (!childObjectType) {
            api.showMessage(
                `Không tìm thấy object type cho ${childType}`,
                "error"
            );
            return;
        }

        // Tìm parent object type để xác định field relationship
        const parentObjectType = getNodeObjectType(parentType);
        const relationshipField = getRelationshipField(parentType, childType);

        api.ajax({
            url: "post-type/show-post-relationship",
            method: "POST",
            data: {
                object: childObjectType,
                mainType: parentObjectType,
                id: parentId,
                field: relationshipField,
                view: "relationship_onetomany_show",
                page: 1,
                rowsPerPage: 5,
            },
            success: (result: DataResultApiProps) => {
                if (result.rows) {
                    result.action = "ADD_NEW";
                    result.type = childObjectType;
                    // Set parent relationship trong post data
                    if (result.post) {
                        result.post[relationshipField] = parentId;
                    } else {
                        result.post = { [relationshipField]: parentId };
                    }
                    setDrawerData({ ...result });
                    setOpenDrawer(true);
                }
            },
        });
    };

    const getRelationshipField = (
        parentType: string,
        childType: string
    ): string => {
        // Map relationship field names với tiền tố "sac_" cho chapter, lesson, question
        const fields: Record<string, Record<string, string>> = {
            course: {
                translate: "course",
            },
            translate: {
                section: "translate",
            },
            section: {
                chapter: "sac_section", // Field có tiền tố sac_
            },
            chapter: {
                lesson: "sac_chapter", // Field có tiền tố sac_
            },
            lesson: {
                question: "sac_lesson", // Field có tiền tố sac_
            },
        };
        return fields[parentType]?.[childType] || "parent";
    };

    const handleEditNode = (nodeId: string, nodeType: string) => {
        const objectType = getNodeObjectType(nodeType);
        if (!objectType) {
            api.showMessage(
                `Không tìm thấy object type cho ${nodeType}`,
                "error"
            );
            return;
        }

        api.ajax({
            url: `post-type/detail/${objectType}/${nodeId}`,
            method: "POST",
            data: {
                id: nodeId,
            },
            success: (result: ANY) => {
                if (result.post) {
                    const editData: DataResultApiProps = {
                        ...result,
                        type: objectType,
                        action: "EDIT",
                    };
                    setDrawerData(editData);
                    setOpenDrawer(true);
                } else {
                    api.showMessage(
                        `Không tìm thấy dữ liệu để chỉnh sửa`,
                        "error"
                    );
                }
            },
            error: (response: Response) => {
                // Thử với object type khác nếu lỗi 404
                if (response.status === 404) {
                    // Thử các object types khác
                    const alternativeTypes: Record<string, string[]> = {
                        translate: [
                            "sac_course_translate",
                            "e_learning_translate",
                        ],
                        section: ["sac_course_section", "e_learning_section"],
                        chapter: ["sac_course_chapter", "e_learning_chapter"],
                        lesson: [
                            "sac_course_lesson",
                            "e_learning_lesson",
                            "sac_lesson",
                        ],
                        question: [
                            "sac_course_question",
                            "e_learning_question",
                            "sac_question",
                        ],
                    };

                    const alternatives = alternativeTypes[nodeType] || [];
                    if (alternatives.length > 0) {
                        api.showMessage(
                            `Object type ${objectType} không tồn tại. Vui lòng kiểm tra lại cấu hình.`,
                            "error"
                        );
                    } else {
                        api.showMessage(
                            `Không thể chỉnh sửa ${nodeType}. Có thể loại này không phải là post type riêng biệt.`,
                            "error"
                        );
                    }
                }
            },
        });
    };

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
        setDrawerData(false);
    };

    // Hàm đệ quy để lấy tất cả keys của node và children
    const getAllNodeKeys = (node: TreeNode): string[] => {
        const keys = [getNodeKey(node)];
        const children = getChildren(node);
        children.forEach((child) => {
            keys.push(...getAllNodeKeys(child));
        });
        return keys;
    };

    // Hàm đệ quy để lấy tất cả keys của children (không bao gồm node cha)
    const getAllChildrenKeys = (node: TreeNode): string[] => {
        const keys: string[] = [];
        const children = getChildren(node);
        children.forEach((child) => {
            keys.push(...getAllNodeKeys(child));
        });
        return keys;
    };

    // Hàm tìm node theo key (nodeId-nodeType) để tránh conflict khi các node khác loại có cùng ID
    const findNodeByKey = (
        nodes: TreeNode[],
        targetKey: string
    ): TreeNode | null => {
        for (const node of nodes) {
            const nodeKey = getNodeKey(node);
            if (nodeKey === targetKey) {
                return node;
            }
            const children = getChildren(node);
            const found = findNodeByKey(children, targetKey);
            if (found) return found;
        }
        return null;
    };

    const handleExpandAll = (nodeKey: string) => {
        if (!courses) {
            return;
        }

        // Tìm node trong cây theo key (để tránh conflict khi các node khác loại có cùng ID)
        const node = findNodeByKey(courses, nodeKey);
        if (!node) {
            return;
        }

        // Lấy tất cả keys của node và children (để thêm/xóa)
        const allKeysArray = getAllNodeKeys(node);
        // Loại bỏ trùng lặp bằng Set
        const allKeys = Array.from(new Set(allKeysArray));

        // Lấy tất cả keys của children (không bao gồm node cha) để kiểm tra
        const childrenKeysArray = getAllChildrenKeys(node);
        // Loại bỏ trùng lặp bằng Set
        const childrenKeys = Array.from(new Set(childrenKeysArray));

        // Kiểm tra xem tất cả children có đang mở không (chỉ kiểm tra children, không kiểm tra node cha)
        // Nếu không có children, coi như chưa mở hết để mở node đó
        const allChildrenExpanded =
            childrenKeys.length > 0 &&
            childrenKeys.every((key) => expandedNodes.has(key));

        // Cập nhật expandedNodes: nếu tất cả children đều mở thì đóng hết, nếu chưa mở hết thì mở hết
        setExpandedNodes((prev) => {
            const newSet = new Set(prev);
            if (allChildrenExpanded) {
                // Đóng hết: xóa tất cả keys (bao gồm cả node cha và children)
                allKeys.forEach((key) => {
                    newSet.delete(key);
                });
            } else {
                // Mở hết: thêm tất cả keys (bao gồm cả node cha và children)
                allKeys.forEach((key) => {
                    newSet.add(key);
                });
            }

            return newSet;
        });
    };

    const handleExpandNode = (nodeKey: string) => {
        // Thêm node vào expandedNodes khi user mở node thủ công
        setExpandedNodes((prev) => {
            const newSet = new Set(prev);
            newSet.add(nodeKey);
            return newSet;
        });
    };

    const handleCollapse = (nodeKey: string) => {
        if (!courses) return;

        // Tìm node trong cây theo key (để tránh conflict khi các node khác loại có cùng ID)
        const node = findNodeByKey(courses, nodeKey);
        if (!node) return;

        // Chỉ xóa node đó và tất cả children của nó (không ảnh hưởng đến node cha)
        // Lấy tất cả keys của node và children
        const allKeys = getAllNodeKeys(node);

        // Xóa khỏi expandedNodes
        setExpandedNodes((prev) => {
            const newSet = new Set(prev);
            allKeys.forEach((key) => newSet.delete(key));
            return newSet;
        });
    };

    const handleUpdateOrder = (
        parentId: string,
        parentType: string,
        sourceIndex: number,
        destinationIndex: number
    ) => {
        if (!courses) {
            return;
        }

        // Validate parentId
        if (!parentId) {
            return;
        }

        // Validate parentType
        if (!parentType) {
            return;
        }

        // Tìm parent node và cập nhật order trong state local
        const updateChildrenOrder = (
            nodes: TreeNode[],
            parentIdToFind: string,
            parentTypeToFind: string
        ): TreeNode[] => {
            return nodes.map((node) => {
                const nodeType = getNodeType(node);

                // Nếu node này là parent cần update
                if (
                    node.id === parentIdToFind &&
                    nodeType === parentTypeToFind
                ) {
                    const children = getChildren(node);
                    const newChildren = [...children];
                    const [movedItem] = newChildren.splice(sourceIndex, 1);
                    newChildren.splice(destinationIndex, 0, movedItem);

                    // Cập nhật children dựa trên node type
                    switch (nodeType) {
                        case "course":
                            return {
                                ...node,
                                translates: newChildren as Translate[],
                            };
                        case "translate":
                            return {
                                ...node,
                                sections: newChildren as Section[],
                            };
                        case "section":
                            return {
                                ...node,
                                chapters: newChildren as Chapter[],
                            };
                        case "chapter":
                            return {
                                ...node,
                                lessons: newChildren as Lesson[],
                            };
                        case "lesson":
                            return {
                                ...node,
                                questions: newChildren as Question[],
                            };
                        default:
                            return node;
                    }
                }

                // Recursively update children
                const children = getChildren(node);
                if (children.length > 0) {
                    const updatedChildren = updateChildrenOrder(
                        children,
                        parentIdToFind,
                        parentTypeToFind
                    );
                    switch (nodeType) {
                        case "course":
                            return {
                                ...node,
                                translates: updatedChildren as Translate[],
                            };
                        case "translate":
                            return {
                                ...node,
                                sections: updatedChildren as Section[],
                            };
                        case "section":
                            return {
                                ...node,
                                chapters: updatedChildren as Chapter[],
                            };
                        case "chapter":
                            return {
                                ...node,
                                lessons: updatedChildren as Lesson[],
                            };
                        case "lesson":
                            return {
                                ...node,
                                questions: updatedChildren as Question[],
                            };
                        default:
                            return node;
                    }
                }

                return node;
            });
        };

        // Update courses list
        const updatedCourses = updateChildrenOrder(
            courses,
            parentId,
            parentType
        ) as Course[];
        setCourses(updatedCourses);

        // Lấy danh sách IDs theo thứ tự mới từ cây đã được update
        const getChildrenIds = (node: TreeNode): string[] => {
            const children = getChildren(node);
            const ids = children.map((child) => child.id).filter((id) => id); // Lọc bỏ các id null/undefined
            return ids;
        };

        // Tìm node dựa trên cả id và type để tránh trùng lặp ID
        const findNodeByIdAndType = (
            nodes: TreeNode[],
            id: string,
            type: string
        ): TreeNode | null => {
            for (const node of nodes) {
                const nodeType = getNodeType(node);
                // Kiểm tra cả id và type
                if (node.id === id && nodeType === type) {
                    return node;
                }
                // Tìm trong children
                const children = getChildren(node);
                const found = findNodeByIdAndType(children, id, type);
                if (found) return found;
            }
            return null;
        };

        // Tìm parent node từ cây đã được update (updatedCourses) để lấy thứ tự mới
        // Sử dụng cả id và type để tìm chính xác
        const parentNode = findNodeByIdAndType(
            updatedCourses,
            parentId,
            parentType
        );
        if (!parentNode) {
            return;
        }

        const childrenIds = getChildrenIds(parentNode);
        const childType = getChildType(parentType);
        const childObjectType = getNodeObjectType(childType);

        // Kiểm tra childType và childObjectType
        if (!childType || !childObjectType) {
            return;
        }

        // Kiểm tra childrenIds
        if (childrenIds.length === 0) {
            return;
        }

        // Gọi API để update order
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course/update-order",
            method: "POST",
            data: {
                id: data.post.id,
                parent_id: parentId,
                parent_type: parentType,
                child_type: childType,
                child_object_type: childObjectType,
                order: childrenIds,
            },
            loading: false,
            success: () => {
                // api.showMessage('Đã cập nhật thứ tự thành công', 'success')
            },
            error: () => {
                // Rollback nếu lỗi
                api.ajax({
                    url: "plugin/vn4-e-learning/app-mobile/course/get-course",
                    method: "POST",
                    data: {
                        id: data.post.id,
                    },
                    loading: false,
                    success: (result: ANY) => {
                        if (result.courses) {
                            setCourses(result.courses);
                        } else if (Array.isArray(result)) {
                            setCourses(result);
                        } else {
                            setCourses([]);
                        }
                    },
                });
                api.showMessage("Có lỗi xảy ra khi cập nhật thứ tự", "error");
            },
        });
    };

    const handleSubmitCourse = () => {
        if (!api.open && drawerData) {
            const objectType = drawerData.type || "sac_course";
            api.ajax({
                url: `post-type/post/${objectType}`,
                method: "POST",
                data: { ...drawerData.post, _action: drawerData.action },
                success: (result) => {
                    if (result.post?.id) {
                        setOpenDrawer(false);
                        setDrawerData(false);
                        // Reload danh sách courses
                        api.ajax({
                            url: "plugin/vn4-e-learning/app-mobile/course/get-course",
                            method: "POST",
                            data: {
                                id: data.post.id,
                            },
                            loading: false,
                            success: (result: ANY) => {
                                if (result.courses) {
                                    setCourses(result.courses);
                                } else if (Array.isArray(result)) {
                                    setCourses(result);
                                } else {
                                    setCourses([]);
                                }
                            },
                        });
                    }
                },
            });
        }
    };

    React.useEffect(() => {
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course/get-course",
            method: "POST",
            data: {
                id: data.post.id,
            },
            loading: false,
            success: (result: ANY) => {
                if (result.courses) {
                    setCourses(result.courses);
                } else if (Array.isArray(result)) {
                    setCourses(result);
                } else {
                    setCourses([]);
                }
                setLoading(false);
            },
            error: () => {
                setLoading(false);
                setCourses([]);
            },
        });
    }, [data.post.id]);

    if (loading) {
        return (
            <Box sx={{ p: 2 }}>
                <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={40} />
            </Box>
        );
    }

    // Đảm bảo courses luôn là array
    const coursesList = courses || [];

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="h6"
                            sx={{ mb: 0.5, fontWeight: 600 }}
                        >
                            Cấu trúc Courses
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: "0.8125rem" }}
                        >
                            Course → Translates → Sections → Chapters → Lessons
                            → Questions
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5, display: "block" }}
                        >
                            {coursesList.length > 0
                                ? `Tổng cộng: ${coursesList.length} khóa học`
                                : "Chưa có khóa học nào"}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleBackToOverview}
                            sx={{
                                minWidth: "auto",
                                px: 2,
                            }}
                        >
                            Quay về Overview
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddCourse}
                            sx={{
                                minWidth: "auto",
                                px: 2,
                            }}
                        >
                            Thêm Course
                        </Button>
                        <IconButton
                            onClick={handleOpenMenu}
                            sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                "&:hover": {
                                    backgroundColor: "action.hover",
                                },
                            }}
                        >
                            <MoreVertIcon />
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={openMenu}
                            onClose={handleCloseMenu}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                            }}
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                        >
                            <MenuItem
                                onClick={handleExportCourse}
                                disabled={apiExportCourse.open}
                            >
                                <FileDownloadIcon
                                    sx={{ mr: 1, fontSize: 20 }}
                                />
                                Export Course
                            </MenuItem>
                            <MenuItem
                                onClick={handleImportCourse}
                                disabled={apiImportCourse.open}
                            >
                                <FileUploadIcon sx={{ mr: 1, fontSize: 20 }} />
                                Import Course
                            </MenuItem>
                            <MenuItem
                                onClick={handleSyncCourses}
                                disabled={apiSyncCourses.open}
                            >
                                <SyncIcon sx={{ mr: 1, fontSize: 20 }} />
                                Sync Course
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>
            </Box>
            <Box
                sx={{
                    backgroundColor: "background.paper",
                    borderRadius: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    overflowX: "auto",
                    maxHeight: "calc(100vh - 250px)",
                    overflowY: "auto",
                    // Tắt scroll cho container này để tránh nested scroll với react-beautiful-dnd
                    overflow: "visible",
                }}
            >
                {coursesList.length === 0 ? (
                    <Box
                        sx={{
                            p: 4,
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 200,
                        }}
                    >
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                        >
                            Chưa có khóa học nào
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 3 }}
                        >
                            Bạn có thể tạo course mới hoặc import từ file
                        </Typography>
                    </Box>
                ) : (
                    <DragDropContext
                        onDragEnd={(result: DropResult) => {
                            if (!result.destination) return;
                            if (
                                result.source.index === result.destination.index
                            )
                                return;

                            // Update order cho courses (level cao nhất)
                            const newCourses = [...coursesList];
                            const [movedCourse] = newCourses.splice(
                                result.source.index,
                                1
                            );
                            newCourses.splice(
                                result.destination.index,
                                0,
                                movedCourse
                            );
                            setCourses(newCourses);

                            // Gọi API để update order
                            const courseIds = newCourses.map((c) => c.id);
                            api.ajax({
                                url: "plugin/vn4-e-learning/app-mobile/course/update-order",
                                method: "POST",
                                data: {
                                    id: data.post.id,
                                    parent_id: data.post.id,
                                    parent_type: "app_mobile",
                                    child_type: "course",
                                    child_object_type: "sac_course",
                                    order: courseIds,
                                },
                                loading: false,
                                success: () => {
                                    // api.showMessage('Đã cập nhật thứ tự thành công', 'success')
                                },
                                error: () => {
                                    // Rollback nếu lỗi
                                    api.ajax({
                                        url: "plugin/vn4-e-learning/app-mobile/course/get-course",
                                        method: "POST",
                                        data: {
                                            id: data.post.id,
                                        },
                                        loading: false,
                                        success: (result: ANY) => {
                                            if (result.courses) {
                                                setCourses(result.courses);
                                            } else if (Array.isArray(result)) {
                                                setCourses(result);
                                            } else {
                                                setCourses([]);
                                            }
                                        },
                                    });
                                    api.showMessage(
                                        "Có lỗi xảy ra khi cập nhật thứ tự",
                                        "error"
                                    );
                                },
                            });
                        }}
                    >
                        <Droppable droppableId="droppable-courses">
                            {(provided) => (
                                <List
                                    sx={{
                                        minWidth: "fit-content",
                                        maxHeight: "calc(100vh - 250px)",
                                        overflowY: "auto",
                                        overflowX: "auto",
                                    }}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                >
                                    {coursesList.map((course, index) => (
                                        <Draggable
                                            key={course.id}
                                            draggableId={`draggable-course-${course.id}`}
                                            index={index}
                                        >
                                            {(provided, snapshot) => (
                                                <Box
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    sx={{
                                                        mb:
                                                            index <
                                                            coursesList.length -
                                                                1
                                                                ? 2
                                                                : 0,
                                                        "&:not(:last-child)": {
                                                            borderBottom:
                                                                "2px solid",
                                                            borderColor:
                                                                "divider",
                                                            pb: 2,
                                                        },
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
                                                        node={course}
                                                        isLast={
                                                            index ===
                                                            coursesList.length -
                                                                1
                                                        }
                                                        onEditNode={
                                                            handleEditNode
                                                        }
                                                        onAddChild={
                                                            handleAddChild
                                                        }
                                                        onUpdateOrder={
                                                            handleUpdateOrder
                                                        }
                                                        dragHandleProps={
                                                            provided.dragHandleProps
                                                        }
                                                        expandedNodes={
                                                            expandedNodes
                                                        }
                                                        onExpandAll={
                                                            handleExpandAll
                                                        }
                                                        onCollapse={
                                                            handleCollapse
                                                        }
                                                        onExpandNode={
                                                            handleExpandNode
                                                        }
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
                )}
            </Box>
            {drawerData && (
                <DrawerEditPost
                    open={openDrawer}
                    openLoading={api.open}
                    onClose={handleCloseDrawer}
                    data={drawerData}
                    setData={setDrawerData}
                    handleSubmit={handleSubmitCourse}
                />
            )}
            {confirmSync.component}
            {confirmImport.component}
        </Box>
    );
}

export default CourseTree;
