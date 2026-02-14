import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import React from "react";
import useAjax from "hook/useApi";
import Box from "components/atoms/Box";
import List from "components/atoms/List";
import Typography from "components/atoms/Typography";
import Skeleton from "components/atoms/Skeleton";
import Button from "components/atoms/Button";
import DrawerEditPost from "components/atoms/PostType/DrawerEditPost";
import { DataResultApiProps } from "components/atoms/fields/relationship_onetomany_show/Form";
import IconButton from "components/atoms/IconButton";
import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SyncProgressDialog from "components/molecules/SyncProgressDialog";
import useConfirmDialog from "hook/useConfirmDialog";
import useStreamSync, { extractMessageString } from "hook/useStreamSync";
import Menu from "components/atoms/Menu";
import MenuItem from "components/atoms/MenuItem";
import { useNavigate, useLocation } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvided, DroppableProvided } from "react-beautiful-dnd";
import { Course, Language, TreeNode, Section, Chapter, Lesson, Question } from "./types";
import {
    getNodeObjectType,
    getNodeType,
    getChildren,
    getChildrenIds,
    getChildType,
    findNodeByKey,
    getAllNodeKeys,
    getAllChildrenKeys,
    mergeNodes,
} from "./utils";
import CourseTreeItem from "./CourseTreeItem";
import { Select, MenuItem as MuiMenuItem, FormControl, InputLabel, Divider } from "@mui/material";
import GolfCourseIcon from "@mui/icons-material/GolfCourse";
import CheckDataCraw from "../CheckDataCraw";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import CloseIcon from "@mui/icons-material/Close";

export default function CourseTree({ data }: { data: CreatePostTypeData }) {
    const api = useAjax();
    const navigate = useNavigate();
    const location = useLocation();
    const [courses, setCourses] = React.useState<Course[] | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [languages, setLanguages] = React.useState<Language[]>([]);
    const [currentLanguageCode, setCurrentLanguageCode] = React.useState<string>("");
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const [drawerData, setDrawerData] = React.useState<DataResultApiProps | false>(false);
    const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());
    const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get("course") || null;
    });

    // New features state
    const apiSyncCourses = useAjax();
    const apiExportCourse = useAjax();
    const apiImportCourse = useAjax();
    // const apiImportJson = useAjax(); // Removed
    const streamSync = useStreamSync();
    const [syncProgressDialogOpen, setSyncProgressDialogOpen] = React.useState(false);
    const [syncDialogTitle, setSyncDialogTitle] = React.useState<string>("");
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const openMenu = Boolean(anchorEl);

    const [previewNode, setPreviewNode] = React.useState<Lesson | null>(null);

    const confirmSync = useConfirmDialog({
        title: "Xác nhận đồng bộ Courses",
        message: "Bạn có chắc chắn muốn đồng bộ tất cả courses lên Firestore? Hãy đảm bảo bạn đã kiểm tra và xác nhận dữ liệu trước khi đồng bộ.",
    });
    const confirmImport = useConfirmDialog({
        title: "Xác nhận Import Course",
        message: "Bạn có chắc chắn muốn import course? Dữ liệu hiện tại có thể bị ghi đè.",
    });
    const confirmExport = useConfirmDialog({
        title: "Xác nhận Export Course",
        message: "Bạn có chắc chắn muốn export course? File export sẽ được tải xuống sau khi hoàn tất.",
    });
    const confirmImportJson = useConfirmDialog({
        title: "Xác nhận Import Json",
        message: "Bạn có chắc chắn muốn import course từ JSON? Hành động này sẽ thêm dữ liệu mới.",
    });

    const confirmSyncConfig = useConfirmDialog({
        title: "Xác nhận đồng bộ cấu hình",
        message: "Bạn có chắc chắn muốn chi tiết cấu hình Course?",
    });

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleExportCourse = () => {
        handleCloseMenu();
        confirmExport.onConfirm(() => {
            apiExportCourse.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course-new/export-course",
                method: "POST",
                data: {
                    id: data.post.id,
                    debug: 1,
                },
                success: (result: ANY) => {
                    // Export handled by backend response (file download)
                },
            });
        });
    };

    const handleImportCourse = () => {
        handleCloseMenu();
        confirmImport.onConfirm(() => {
            apiImportCourse.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course-new/import-course",
                method: "POST",
                data: {
                    id: data.post.id,
                },
                success: (result: ANY) => {
                    // Reload data after import
                    loadData();
                    api.showMessage("Import course thành công", "success");
                },
            });
        });
    };

    const handleImportJson = () => {
        confirmImportJson.onConfirm(() => {
            setSyncDialogTitle("Import course form Json");
            setSyncProgressDialogOpen(true);
            streamSync.reset();

            streamSync.sync({
                url: "plugin/vn4-e-learning/app-mobile/course-new/import-course-form-json",
                data: {
                    id: String(data.post.id),
                },
                onComplete: (data) => {
                    loadData();
                    // Keep dialog open for a moment or close it? 
                    // Usually useful to see the summary. 
                    // But if successful, maybe we can auto-close after delay.
                    // For now let's match handleSyncCourses behavior but maybe with a slight delay
                    setTimeout(() => {
                        setSyncProgressDialogOpen(false);
                    }, 500);
                },
                onError: (error) => {
                    // specific error handling if needed
                }
            });
        });
    };

    const handleSyncConfig = () => {
        handleCloseMenu();
        confirmSyncConfig.onConfirm(() => {
            apiSyncCourses.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course-new/sync-course-config",
                method: "POST",
                data: {
                    id: data.post.id,
                },
                success: (result: { message?: string }) => {
                    loadData();
                },
            });
        });
    };

    const handleSummaryData = () => {
        handleCloseMenu();
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/summary-data",
            method: "POST",
            data: {
                id: data.post.id,
            },
            success: (result: { message?: string }) => {
                // 
            },
        });
    };

    const handleCheckDataQuestion = () => {
        handleCloseMenu();
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/check-data-question",
            method: "POST",
            data: {
                id: data.post.id,
            },
            success: (result: { message?: string }) => {
                if (result.message) {
                    // 
                }
            },
        });
    };

    const handleSyncCourses = () => {
        handleCloseMenu();
        confirmSync.onConfirm(() => {
            setSyncDialogTitle("Đồng bộ lên Firebase");
            setSyncProgressDialogOpen(true);
            streamSync.reset();

            streamSync.sync({
                url: "plugin/vn4-e-learning/app-mobile/course-new/sync-course-to-firestore",
                data: {
                    id: String(data.post.id),
                },
                onProgress: (data) => {
                    // Progress handled by hook
                },
                onComplete: (data) => {
                    const message = extractMessageString(data.message) || "Đồng bộ tất cả courses lên Firebase thành công";
                    apiSyncCourses.showMessage(message, "success");
                    setTimeout(() => {
                        setSyncProgressDialogOpen(false);
                    }, 100);
                },
                onError: (error) => {
                    apiSyncCourses.showMessage(
                        error || "Không thể đồng bộ courses lên Firebase",
                        "error"
                    );
                },
            });
        });
    };

    const loadData = () => {
        if (!courses) {
            setLoading(true);
        }
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/get-course",
            method: "POST",
            data: {
                id: data.post.id,
            },
            loading: false, // Prevent global loading indicator
            success: (result: { courses: Course[]; languages: Language[] }) => {
                if (result.courses) {
                    setCourses((prev) => {
                        // Use mergeNodes to preserve object references for unchanged nodes
                        return mergeNodes(prev || [], result.courses);
                    });
                } else {
                    setCourses([]);
                }

                if (result.languages) {
                    setLanguages(result.languages);
                }

                if (result.languages && result.languages.length > 0 && !currentLanguageCode) {
                    const defaultLang = result.languages.find((l: Language) => l.is_default) || result.languages[0];
                    setCurrentLanguageCode(defaultLang.code);
                }
                setLoading(false);
            },
        });
    };

    const handleBackToOverview = () => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("view", "overview");
        navigate(`${location.pathname}?${searchParams.toString()}`);
    };

    React.useEffect(() => {
        loadData();
    }, []);

    React.useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const courseId = searchParams.get("course");
        setSelectedCourseId(courseId || null);
    }, [location.search]);

    const handleSelectCourseForEdit = (courseId: string | number) => {
        const idStr = String(courseId);
        setSelectedCourseId(idStr);
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("course", idStr);
        navigate(`${location.pathname}?${searchParams.toString()}`);
    };

    const handleBackToCourseList = () => {
        setSelectedCourseId(null);
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete("course");
        navigate(`${location.pathname}?${searchParams.toString()}`);
    };

    const handleAddChild = (parentId: string | number, parentType: string, childType: string) => {
        const childObjectType = getNodeObjectType(childType);
        const parentObjectType = getNodeObjectType(parentType);

        let relationshipField = "";
        switch (childType) {
            case "course": relationshipField = "app_mobile"; break;
            case "section": relationshipField = "course"; break;
            case "chapter": relationshipField = "spacedev_section"; break;
            case "lesson": relationshipField = "spacedev_chapter"; break;
            case "question": relationshipField = "spacedev_lesson"; break;
        }

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

    const handleEditNode = (nodeId: string | number, nodeType: string) => {
        const objectType = getNodeObjectType(nodeType);
        api.ajax({
            url: `post-type/detail/${objectType}/${nodeId}`,
            method: "POST",
            data: { id: nodeId },
            success: (result: DataResultApiProps) => {
                if (result.post) {
                    setDrawerData({
                        ...result,
                        type: objectType,
                        action: "EDIT",
                    });
                    setOpenDrawer(true);
                }
            },
        });
    };

    const handleUpdateOrder = (
        parentId: string | number,
        parentType: string,
        sourceIndex: number,
        destinationIndex: number
    ) => {
        if (!courses) return;

        const updateChildrenOrder = (
            nodes: TreeNode[],
            parentIdToFind: string | number,
            parentTypeToFind: string
        ): TreeNode[] => {
            return nodes.map((node) => {
                const nodeType = getNodeType(node);
                if (String(node.id) === String(parentIdToFind) && nodeType === parentTypeToFind) {
                    const children = getChildren(node);
                    const newChildren = [...children];
                    const [movedItem] = newChildren.splice(sourceIndex, 1);
                    newChildren.splice(destinationIndex, 0, movedItem);

                    switch (nodeType) {
                        case "course": return { ...node, sections: newChildren as Section[] };
                        case "section": return { ...node, chapters: newChildren as Chapter[] };
                        case "chapter": return { ...node, lessons: newChildren as Lesson[] };
                        case "lesson": return { ...node, questions: newChildren as Question[] };
                        default: return node;
                    }
                }

                const children = getChildren(node);
                if (children.length > 0) {
                    const updatedChildren = updateChildrenOrder(children, parentIdToFind, parentTypeToFind);
                    switch (nodeType) {
                        case "course": return { ...node, sections: updatedChildren as Section[] };
                        case "section": return { ...node, chapters: updatedChildren as Chapter[] };
                        case "chapter": return { ...node, lessons: updatedChildren as Lesson[] };
                        case "lesson": return { ...node, questions: updatedChildren as Question[] };
                        default: return node;
                    }
                }
                return node;
            });
        };

        const updatedCourses = updateChildrenOrder(courses, parentId, parentType) as Course[];
        setCourses(updatedCourses);

        const findParentNode = (nodes: TreeNode[], id: string | number, type: string): TreeNode | null => {
            for (const node of nodes) {
                if (String(node.id) === String(id) && getNodeType(node) === type) return node;
                const found = findParentNode(getChildren(node), id, type);
                if (found) return found;
            }
            return null;
        };

        const parentNode = findParentNode(updatedCourses, parentId, parentType);
        if (!parentNode) {
            console.error("Parent node not found", { parentId, parentType });
            return;
        }

        const childrenIds = getChildrenIds(parentNode);
        const childType = getChildType(parentType);
        const childObjectType = getNodeObjectType(childType || "");

        if (!childType || childrenIds.length === 0) {
            console.error("Missing childType or order is empty", { childType, childrenIds });
            return;
        }

        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/update-order",
            method: "POST",
            data: {
                id: data.post.id,
                parent_id: parentId,
                parent_type: parentType,
                child_type: childType,
                child_object_type: childObjectType,
                order: childrenIds,
            },
            success: () => {
                console.log("Update order success", { parentId, childType });
            },
            error: () => {
                api.showMessage("Có lỗi xảy ra khi cập nhật thứ tự", "error");
                loadData();
            }
        });
    };

    const handleUpdateLessonStatus = (lessonId: string | number, isFinalTest: boolean) => {
        if (!courses) return;

        const updateNodes = (nodes: ANY[]): ANY[] => {
            return nodes.map(node => {
                // If it's a chapter, check its lessons
                if (node.lessons) {
                    const hasTargetLesson = node.lessons.some((l: ANY) => String(l.id) === String(lessonId));
                    if (hasTargetLesson) {
                        const updatedLessons = node.lessons.map((l: ANY) => {
                            if (String(l.id) === String(lessonId)) {
                                return { ...l, is_final_test: isFinalTest };
                            }
                            // If setting to true, others in chapter become false
                            if (isFinalTest) {
                                // Only update if it was true to avoid unnecessary changes? 
                                // well, just force false to be safe as per requirement "mutually exclusive" likely?
                                // Or just "re-render lessons in same chapter". 
                                // Let's assume mutual exclusivity for 'final test' in a chapter usually makes sense.
                                return { ...l, is_final_test: false };
                            }
                            return l;
                        });
                        return { ...node, lessons: updatedLessons };
                    }
                }

                // Recursively check children
                const newNode = { ...node };
                if (newNode.translates) newNode.translates = updateNodes(newNode.translates);
                if (newNode.sections) newNode.sections = updateNodes(newNode.sections);
                if (newNode.chapters) newNode.chapters = updateNodes(newNode.chapters);

                return newNode;
            });
        }

        setCourses(prev => prev ? updateNodes(prev) as Course[] : null);
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source } = result;
        if (!destination) return;
        if (destination.index === source.index) return;
        if (!courses) return;

        const newCourses = [...courses];
        const [movedCourse] = newCourses.splice(source.index, 1);
        newCourses.splice(destination.index, 0, movedCourse);
        setCourses(newCourses);

        const courseIds = newCourses.map(c => c.id);

        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/update-order",
            method: "POST",
            data: {
                id: data.post.id,
                parent_id: data.post.id,
                parent_type: "app_mobile",
                child_type: "course",
                child_object_type: "spacedev_course",
                order: courseIds,
            },
            success: () => {
                console.log("Update root courses order success");
            },
            error: () => {
                api.showMessage("Có lỗi xảy ra khi cập nhật thứ tự", "error");
                loadData();
            }
        });
    };

    const handleExpandAll = (nodeKey: string) => {
        if (!courses) return;

        const node = findNodeByKey(courses, nodeKey);
        if (!node) return;

        const allKeys = getAllNodeKeys(node);
        const childrenKeys = getAllChildrenKeys(node);

        // Check if all children are expanded
        const allChildrenExpanded = childrenKeys.length > 0 && childrenKeys.every(key => expandedNodes.has(key));

        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (allChildrenExpanded) {
                // Close all
                allKeys.forEach(key => newSet.delete(key));
            } else {
                // Open all
                allKeys.forEach(key => newSet.add(key));
            }
            return newSet;
        });
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
            </Box>
        );
    }

    const handleRefresh = () => {
        handleCloseMenu();
        loadData();
    };

    const displayCourses = selectedCourseId
        ? courses?.filter(c => String(c.id) === String(selectedCourseId))
        : courses;

    return (
        <Box sx={{ p: 2, backgroundColor: "#f5f5f7", minHeight: "100vh" }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                    p: 2,
                    backgroundColor: "white",
                    borderRadius: 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
                    Course Structure
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBackToOverview}
                        sx={{ borderRadius: 2, textTransform: "none", mr: 1 }}
                    >
                        Back to Overview
                    </Button>
                    {selectedCourseId && (
                        <Button
                            variant="outlined"
                            onClick={handleBackToCourseList}
                            sx={{ borderRadius: 2, textTransform: "none", mr: 1 }}
                        >
                            Back to Course List
                        </Button>
                    )}
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Language</InputLabel>
                        <Select
                            value={currentLanguageCode}
                            label="Language"
                            onChange={(e) => setCurrentLanguageCode(e.target.value)}
                            sx={{ borderRadius: 2 }}
                        >
                            {languages.map((lang) => (
                                <MuiMenuItem key={lang.code} value={lang.code}>
                                    {lang.title}
                                </MuiMenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <IconButton
                        onClick={handleRefresh}
                        title="Refresh Data"
                        sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            p: 1,
                            mr: 1
                        }}
                    >
                        <SyncIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        onClick={handleOpenMenu}
                        title="More Options"
                        sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            p: 1
                        }}
                    >
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleCloseMenu}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                    >

                        <Divider />
                        <MenuItem onClick={handleExportCourse} disabled={apiExportCourse.open}>
                            <FileDownloadIcon sx={{ mr: 1, fontSize: 20 }} />
                            Export Course
                        </MenuItem>
                        <MenuItem onClick={handleImportCourse} disabled={apiImportCourse.open}>
                            <FileUploadIcon sx={{ mr: 1, fontSize: 20 }} />
                            Import Course
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleSummaryData}>
                            <AssessmentIcon sx={{ mr: 1, fontSize: 20 }} />
                            Summary data
                        </MenuItem>
                        <MenuItem onClick={handleCheckDataQuestion}>
                            <FactCheckIcon sx={{ mr: 1, fontSize: 20 }} />
                            Check verify question
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleSyncCourses} disabled={apiSyncCourses.open}>
                            <GolfCourseIcon sx={{ mr: 1, fontSize: 20 }} />
                            Sync course to Firebase
                        </MenuItem>
                        <MenuItem onClick={handleSyncConfig}>
                            <SyncIcon sx={{ mr: 1, fontSize: 20 }} />
                            Sync Course category
                        </MenuItem>
                    </Menu>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddChild(data.post.id, "app_mobile", "course")}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                    >
                        Add Course
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<FileUploadIcon />}
                        onClick={handleImportJson}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                        disabled={streamSync.isSyncing}
                    >
                        Import course form Json
                    </Button>
                </Box>
            </Box>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="root" type="course">
                    {(provided: DroppableProvided) => (
                        <List
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            sx={{ width: "100%", bgcolor: "background.paper" }}
                        >
                            {displayCourses?.map((course, index) => (
                                <Draggable
                                    key={String(course.id)}
                                    draggableId={String(course.id)}
                                    index={index}
                                >
                                    {(provided: DraggableProvided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                        >
                                            <CourseTreeItem
                                                node={course}
                                                depth={0}
                                                onEditNode={handleEditNode}
                                                onAddChild={handleAddChild}
                                                onUpdateOrder={handleUpdateOrder}
                                                dragHandleProps={provided.dragHandleProps}
                                                currentLanguageCode={currentLanguageCode}
                                                languages={languages}
                                                postId={data.post.id}
                                                onReloadCourses={loadData}
                                                onUpdateLessonStatus={handleUpdateLessonStatus}
                                                expandedNodes={expandedNodes}
                                                onExpandAll={handleExpandAll}
                                                onExpandNode={(key) => setExpandedNodes(prev => new Set(prev).add(key))}
                                                onCollapse={(key) => setExpandedNodes(prev => {
                                                    const next = new Set(prev);
                                                    next.delete(key);
                                                    return next;
                                                })}
                                                onSelectCourseForEdit={handleSelectCourseForEdit}
                                                onBackToCourseList={handleBackToCourseList}
                                                selectedCourseId={selectedCourseId}
                                                onPreviewLesson={setPreviewNode}
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

            {openDrawer && drawerData && (
                <DrawerEditPost
                    open={openDrawer}
                    openLoading={api.open}
                    setData={setDrawerData}
                    handleSubmit={() => {
                        if (drawerData) {
                            api.ajax({
                                url: "post-type/post/" + drawerData.type,
                                method: "POST",
                                data: {
                                    ...drawerData.post,
                                    _action: drawerData.action,
                                },
                                success: () => {
                                    setOpenDrawer(false);
                                    loadData();
                                },
                            });
                        }
                    }}
                    onClose={() => {
                        setOpenDrawer(false);
                    }}
                    data={drawerData}
                    handleAfterDelete={() => {
                        setOpenDrawer(false);
                        loadData();
                    }}
                />
            )}

            {confirmSync.component}
            {confirmImport.component}
            {confirmExport.component}
            {confirmImportJson.component}

            <Dialog
                open={Boolean(previewNode)}
                onClose={() => setPreviewNode(null)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#3f51b5', color: '#fff' }}>
                    <Typography variant="h6" component="div" sx={{ color: 'inherit' }}>Preview Questions: {previewNode?.title}</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={() => setPreviewNode(null)}
                        sx={{ color: 'inherit' }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    {previewNode && (
                        <CheckDataCraw
                            post={previewNode}
                            config={{ title: 'Preview Questions' }}
                            name="link_data_craw_json"
                            onReview={() => { /* review */ }}
                            component="check_data_craw"
                            autoPreview={true}
                        />
                    )}
                </DialogContent>
            </Dialog>
            {confirmSyncConfig.component}

            <SyncProgressDialog
                open={syncProgressDialogOpen}
                title={syncDialogTitle}
                onClose={() => {
                    if (!streamSync.isSyncing) {
                        setSyncProgressDialogOpen(false);
                        streamSync.reset();
                    }
                }}
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
}
