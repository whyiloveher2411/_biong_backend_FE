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
import Menu from "components/atoms/Menu";
import MenuItem from "components/atoms/MenuItem";
import IconButton from "components/atoms/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
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
import { Course, TreeNode, CourseNodeMap, Translate, Section, Chapter, Lesson, Question } from "./types";
import {
    getNodeType,
    getNodeKey,
    getNodeObjectType,
    getChildType,
    getChildren,
} from "./utils";
import {
    getLanguageCodeFromTranslate,
    buildCourseNodeMap,
    findTranslateParent,
} from "./helpers";
import CourseTreeItem from "./CourseTreeItem";
import LanguageSelector from "./LanguageSelector";

export default function CourseTree({ data }: { data: CreatePostTypeData }) {
    const api = useAjax();
    const apiSyncCourses = useAjax();
    const apiExportCourse = useAjax();
    const apiImportCourse = useAjax();
    const navigate = useNavigate();
    const location = useLocation();
    const [courses, setCourses] = React.useState<Course[] | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [languages, setLanguages] = React.useState<Array<{ code: string; title: string; flag_code: string; icon_url?: string; id?: string | number }>>([]);
    const languagesRef = React.useRef<Array<{ code: string; title: string; flag_code: string; icon_url?: string; id?: string | number }>>([]);
    const [courseNodeMap, setCourseNodeMap] = React.useState<CourseNodeMap>({});
    const [openDrawer, setOpenDrawer] = React.useState(false);
    const [drawerData, setDrawerData] = React.useState<
        DataResultApiProps | false
    >(false);
    const [currentEditNodeType, setCurrentEditNodeType] = React.useState<string | null>(null);
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
    const confirmExport = useConfirmDialog({
        title: "Xác nhận Export Course",
        message:
            "Bạn có chắc chắn muốn export course? File export sẽ được tải xuống sau khi hoàn tất.",
    });

    const handleBackToOverview = () => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("view", "overview"); // Set view=overview để quay về overview
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
        confirmExport.onConfirm(() => {
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

        // Lưu nodeType để biết có phải translate/section không
        setCurrentEditNodeType(nodeType);

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

    const handleCreateCopyFromEnglish = (
        langCode: string,
        nodeKey: string,
        nodeType: string,
        courseId: string
    ) => {
        console.log("[handleCreateCopyFromEnglish] Bắt đầu:", {
            langCode,
            nodeKey,
            nodeType,
            courseId,
        });

        // Chỉ xử lý cho question
        if (nodeType !== "question") {
            console.log("[handleCreateCopyFromEnglish] Bỏ qua - không phải question");
            return;
        }

        if (!courseId || !courses) {
            console.log("[handleCreateCopyFromEnglish] Lỗi: Không tìm thấy course");
            api.showMessage("Không tìm thấy course", "error");
            return;
        }

        // Tạo map key để tìm node tiếng Anh
        const mapKey = `course_${courseId}_${nodeType}_${nodeKey}`;
        const nodeMap = courseNodeMap[mapKey] || {};
        console.log("[handleCreateCopyFromEnglish] Map key:", mapKey);
        console.log("[handleCreateCopyFromEnglish] Node map:", nodeMap);

        // Tìm node tiếng Anh (thường là "en" hoặc ngôn ngữ đầu tiên có sẵn)
        let englishNode: Question | null = null;
        const englishLang = languages.find(lang => lang.code === "en") || languages[0];
        console.log("[handleCreateCopyFromEnglish] English lang:", englishLang);
        
        if (englishLang && nodeMap[englishLang.code]) {
            englishNode = nodeMap[englishLang.code] as Question;
            console.log("[handleCreateCopyFromEnglish] Tìm thấy English node:", englishNode);
        } else {
            console.log("[handleCreateCopyFromEnglish] Không tìm thấy English node trong map");
        }

        if (!englishNode || !englishNode.id) {
            console.log("[handleCreateCopyFromEnglish] Lỗi: Không tìm thấy bản tiếng Anh để copy");
            api.showMessage("Không tìm thấy bản tiếng Anh để copy", "error");
            return;
        }

        const objectType = getNodeObjectType(nodeType);
        if (!objectType) {
            api.showMessage(
                `Không tìm thấy object type cho ${nodeType}`,
                "error"
            );
            return;
        }

        // Lưu englishNode.id vào biến để tránh lỗi TypeScript trong callback
        const englishNodeId = englishNode.id;

        // Lấy dữ liệu của node tiếng Anh
        api.ajax({
            url: `post-type/detail/${objectType}/${englishNodeId}`,
            method: "POST",
            data: {
                id: englishNodeId,
            },
            success: (result: ANY) => {
                console.log("[handleCreateCopyFromEnglish] API success - result.post:", result.post);
                
                if (result.post) {
                    // Tìm lesson key từ question tiếng Anh
                    // Tìm lesson chứa question này trong cây courses để lấy lesson.key
                    let lessonKey: string | null = null;
                    console.log("[handleCreateCopyFromEnglish] Tìm lesson key cho question ID:", englishNodeId);
                    
                    for (const course of courses) {
                        if (course.id !== courseId) continue; // Chỉ tìm trong course hiện tại
                        if (course.translates) {
                            for (const translate of course.translates) {
                                if (translate.sections) {
                                    for (const section of translate.sections) {
                                        if (section.chapters) {
                                            for (const chapter of section.chapters) {
                                                if (chapter.lessons) {
                                                    for (const lesson of chapter.lessons) {
                                                        if (lesson.questions?.some(q => q.id === englishNodeId)) {
                                                            lessonKey = lesson.key || null;
                                                            console.log("[handleCreateCopyFromEnglish] Tìm thấy lesson key:", lessonKey, "từ lesson:", lesson);
                                                            break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (lessonKey) break; // Đã tìm thấy, dừng lại
                    }

                    if (!lessonKey) {
                        console.log("[handleCreateCopyFromEnglish] Không tìm thấy lesson key");
                    }

                    // Tìm lesson parent đúng ngôn ngữ từ courseNodeMap
                    let lessonParentId: string | null = null;
                    let targetLessonNode: Lesson | null = null;
                    
                    if (lessonKey) {
                        const lessonMapKey = `course_${courseId}_lesson_${lessonKey}`;
                        const lessonNodeMap = courseNodeMap[lessonMapKey] || {};
                        console.log("[handleCreateCopyFromEnglish] Lesson map key:", lessonMapKey);
                        console.log("[handleCreateCopyFromEnglish] Lesson node map:", lessonNodeMap);
                        
                        targetLessonNode = lessonNodeMap[langCode] as Lesson | null;
                        console.log("[handleCreateCopyFromEnglish] Target lesson node cho langCode", langCode, ":", targetLessonNode);
                        
                        if (targetLessonNode && targetLessonNode.id) {
                            lessonParentId = targetLessonNode.id;
                            console.log("[handleCreateCopyFromEnglish] Tìm thấy lesson parent ID đúng ngôn ngữ:", lessonParentId);
                        } else {
                            // Fallback: nếu không tìm thấy lesson đúng ngôn ngữ, 
                            // thử dùng lesson tiếng Anh (từ result.post.sac_lesson nếu có)
                            if (result.post.sac_lesson) {
                                lessonParentId = result.post.sac_lesson;
                                // Tìm lesson node tiếng Anh để lấy title
                                const englishLessonNode = lessonNodeMap[englishLang.code] as Lesson | null;
                                if (englishLessonNode) {
                                    targetLessonNode = englishLessonNode;
                                }
                                console.log("[handleCreateCopyFromEnglish] Fallback: Dùng lesson từ post tiếng Anh:", lessonParentId);
                            } else {
                                console.log("[handleCreateCopyFromEnglish] Không tìm thấy lesson parent và không có fallback");
                            }
                        }
                    } else {
                        // Nếu không tìm thấy lessonKey, dùng lesson từ post tiếng Anh
                        if (result.post.sac_lesson) {
                            lessonParentId = result.post.sac_lesson;
                            // Nếu có sac_lesson_detail trong post, dùng nó
                            if (result.post.sac_lesson_detail) {
                                try {
                                    const lessonDetail = typeof result.post.sac_lesson_detail === 'string' 
                                        ? JSON.parse(result.post.sac_lesson_detail) 
                                        : result.post.sac_lesson_detail;
                                    targetLessonNode = { id: lessonDetail.id, title: lessonDetail.title } as Lesson;
                                } catch (e) {
                                    console.warn("[handleCreateCopyFromEnglish] Không parse được sac_lesson_detail:", e);
                                }
                            }
                            console.log("[handleCreateCopyFromEnglish] Không có lessonKey, dùng lesson từ post:", lessonParentId);
                        } else {
                            console.log("[handleCreateCopyFromEnglish] Không có lessonKey và không có sac_lesson trong post");
                        }
                    }

                    // Tạo dữ liệu mới từ bản tiếng Anh
                    // Copy tất cả dữ liệu và loại bỏ các field không cần thiết khi tạo mới
                    const newPostData: ANY = { ...result.post };
                    console.log("[handleCreateCopyFromEnglish] Post data ban đầu:", newPostData);
                    
                    // Xóa các field ID và metadata không cần thiết
                    delete newPostData.id;
                    delete newPostData.created_at;
                    delete newPostData.updated_at;
                    console.log("[handleCreateCopyFromEnglish] Sau khi xóa id, created_at, updated_at");
                    
                    // Set relationship với lesson parent đúng ngôn ngữ
                    if (lessonParentId) {
                        newPostData.sac_lesson = lessonParentId;
                        console.log("[handleCreateCopyFromEnglish] Set sac_lesson:", lessonParentId);
                        
                        // Set sac_lesson_detail với thông tin của lesson node
                        if (targetLessonNode && targetLessonNode.id && targetLessonNode.title) {
                            newPostData.sac_lesson_detail = {
                                id: targetLessonNode.id,
                                title: targetLessonNode.title,
                            };
                            console.log("[handleCreateCopyFromEnglish] Set sac_lesson_detail:", newPostData.sac_lesson_detail);
                        } else {
                            console.log("[handleCreateCopyFromEnglish] Không có targetLessonNode để set sac_lesson_detail");
                        }
                    } else {
                        console.log("[handleCreateCopyFromEnglish] Không set sac_lesson vì không có lessonParentId");
                    }
                    
                    // Set ngôn ngữ mới (nếu có field language)
                    const targetLang = languages.find(lang => lang.code === langCode);
                    console.log("[handleCreateCopyFromEnglish] Target lang:", targetLang);
                    
                    if (targetLang) {
                        // Tìm language ID từ languages array nếu có
                        if (targetLang.id) {
                            newPostData.sac_language = targetLang.id;
                            console.log("[handleCreateCopyFromEnglish] Set sac_language:", targetLang.id);
                        }
                        // Hoặc set language code nếu có field language
                        if (newPostData.language !== undefined) {
                            newPostData.language = langCode;
                            console.log("[handleCreateCopyFromEnglish] Set language code:", langCode);
                        }
                    }

                    console.log("[handleCreateCopyFromEnglish] Post data cuối cùng:", newPostData);

                    const addData: DataResultApiProps = {
                        ...result,
                        post: newPostData,
                        type: objectType,
                        action: "ADD_NEW",
                    };
                    
                    console.log("[handleCreateCopyFromEnglish] Mở drawer với data:", addData);
                    
                    setCurrentEditNodeType(nodeType);
                    setDrawerData(addData);
                    setOpenDrawer(true);
                } else {
                    api.showMessage(
                        `Không tìm thấy dữ liệu để copy`,
                        "error"
                    );
                }
            },
            error: () => {
                api.showMessage(
                    `Không thể tải dữ liệu từ bản tiếng Anh`,
                    "error"
                );
            },
        });
    };

    const handleCloseDrawer = () => {
        setOpenDrawer(false);
        setDrawerData(false);
        setCurrentEditNodeType(null);
    };

    // Helper function để set courses và build map cùng lúc
    const setCoursesAndBuildMap = React.useCallback((coursesData: Course[]) => {
        setCourses(coursesData);
        if (coursesData.length > 0) {
            // Sử dụng languagesRef.current thay vì languages để tránh dependency loop
            const map = buildCourseNodeMap(coursesData, languagesRef.current);
            setCourseNodeMap(map);
        } else {
            setCourseNodeMap({});
        }
    }, []); // Không cần dependencies vì đã dùng ref

    // Helper function: Tìm courseId chứa post với postId
    const findCourseIdByPostId = (postId: string, coursesList: Course[]): string | null => {
        // Hàm đệ quy để tìm node và trả về courseId
        const findCourseId = (nodes: TreeNode[], targetId: string, currentCourseId: string | null): string | null => {
            for (const node of nodes) {
                // Nếu node là course và có id trùng, return courseId
                if (getNodeType(node) === "course" && node.id === targetId) {
                    return node.id;
                }
                
                // Nếu tìm thấy node với id trùng, return courseId hiện tại
                if (node.id === targetId && currentCourseId) {
                    return currentCourseId;
                }
                
                // Nếu node là course, update currentCourseId
                let newCourseId = currentCourseId;
                if (getNodeType(node) === "course") {
                    newCourseId = node.id;
                }
                
                // Tìm trong children
                const children = getChildren(node);
                const found = findCourseId(children, targetId, newCourseId);
                if (found) return found;
            }
            return null;
        };

        for (const course of coursesList) {
            const found = findCourseId([course], postId, course.id);
            if (found) {
                return found;
            }
        }
        return null;
    };

    // Hàm để navigate đến post tương ứng với ngôn ngữ khác
    const handleNavigateToLanguage = (langCode: string, postId: string) => {
        if (!currentEditNodeType) return;

        const objectType = getNodeObjectType(currentEditNodeType);
        if (!objectType) {
            api.showMessage(
                `Không tìm thấy object type cho ${currentEditNodeType}`,
                "error"
            );
            return;
        }

        api.ajax({
            url: `post-type/detail/${objectType}/${postId}`,
            method: "POST",
            data: {
                id: postId,
            },
            success: (result: ANY) => {
                if (result.post) {
                    const editData: DataResultApiProps = {
                        ...result,
                        type: objectType,
                        action: "EDIT",
                    };
                    setDrawerData(editData);
                    // Giữ nguyên openDrawer và currentEditNodeType
                } else {
                    api.showMessage(
                        `Không tìm thấy dữ liệu để chỉnh sửa`,
                        "error"
                    );
                }
            },
            error: (response: Response) => {
                api.showMessage(
                    `Không thể tải dữ liệu cho ngôn ngữ ${langCode}`,
                    "error"
                );
            },
        });
    };

    // Hàm đệ quy để lấy tất cả keys của node và children
    const getAllNodeKeys = (node: TreeNode): string[] => {
        const keys = [getNodeKey(node)];
        const children = getChildren(node);
        children.forEach((child: TreeNode) => {
            keys.push(...getAllNodeKeys(child));
        });
        return keys;
    };

    // Hàm đệ quy để lấy tất cả keys của children (không bao gồm node cha)
    const getAllChildrenKeys = (node: TreeNode): string[] => {
        const keys: string[] = [];
        const children = getChildren(node);
        children.forEach((child: TreeNode) => {
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
        setCoursesAndBuildMap(updatedCourses);

        // Lấy danh sách IDs theo thứ tự mới từ cây đã được update
        const getChildrenIds = (node: TreeNode): string[] => {
            const children = getChildren(node);
            const ids = children.map((child: TreeNode) => child.id).filter((id: string | undefined): id is string => !!id); // Lọc bỏ các id null/undefined
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
                            let coursesData: Course[] = [];
                            if (result.courses) {
                                coursesData = result.courses;
                            } else if (Array.isArray(result)) {
                                coursesData = result;
                            } else {
                                coursesData = [];
                            }
                            setCoursesAndBuildMap(coursesData);
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
                            let coursesData: Course[] = [];
                            if (result.courses) {
                                coursesData = result.courses;
                            } else if (Array.isArray(result)) {
                                coursesData = result;
                            } else {
                                coursesData = [];
                            }
                            setCoursesAndBuildMap(coursesData);
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
                let coursesData: Course[] = [];
                if (result.courses) {
                    coursesData = result.courses;
                } else if (Array.isArray(result)) {
                    coursesData = result;
                } else {
                    coursesData = [];
                }
                // Lưu languages từ response nếu có (set trước để có thể dùng khi build map)
                if (result.languages && Array.isArray(result.languages)) {
                    setLanguages(result.languages);
                    languagesRef.current = result.languages; // Cập nhật ref cùng lúc
                }
                setCoursesAndBuildMap(coursesData);
                setLoading(false);
            },
            error: () => {
                setLoading(false);
                setCoursesAndBuildMap([]);
            },
        });
    }, [data.post.id]); // Loại bỏ setCoursesAndBuildMap khỏi dependencies

    // Rebuild map khi languages thay đổi (nếu courses đã có)
    // Chỉ rebuild khi languages thay đổi, không rebuild khi courses thay đổi
    // vì setCoursesAndBuildMap đã build map khi courses được set
    React.useEffect(() => {
        if (courses && courses.length > 0 && languages.length > 0) {
            languagesRef.current = languages; // Cập nhật ref
            const map = buildCourseNodeMap(courses, languages);
            setCourseNodeMap(map);
        }
    }, [languages]); // Chỉ phụ thuộc vào languages, không phụ thuộc vào courses

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
                            setCoursesAndBuildMap(newCourses);

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
                            let coursesData: Course[] = [];
                            if (result.courses) {
                                coursesData = result.courses;
                            } else if (Array.isArray(result)) {
                                coursesData = result;
                            } else {
                                coursesData = [];
                            }
                            setCoursesAndBuildMap(coursesData);
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
                                                        onCreateCopyFromEnglish={
                                                            handleCreateCopyFromEnglish
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
                                                        languages={languages}
                                                        courseNodeMap={courseNodeMap}
                                                        findCourseIdByPostId={findCourseIdByPostId}
                                                        courses={courses}
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
                    headerAction={
                        /* Language Selector - hiển thị khi edit translate, section, chapter, lesson, question */
                        (() => {
                            const shouldShow = (currentEditNodeType === "translate" || 
                                             currentEditNodeType === "section" || 
                                             currentEditNodeType === "chapter" || 
                                             currentEditNodeType === "lesson" || 
                                             currentEditNodeType === "question") && 
                                             languages.length > 0 && 
                                             drawerData && 
                                             courses;

                            if (!shouldShow) return undefined;

                            // Lấy key từ post hiện tại
                            // Với question thì dùng title, các node type khác dùng key
                            const currentKey = currentEditNodeType === "question" 
                                ? drawerData.post?.title 
                                : drawerData.post?.key;
                            const currentPostId = drawerData.post?.id;
                            
                            if (!currentKey || !currentEditNodeType || !currentPostId || !courses) {
                                return undefined;
                            }

                            // Tìm courseId chứa post hiện tại
                            const courseId = findCourseIdByPostId(currentPostId, courses);
                            if (!courseId) {
                                return undefined;
                            }

                            // Tạo map key: course_{courseId}_{nodeType}_{key}
                            const mapKey = `course_${courseId}_${currentEditNodeType}_${currentKey}`;
                            
                            // Lookup trong courseNodeMap
                            const nodeMap = courseNodeMap[mapKey];
                            
                            // Tạo availableLanguages array từ map
                            const availableLanguages = languages.map((lang) => {
                                const node = nodeMap?.[lang.code];
                                return {
                                    code: lang.code,
                                    postId: node?.id || null,
                                };
                            });

                            // Lấy current language từ translate parent của post hiện tại
                            let currentLanguage = "";
                            
                            // Tìm node trong cây, với option để filter theo node type
                            const findNodeById = (nodes: TreeNode[], targetId: string, expectedType?: string): TreeNode | null => {
                                for (const node of nodes) {
                                    // Nếu có expectedType, chỉ return node nếu type khớp
                                    if (node.id === targetId) {
                                        if (expectedType) {
                                            const nodeType = getNodeType(node);
                                            if (nodeType === expectedType) {
                                                return node;
                                            }
                                            // Nếu type không khớp, tiếp tục tìm trong children
                                        } else {
                                            return node;
                                        }
                                    }
                                    const children = getChildren(node);
                                    const found = findNodeById(children, targetId, expectedType);
                                    if (found) return found;
                                }
                                return null;
                            };
                            
                            // Set expectedType dựa trên currentEditNodeType để tìm đúng node type
                            const expectedType = currentEditNodeType === "translate" ? "translate" 
                                              : currentEditNodeType === "section" ? "section"
                                              : currentEditNodeType === "chapter" ? "chapter"
                                              : currentEditNodeType === "lesson" ? "lesson"
                                              : currentEditNodeType === "question" ? "question"
                                              : undefined;
                            const currentNode = findNodeById(courses, currentPostId, expectedType);
                            
                            if (currentNode) {
                                // Nếu node hiện tại là translate, dùng trực tiếp để extract language
                                if (currentEditNodeType === "translate") {
                                    const translateNode = currentNode as Translate;
                                    currentLanguage = getLanguageCodeFromTranslate(translateNode, languages);
                                } else {
                                    // Nếu là các node type khác (section, chapter, lesson, question), tìm translate parent
                                    const translateParent = findTranslateParent(currentNode, courses);
                                    if (translateParent) {
                                        // Sử dụng hàm getLanguageCodeFromTranslate để extract language code chính xác
                                        currentLanguage = getLanguageCodeFromTranslate(translateParent, languages);
                                    }
                                }
                            }

                            return (
                                <LanguageSelector
                                    languages={languages}
                                    currentLanguage={currentLanguage}
                                    availableLanguages={availableLanguages}
                                    onNavigateToLanguage={handleNavigateToLanguage}
                                />
                            );
                        })()
                    }
                />
            )}
            {confirmSync.component}
            {confirmImport.component}
            {confirmExport.component}
        </Box>
    );
}
