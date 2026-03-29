import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import React from "react";
import useAjax from "hook/useApi";
import Box from "components/atoms/Box";
import Typography from "components/atoms/Typography";
import Skeleton from "components/atoms/Skeleton";
import Button from "components/atoms/Button";
import DrawerEditPost from "components/atoms/PostType/DrawerEditPost";
import { DataResultApiProps } from "components/atoms/fields/relationship_onetomany_show/Form";
import IconButton from "components/atoms/IconButton";
import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import MoreVertIcon from "@mui/icons-material/MoreVert";
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
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
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
import AnimationIcon from "@mui/icons-material/Animation";
import CheckDataCraw, { CheckDataCrawRef } from "../CheckDataCraw";
import DrawerCustom from "components/molecules/DrawerCustom";
import { LoadingButton } from "@mui/lab";
import { Virtuoso } from "react-virtuoso";
import { flattenTree } from "./utils";

/** ?course= / ?course_id= (chuỗi có thể là full search hoặc không có ?) */
function parseCourseIdFromSearchString(searchOrQuery: string | null | undefined): string | null {
    if (searchOrQuery == null || searchOrQuery === "") return null;
    const s = searchOrQuery.startsWith("?") ? searchOrQuery.slice(1) : searchOrQuery;
    const p = new URLSearchParams(s);
    return p.get("course") || p.get("course_id");
}

/** HashRouter / link dạng #/path?course= */
function parseCourseIdFromHash(hash: string | null | undefined): string | null {
    if (!hash) return null;
    const q = hash.indexOf("?");
    if (q < 0) return null;
    return parseCourseIdFromSearchString(hash.slice(q + 1));
}

/** Khôi phục trạng thái expand sau F5 — cần để gọi get-course-detail cho mọi course đang mở */
function getExpandedNodesStorageKey(postId: string | number) {
    return `vn4_course_tree_expanded_${postId}`;
}

export default function CourseTree({ data }: { data: CreatePostTypeData }) {
    const api = useAjax();
    const navigate = useNavigate();
    const location = useLocation();
    const locationSearchRef = React.useRef(location.search);
    React.useLayoutEffect(() => {
        locationSearchRef.current = location.search;
    }, [location.search]);
    const [courses, setCourses] = React.useState<Course[] | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [languages, setLanguages] = React.useState<Language[]>([]);
    const [currentLanguageCode, setCurrentLanguageCode] = React.useState<string>("");
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const [drawerData, setDrawerData] = React.useState<DataResultApiProps | false>(false);
    const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(() => {
        try {
            const raw = sessionStorage.getItem(getExpandedNodesStorageKey(data.post.id));
            if (raw) {
                const arr = JSON.parse(raw) as unknown;
                if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
                    return new Set(arr);
                }
            }
        } catch {
            /* ignore */
        }
        return new Set();
    });
    const expandedNodesRef = React.useRef<Set<string>>(new Set());
    React.useLayoutEffect(() => {
        expandedNodesRef.current = expandedNodes;
    }, [expandedNodes]);

    React.useEffect(() => {
        try {
            sessionStorage.setItem(
                getExpandedNodesStorageKey(data.post.id),
                JSON.stringify(Array.from(expandedNodes))
            );
        } catch {
            /* ignore */
        }
    }, [expandedNodes, data.post.id]);
    /** Snapshot cây sau merge get-course-list — dùng để map expandedNodes → course id (nhiều course mở cùng lúc) */
    const listMergeSnapshotRef = React.useRef<Course[] | null>(null);
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
    const [previewCount, setPreviewCount] = React.useState(0);
    const [loadingPreview, setLoadingPreview] = React.useState(false);
    const [loadingMarkLessonComplete, setLoadingMarkLessonComplete] = React.useState(false);
    const checkDataCrawRef = React.useRef<CheckDataCrawRef>(null);
    const [loadedCourseDetailIds, setLoadedCourseDetailIds] = React.useState<Set<string>>(new Set());
    /** Luôn khớp selectedCourseId (success callback của ajax có thể chạy sau nhiều render — không dùng stale closure) */
    const selectedCourseIdRef = React.useRef<string | null>(selectedCourseId);
    React.useLayoutEffect(() => {
        selectedCourseIdRef.current = selectedCourseId;
    }, [selectedCourseId]);

    /** Phải khai báo function (hoisted) trước loadData — success callback của get-course-list gọi được an toàn */
    function loadCourseDetail(courseId: string | number) {
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/get-course-detail",
            method: "POST",
            data: {
                id: data.post.id,
                course_id: courseId,
            },
            loading: false,
            success: (result: { course: Course; languages?: Language[] }) => {
                if (result.course) {
                    setCourses((prev) => {
                        if (!prev || prev.length === 0) {
                            const anyCourse = result.course as ANY;
                            return [{
                                ...result.course,
                                sections: anyCourse.sections || [],
                            }];
                        }

                        const nextCourses = prev.map((c) => {
                            if (String(c.id) !== String(result.course.id)) return c;

                            const anyDetail = result.course as ANY;
                            const merged: Course = {
                                ...c,
                                ...result.course,
                            };

                            const prevAny = c as ANY;

                            if (anyDetail.summary_data == null && prevAny.summary_data != null) {
                                merged.summary_data = prevAny.summary_data;
                            }

                            {
                                const detailSec = anyDetail.sections;
                                if (Array.isArray(detailSec) && detailSec.length > 0) {
                                    (merged as ANY).sections = detailSec;
                                } else if (detailSec === undefined || detailSec === null) {
                                    (merged as ANY).sections = prevAny.sections || [];
                                } else {
                                    (merged as ANY).sections = [];
                                }
                            }

                            return merged;
                        });

                        return mergeNodes(prev, nextCourses);
                    });
                    setLoadedCourseDetailIds((prev) => {
                        const next = new Set(prev);
                        next.add(String(result.course.id));
                        return next;
                    });
                }

                if (result.languages && result.languages.length > 0) {
                    setLanguages(result.languages);
                    if (!currentLanguageCode) {
                        const defaultLang = result.languages.find((l: Language) => l.is_default) || result.languages[0];
                        setCurrentLanguageCode(defaultLang.code);
                    }
                }
            },
        });
    }

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

    const confirmFixQuestionNotVerify = useConfirmDialog({
        title: "Xác nhận sửa câu hỏi không verify",
        message:
            "Bạn có chắc chắn muốn tự động sửa tất cả các câu hỏi chưa được verify trong khóa học này?",
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

    const handleFixQuestionNotVerify = () => {
        handleCloseMenu();
        confirmFixQuestionNotVerify.onConfirm(() => {
            api.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course-new/ai/fix-question-not-verify",
                method: "POST",
                data: {
                    id: data.post.id,
                },
            });
        });
    };

    const handleCountRiveCourse = () => {
        handleCloseMenu();
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/count-rive-course",
            method: "POST",
            data: {
                id: data.post.id,
            },
            success: (result: { message?: string; data?: ANY }) => {
                if (result.message) {
                    api.showMessage(result.message, "success");
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
            // API nhẹ chỉ load danh sách course (không kèm toàn bộ cấu trúc chi tiết)
            url: "plugin/vn4-e-learning/app-mobile/course-new/get-course-list",
            method: "POST",
            data: {
                id: data.post.id,
            },
            loading: false, // Prevent global loading indicator
            success: (result: ANY) => {
                const scheduleDetailAfterList = () => {
                    const ids = new Set<string>();

                    const tree = listMergeSnapshotRef.current;
                    if (tree && tree.length > 0) {
                        expandedNodesRef.current.forEach((nodeKey) => {
                            if (!nodeKey.startsWith("course-")) return;
                            const node = findNodeByKey(tree, nodeKey);
                            if (node && getNodeType(node) === "course") {
                                ids.add(String((node as Course).id));
                            }
                        });
                    }

                    if (selectedCourseIdRef.current) {
                        ids.add(String(selectedCourseIdRef.current));
                    }
                    const fromUrl =
                        parseCourseIdFromSearchString(window.location.search) ||
                        parseCourseIdFromSearchString(locationSearchRef.current) ||
                        parseCourseIdFromHash(window.location.hash);
                    if (fromUrl) {
                        ids.add(String(fromUrl));
                    }

                    ids.forEach((id) => loadCourseDetail(id));
                };

                try {
                    const coursesPayload: Course[] | undefined =
                        result.courses ??
                        result.data?.courses ??
                        (Array.isArray(result.data) ? (result.data as Course[]) : undefined) ??
                        result.data?.data?.courses;

                    if (coursesPayload) {
                        const normalizedCourses = coursesPayload.map((c: Course) => {
                            const anyCourse = c as ANY;

                            let summaryData = c.summary_data;
                            if (!summaryData) {
                                const hasCountField =
                                    anyCourse.count_section != null ||
                                    anyCourse.count_chapter != null ||
                                    anyCourse.count_lesson != null ||
                                    anyCourse.count_lesson_no_question != null ||
                                    anyCourse.count_question != null;

                                if (hasCountField) {
                                    summaryData = {
                                        count_section: anyCourse.count_section || 0,
                                        count_chapter: anyCourse.count_chapter || 0,
                                        count_lesson: anyCourse.count_lesson || 0,
                                        count_lesson_no_question: anyCourse.count_lesson_no_question || 0,
                                        count_question: anyCourse.count_question || 0,
                                    };
                                }
                            }

                            return {
                                ...c,
                                sections: anyCourse.sections || [],
                                summary_data: summaryData ?? c.summary_data,
                            } as Course;
                        });
                        const merged = mergeNodes(courses || [], normalizedCourses);
                        listMergeSnapshotRef.current = merged;
                        setCourses(merged);
                        setLoadedCourseDetailIds(new Set());
                    } else {
                        listMergeSnapshotRef.current = null;
                        setCourses([]);
                        setLoadedCourseDetailIds(new Set());
                    }

                    const langs = result.languages ?? result.data?.languages;
                    if (langs) {
                        setLanguages(langs);
                    }

                    if (langs && langs.length > 0 && !currentLanguageCode) {
                        const defaultLang = langs.find((l: Language) => l.is_default) || langs[0];
                        setCurrentLanguageCode(defaultLang.code);
                    }
                    setLoading(false);
                } finally {
                    // Luôn chạy kể cả khi merge/setCourses lỗi; queueMicrotask sau flush React + đọc lại URL/hash
                    queueMicrotask(scheduleDetailAfterList);
                }
            },
        });
    };

    const previewLessonCompleted = Boolean(previewNode?.is_completed);

    const handleMarkLessonComplete = () => {
        if (!previewNode?.id) return;
        setLoadingMarkLessonComplete(true);
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course-new/mark-lesson-complete",
            method: "POST",
            data: {
                lesson_id: previewNode.id,
            },
            loading: false,
            success: () => {
                setLoadingMarkLessonComplete(false);
                setPreviewNode((prev) =>
                    prev ? { ...prev, is_completed: !prev.is_completed } : null
                );
                loadData();
            },
            error: () => {
                setLoadingMarkLessonComplete(false);
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
        if (!selectedCourseId) return;
        const idStr = String(selectedCourseId);
        if (loadedCourseDetailIds.has(idStr)) return;
        loadCourseDetail(selectedCourseId);
    }, [selectedCourseId, loadedCourseDetailIds]);

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

        const sourceNode = flatNodes[source.index];
        const destNode = flatNodes[destination.index];

        if (!sourceNode || !destNode) return;

        // Only allow dragging between siblings (same parent)
        if (sourceNode.parentId !== destNode.parentId) {
            api.showMessage("Chỉ có thể thay đổi thứ tự giữa các mục cùng cấp", "warning");
            return;
        }

        if (sourceNode.parentId === "root") {
            // Root level: Courses
            const newCourses = [...(displayCourses || [])];
            const [movedCourse] = newCourses.splice(sourceNode.index, 1);
            newCourses.splice(destNode.index, 0, movedCourse);

            // To update the main courses state, we need to merge this back
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
                    loadData();
                },
                error: () => {
                    api.showMessage("Có lỗi xảy ra khi cập nhật thứ tự", "error");
                    loadData();
                }
            });
        } else {
            // Sub-level nodes (Sections, Chapters, Lessons, Questions)
            handleUpdateOrder(sourceNode.parentId, sourceNode.parentType, sourceNode.index, destNode.index);
        }
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
                allKeys.forEach((key: string) => newSet.delete(key));
            } else {
                // Open all
                allKeys.forEach((key: string) => newSet.add(key));
            }
            return newSet;
        });
    };

    const handleExpandNode = (nodeKey: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            next.add(nodeKey);
            return next;
        });

        if (!courses) return;

        const node = findNodeByKey(courses, nodeKey);
        if (!node) return;

        const nodeType = getNodeType(node);
        if (nodeType !== "course") return;

        const courseId = (node as Course).id;
        const idStr = String(courseId);
        if (loadedCourseDetailIds.has(idStr)) return;

        loadCourseDetail(courseId);
    };

    const handleRefresh = () => {
        handleCloseMenu();
        loadData();
    };

    const displayCourses = React.useMemo(() => {
        return selectedCourseId
            ? courses?.filter(c => String(c.id) === String(selectedCourseId))
            : courses;
    }, [selectedCourseId, courses]);

    const flatNodes = React.useMemo(() => {
        if (!courses) return [];
        return flattenTree(displayCourses || [], expandedNodes);
    }, [displayCourses, expandedNodes, courses]);

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

    return (
        <Box
            sx={{
                p: 2,
                backgroundColor: "#f5f5f7",
                minHeight: "100vh",
                overflowX: "hidden",
                maxWidth: "100vw",
                boxSizing: "border-box",
            }}
        >
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
                        <MenuItem onClick={handleCheckDataQuestion}>
                            <FactCheckIcon sx={{ mr: 1, fontSize: 20 }} />
                            Check verify question
                        </MenuItem>
                        <MenuItem onClick={handleFixQuestionNotVerify}>
                            <FactCheckIcon sx={{ mr: 1, fontSize: 20 }} />
                            Fix question not verify
                        </MenuItem>
                        <MenuItem onClick={handleCountRiveCourse}>
                            <AnimationIcon sx={{ mr: 1, fontSize: 20 }} />
                            Đếm rive/Chat AI/Run code
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
                <Droppable droppableId="flat-tree-virtuoso" type="FLAT_NODE">
                    {(provided) => (
                        <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            sx={{
                                mt: 2,
                                backgroundColor: "transparent",
                                // Cho phép Virtuoso chiếm chiều cao và tự scroll
                                height: "calc(100vh - 180px)",
                                overflowX: "hidden",
                            }}
                        >
                            <Virtuoso
                                style={{ height: "100%", overflowX: "hidden" }}
                                data={flatNodes}
                                totalCount={flatNodes.length}
                                itemContent={(index, flatNode) => {
                                    const { node, depth, parentContext, nodeKey } = flatNode;
                                    return (
                                        <Draggable
                                            key={nodeKey}
                                            draggableId={nodeKey}
                                            index={index}
                                        >
                                            {(dragProvided) => (
                                                <div
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                    style={{
                                                        ...dragProvided.draggableProps.style,
                                                        marginBottom: 4
                                                    }}
                                                >
                                                    <CourseTreeItem
                                                        node={node}
                                                        depth={depth}
                                                        onEditNode={handleEditNode}
                                                        onAddChild={handleAddChild}
                                                        onUpdateOrder={handleUpdateOrder}
                                                        dragHandleProps={dragProvided.dragHandleProps}
                                                        currentLanguageCode={currentLanguageCode}
                                                        languages={languages}
                                                        postId={data.post.id}
                                                        onReloadCourses={loadData}
                                                        onUpdateLessonStatus={handleUpdateLessonStatus}
                                                        expandedNodes={expandedNodes}
                                                        onExpandAll={handleExpandAll}
                                                        onExpandNode={handleExpandNode}
                                                        onCollapse={(key: string) => setExpandedNodes(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(key);
                                                            return next;
                                                        })}
                                                        onSelectCourseForEdit={handleSelectCourseForEdit}
                                                        onBackToCourseList={handleBackToCourseList}
                                                        selectedCourseId={selectedCourseId}
                                                        onPreviewLesson={setPreviewNode}
                                                        parentContext={parentContext}
                                                        isFlatMode={true}
                                                        index={flatNode.index}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                }}
                                components={{
                                    Footer: () => <Box sx={{ height: 1 }}>{provided.placeholder}</Box>
                                }}
                            />
                        </Box>
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
            {confirmFixQuestionNotVerify.component}

            <DrawerCustom
                open={Boolean(previewNode)}
                onClose={() => {
                    setPreviewNode(null);
                    setPreviewCount(0);
                }}
                activeOnClose
                width={1900}
                title={previewCount > 0 ? `Preview Questions (${previewCount})` : "Preview Questions"}
                headerAction={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <LoadingButton
                            size="small"
                            variant="contained"
                            loading={loadingPreview}
                            onClick={() => checkDataCrawRef.current?.refreshPreview()}
                            sx={{
                                color: "primary.main",
                                backgroundColor: "white",
                                "&:hover": {
                                    backgroundColor: "rgba(255,255,255,0.9)",
                                },
                                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                            }}
                        >
                            Refresh
                        </LoadingButton>
                        <LoadingButton
                            size="small"
                            variant="contained"
                            color={previewLessonCompleted ? "success" : "primary"}
                            loading={loadingMarkLessonComplete}
                            disabled={!previewNode?.id}
                            onClick={handleMarkLessonComplete}
                            title={
                                previewLessonCompleted
                                    ? "Nhấn để bỏ trạng thái hoàn thành lesson"
                                    : "Nhấn để đánh dấu lesson đã hoàn thành"
                            }
                            sx={
                                previewLessonCompleted
                                    ? {
                                          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                                      }
                                    : {
                                          color: "primary.main",
                                          backgroundColor: "white",
                                          "&:hover": {
                                              backgroundColor: "rgba(255,255,255,0.9)",
                                          },
                                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                      }
                            }
                        >
                            {previewLessonCompleted ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
                        </LoadingButton>
                    </Box>
                }
                restDialogContent={{
                    sx: {
                        padding: 0,
                        overflow: 'hidden',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }}
            >
                {previewNode && (
                    <CheckDataCraw
                        ref={checkDataCrawRef}
                        post={previewNode}
                        appMobileId={data?.post?.id}
                        config={{ title: 'Preview Questions' }}
                        name="link_data_craw_json"
                        onReview={() => { /* review */ }}
                        component="check_data_craw"
                        autoPreview={true}
                        onPreviewDataChange={(data: ANY) => setPreviewCount(data?.count ?? 0)}
                        onLoadingChange={setLoadingPreview}
                    />
                )}
            </DrawerCustom>
            {confirmSyncConfig.component}

            <SyncProgressDialog
                open={syncProgressDialogOpen}
                title={syncDialogTitle}
                onClose={() => {
                    setSyncProgressDialogOpen(false);
                }}
                progress={streamSync.progress}
                currentStage={streamSync.currentStage}
                messages={streamSync.messages}
                error={streamSync.error}
                isSyncing={streamSync.isSyncing}
                totalObjects={streamSync.totalObjects}
                completedObjects={streamSync.completedObjects}
                warnings={streamSync.warnings}
            />
        </Box>
    );
}
