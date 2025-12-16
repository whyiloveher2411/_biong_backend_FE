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
    buildCourseNodeMapKey,
} from "./helpers";
import CourseTreeItem from "./CourseTreeItem";
import LanguageSelector from "./LanguageSelector";
import MultiLanguageDrawer from "./MultiLanguageDrawer";

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
    const [isCopying, setIsCopying] = React.useState(false);
    const [copyingFromLanguage, setCopyingFromLanguage] = React.useState<string>("en");
    const [initialHasKey, setInitialHasKey] = React.useState<boolean>(false);
    const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
        new Set()
    );
    const [selectedCourseId, setSelectedCourseId] = React.useState<string | null>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get("course") || null;
    });
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

    // Đồng bộ selectedCourseId với URL (trường hợp user dùng back/forward)
    React.useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const courseId = searchParams.get("course");
        setSelectedCourseId(courseId || null);
    }, [location.search]);

    const handleBackToOverview = () => {
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("view", "overview"); // Set view=overview để quay về overview
        navigate(`${location.pathname}?${searchParams.toString()}`);
    };

    const handleSelectCourseForEdit = (courseId: string) => {
        setSelectedCourseId(courseId);
        const searchParams = new URLSearchParams(location.search);
        searchParams.set("course", courseId);
        navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    };

    const handleBackToCourseList = () => {
        setSelectedCourseId(null);
        const searchParams = new URLSearchParams(location.search);
        searchParams.delete("course");
        const query = searchParams.toString();
        const url = query ? `${location.pathname}?${query}` : location.pathname;
        navigate(url, { replace: true });
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
                    setIsCopying(false); // Clear copy state khi thêm mới bình thường
                    setInitialHasKey(false); // Post mới chưa có key
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
                    setIsCopying(false); // Clear copy state khi thêm mới bình thường
                    setInitialHasKey(false); // Post mới chưa có key
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
        setIsCopying(false); // Clear copy state khi edit bình thường

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
                    // Lưu trạng thái ban đầu: có key hay không
                    const hasKey = nodeType === "question" 
                        ? !!result.post.title 
                        : !!result.post.key;
                    setInitialHasKey(hasKey);
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
        // Chỉ xử lý cho question, translate, section, chapter và lesson
        if (nodeType !== "question" && nodeType !== "translate" && nodeType !== "section" && nodeType !== "chapter" && nodeType !== "lesson") {
            return;
        }

        if (!courseId || !courses) {
            api.showMessage("Không tìm thấy course", "error");
            return;
        }

        // Kiểm tra parent node có tồn tại trong ngôn ngữ target không
        // Nếu parent chưa có thì không thể copy child
        const checkParentExists = (): boolean => {
            if (nodeType === "translate") {
                // Translate không có parent (parent là course)
                return true;
            }

            // Tìm parent key từ node tiếng Anh
            let parentKey: string | null = null;
            let parentType: string | null = null;

            // Tìm parent trong cây courses
            for (const course of courses) {
                if (String(course.id) !== String(courseId)) continue;
                if (course.translates) {
                    for (const translate of course.translates) {
                        if (nodeType === "section") {
                            // Section parent là translate
                            if (translate.sections?.some(s => s.key === nodeKey)) {
                                parentKey = translate.key || null;
                                parentType = "translate";
                                break;
                            }
                        } else if (nodeType === "chapter") {
                            // Chapter parent là section
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters?.some(c => c.key === nodeKey)) {
                                        parentKey = section.key || null;
                                        parentType = "section";
                                        break;
                                    }
                                }
                            }
                        } else if (nodeType === "lesson") {
                            // Lesson parent là chapter
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters) {
                                        for (const chapter of section.chapters) {
                                            if (chapter.lessons?.some(l => l.key === nodeKey)) {
                                                parentKey = chapter.key || null;
                                                parentType = "chapter";
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (nodeType === "question") {
                            // Question parent là lesson
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters) {
                                        for (const chapter of section.chapters) {
                                            if (chapter.lessons) {
                                                for (const lesson of chapter.lessons) {
                                                    if (lesson.questions?.some(q => q.title === nodeKey)) {
                                                        parentKey = lesson.key || null;
                                                        parentType = "lesson";
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
                }
                if (parentKey && parentType) break;
            }

            if (!parentKey || !parentType) {
                return false;
            }

            // Kiểm tra parent có tồn tại trong ngôn ngữ target không
            // (ở đây parent chỉ dùng cho translate/section/chapter/lesson, question xử lý riêng)
            let parentMapKey: string | null = null;
            if (parentType === "section") {
                parentMapKey = buildCourseNodeMapKey({
                    courseId: String(courseId),
                    sectionKey: parentKey,
                });
            } else if (parentType === "chapter") {
                parentMapKey = buildCourseNodeMapKey({
                    courseId: String(courseId),
                    chapterKey: parentKey,
                });
            } else if (parentType === "lesson") {
                parentMapKey = buildCourseNodeMapKey({
                    courseId: String(courseId),
                    lessonKey: parentKey,
                });
            }
            if (!parentMapKey) {
                return false;
            }
            const parentNodeMap = courseNodeMap[parentMapKey] || {};
            const parentExists = !!parentNodeMap[langCode];

            if (!parentExists) {
                const parentLabels: Record<string, string> = {
                    translate: "Translate",
                    section: "Section",
                    chapter: "Chapter",
                    lesson: "Lesson",
                };
                const parentLabel = parentLabels[parentType] || parentType;
                api.showMessage(
                    `Không thể copy vì ${parentLabel} chưa được tạo cho ngôn ngữ này. Vui lòng tạo ${parentLabel} trước.`,
                    "error"
                );
                return false;
            }

            return true;
        };

        // Validate parent trước khi tiếp tục
        if (!checkParentExists()) {
            return;
        }

        // Tạo map key để tìm node tiếng Anh (chỉ áp dụng tốt cho translate với key duy nhất)
        let nodeMap: Record<string, TreeNode> = {};
        if (nodeType === "translate") {
            const mapKey = buildCourseNodeMapKey({
                courseId: String(courseId),
                translateKey: nodeKey,
            });
            nodeMap = courseNodeMap[mapKey] || {};
        }

        // Tìm node tiếng Anh (thường là "en" hoặc ngôn ngữ đầu tiên có sẵn)
        let englishNode: TreeNode | null = null;
        const englishLang = languages.find(lang => lang.code === "en") || languages[0];
        if (englishLang && nodeMap[englishLang.code]) {
            englishNode = nodeMap[englishLang.code] as TreeNode;
        }

        if (!englishNode || !englishNode.id) {
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
                
                if (result.post) {
                    // Khai báo các biến cho question, section, chapter và lesson
                    let lessonParentId: string | null = null;
                    let targetLessonNode: Lesson | null = null;
                    let translateParentId: string | null = null;
                    let targetTranslateNode: Translate | null = null;
                    let sectionParentId: string | null = null;
                    let targetSectionNode: Section | null = null;
                    let chapterParentId: string | null = null;
                    let targetChapterNode: Chapter | null = null;
                    
                    // Xử lý khác nhau cho question, translate, section, chapter và lesson
                    if (nodeType === "question") {
                        // Tìm lesson key từ question tiếng Anh
                        // Tìm lesson chứa question này trong cây courses để lấy lesson.key
                        let lessonKey: string | null = null;
                        
                        for (const course of courses) {
                            if (String(course.id) !== String(courseId)) continue; // Chỉ tìm trong course hiện tại
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


                        // Tìm lesson parent đúng ngôn ngữ từ courseNodeMap
                        if (lessonKey) {
                            const lessonMapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                lessonKey,
                            });
                            const lessonNodeMap = courseNodeMap[lessonMapKey] || {};
                            
                            targetLessonNode = lessonNodeMap[langCode] as Lesson | null;
                            
                            if (targetLessonNode && targetLessonNode.id) {
                                lessonParentId = targetLessonNode.id;
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
                                        // ignore JSON parse error, giữ nguyên targetLessonNode mặc định
                                    }
                                }
                            }
                        }
                    } else if (nodeType === "translate") {
                        // Với translate, không cần tìm lesson parent
                        // Translate thuộc về course, sẽ set course và course_detail
                    } else if (nodeType === "section") {
                        // Tìm translate key từ section tiếng Anh
                        // Tìm translate chứa section này trong cây courses để lấy translate.key
                        let translateKey: string | null = null;
                        
                        for (const course of courses) {
                            if (String(course.id) !== String(courseId)) continue; // Chỉ tìm trong course hiện tại
                            if (course.translates) {
                                for (const translate of course.translates) {
                                    if (translate.sections?.some(s => s.id === englishNodeId)) {
                                        translateKey = translate.key || null;
                                        break;
                                    }
                                }
                            }
                            if (translateKey) break; // Đã tìm thấy, dừng lại
                        }


                        // Tìm translate parent đúng ngôn ngữ từ courseNodeMap
                        if (translateKey) {
                            const translateMapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                translateKey,
                            });
                            const translateNodeMap = courseNodeMap[translateMapKey] || {};
                            
                            targetTranslateNode = translateNodeMap[langCode] as Translate | null;
                            
                            if (targetTranslateNode && targetTranslateNode.id) {
                                translateParentId = targetTranslateNode.id;
                            } else {
                                // Fallback: nếu không tìm thấy translate đúng ngôn ngữ, 
                                // thử dùng translate tiếng Anh (từ result.post.translate nếu có)
                                if (result.post.translate) {
                                    translateParentId = result.post.translate;
                                    // Tìm translate node tiếng Anh để lấy title
                                    const englishTranslateNode = translateNodeMap[englishLang.code] as Translate | null;
                                    if (englishTranslateNode) {
                                        targetTranslateNode = englishTranslateNode;
                                    }
                                }
                            }
                        } else {
                            // Nếu không tìm thấy translateKey, dùng translate từ post tiếng Anh
                            if (result.post.translate) {
                                translateParentId = result.post.translate;
                                // Nếu có translate_detail trong post, dùng nó
                                if (result.post.translate_detail) {
                                    try {
                                        const translateDetail = typeof result.post.translate_detail === 'string' 
                                            ? JSON.parse(result.post.translate_detail) 
                                            : result.post.translate_detail;
                                        targetTranslateNode = { id: translateDetail.id, title: translateDetail.title } as Translate;
                                    } catch (e) {
                                        // ignore JSON parse error, giữ nguyên targetTranslateNode mặc định
                                    }
                                }
                            }
                        }
                    } else if (nodeType === "chapter") {
                        // Tìm section key từ chapter tiếng Anh
                        // Tìm section chứa chapter này trong cây courses để lấy section.key
                        let sectionKey: string | null = null;
                        
                        for (const course of courses) {
                            if (String(course.id) !== String(courseId)) continue; // Chỉ tìm trong course hiện tại
                            if (course.translates) {
                                for (const translate of course.translates) {
                                    if (translate.sections) {
                                        for (const section of translate.sections) {
                                            if (section.chapters?.some(c => c.id === englishNodeId)) {
                                                sectionKey = section.key || null;
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                            if (sectionKey) break; // Đã tìm thấy, dừng lại
                        }


                        // Tìm section parent đúng ngôn ngữ từ courseNodeMap
                        if (sectionKey) {
                            const sectionMapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                sectionKey,
                            });
                            const sectionNodeMap = courseNodeMap[sectionMapKey] || {};
                            
                            targetSectionNode = sectionNodeMap[langCode] as Section | null;
                            
                            if (targetSectionNode && targetSectionNode.id) {
                                sectionParentId = targetSectionNode.id;
                            } else {
                                // Fallback: nếu không tìm thấy section đúng ngôn ngữ, 
                                // thử dùng section tiếng Anh (từ result.post.sac_section nếu có)
                                if (result.post.sac_section) {
                                    sectionParentId = result.post.sac_section;
                                    // Tìm section node tiếng Anh để lấy title
                                    const englishSectionNode = sectionNodeMap[englishLang.code] as Section | null;
                                    if (englishSectionNode) {
                                        targetSectionNode = englishSectionNode;
                                    }
                                }
                            }
                        } else {
                            // Nếu không tìm thấy sectionKey, dùng section từ post tiếng Anh
                            if (result.post.sac_section) {
                                sectionParentId = result.post.sac_section;
                                // Nếu có sac_section_detail trong post, dùng nó
                                if (result.post.sac_section_detail) {
                                    try {
                                        const sectionDetail = typeof result.post.sac_section_detail === 'string' 
                                            ? JSON.parse(result.post.sac_section_detail) 
                                            : result.post.sac_section_detail;
                                        targetSectionNode = { id: sectionDetail.id, title: sectionDetail.title } as Section;
                                    } catch (e) {
                                        // ignore JSON parse error, giữ nguyên targetSectionNode mặc định
                                    }
                                }
                            }
                        }
                    } else if (nodeType === "lesson") {
                        // Tìm chapter key từ lesson tiếng Anh
                        // Tìm chapter chứa lesson này trong cây courses để lấy chapter.key
                        let chapterKey: string | null = null;
                        
                        for (const course of courses) {
                            if (String(course.id) !== String(courseId)) continue; // Chỉ tìm trong course hiện tại
                            if (course.translates) {
                                for (const translate of course.translates) {
                                    if (translate.sections) {
                                        for (const section of translate.sections) {
                                            if (section.chapters) {
                                                for (const chapter of section.chapters) {
                                                    if (chapter.lessons?.some(l => l.id === englishNodeId)) {
                                                        chapterKey = chapter.key || null;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            if (chapterKey) break; // Đã tìm thấy, dừng lại
                        }


                        // Tìm chapter parent đúng ngôn ngữ từ courseNodeMap
                        if (chapterKey) {
                            const chapterMapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                chapterKey,
                            });
                            const chapterNodeMap = courseNodeMap[chapterMapKey] || {};
                            
                            targetChapterNode = chapterNodeMap[langCode] as Chapter | null;
                            
                            if (targetChapterNode && targetChapterNode.id) {
                                chapterParentId = targetChapterNode.id;
                            } else {
                                // Fallback: nếu không tìm thấy chapter đúng ngôn ngữ, 
                                // thử dùng chapter tiếng Anh (từ result.post.sac_chapter nếu có)
                                if (result.post.sac_chapter) {
                                    chapterParentId = result.post.sac_chapter;
                                    // Tìm chapter node tiếng Anh để lấy title
                                    const englishChapterNode = chapterNodeMap[englishLang.code] as Chapter | null;
                                    if (englishChapterNode) {
                                        targetChapterNode = englishChapterNode;
                                    }
                                }
                            }
                        } else {
                            // Nếu không tìm thấy chapterKey, dùng chapter từ post tiếng Anh
                            if (result.post.sac_chapter) {
                                chapterParentId = result.post.sac_chapter;
                                // Nếu có sac_chapter_detail trong post, dùng nó
                                if (result.post.sac_chapter_detail) {
                                    try {
                                        const chapterDetail = typeof result.post.sac_chapter_detail === 'string' 
                                            ? JSON.parse(result.post.sac_chapter_detail) 
                                            : result.post.sac_chapter_detail;
                                        targetChapterNode = { id: chapterDetail.id, title: chapterDetail.title } as Chapter;
                                    } catch (e) {
                                        // ignore JSON parse error, giữ nguyên targetChapterNode mặc định
                                    }
                                }
                            }
                        }
                    }

                    // Tạo dữ liệu mới từ bản tiếng Anh
                    // Copy tất cả dữ liệu và loại bỏ các field không cần thiết khi tạo mới
                    const newPostData: ANY = { ...result.post };
                    
                    // Xóa các field ID và metadata không cần thiết
                    delete newPostData.id;
                    delete newPostData.created_at;
                    delete newPostData.updated_at;
                    
                    // Set relationship dựa trên nodeType
                    if (nodeType === "question") {
                        // Set relationship với lesson parent đúng ngôn ngữ
                        if (lessonParentId) {
                            newPostData.sac_lesson = lessonParentId;
                            
                            // Set sac_lesson_detail với thông tin của lesson node
                            if (targetLessonNode && targetLessonNode.id && targetLessonNode.title) {
                                newPostData.sac_lesson_detail = {
                                    id: targetLessonNode.id,
                                    title: targetLessonNode.title,
                                };
                            }
                        }
                    } else if (nodeType === "translate") {
                        // Set relationship với course parent
                        newPostData.course = courseId;
                        
                        // Tìm course node để lấy title
                        const courseNode = courses.find(c => c.id === courseId);
                        if (courseNode && courseNode.title) {
                            newPostData.course_detail = {
                                id: courseId,
                                title: courseNode.title,
                            };
                        }
                    } else if (nodeType === "section") {
                        // Set relationship với translate parent đúng ngôn ngữ
                        if (translateParentId) {
                            newPostData.translate = translateParentId;
                            
                            // Set translate_detail với thông tin của translate node
                            if (targetTranslateNode && targetTranslateNode.id && targetTranslateNode.title) {
                                newPostData.translate_detail = {
                                    id: targetTranslateNode.id,
                                    title: targetTranslateNode.title,
                                };
                            }
                        }
                    } else if (nodeType === "chapter") {
                        // Set relationship với section parent đúng ngôn ngữ
                        if (sectionParentId) {
                            newPostData.sac_section = sectionParentId;
                            
                            // Set sac_section_detail với thông tin của section node
                            if (targetSectionNode && targetSectionNode.id && targetSectionNode.title) {
                                newPostData.sac_section_detail = {
                                    id: targetSectionNode.id,
                                    title: targetSectionNode.title,
                                };
                            }
                        }
                    } else if (nodeType === "lesson") {
                        // Set relationship với chapter parent đúng ngôn ngữ
                        if (chapterParentId) {
                            newPostData.sac_chapter = chapterParentId;
                            
                            // Set sac_chapter_detail với thông tin của chapter node
                            if (targetChapterNode && targetChapterNode.id && targetChapterNode.title) {
                                newPostData.sac_chapter_detail = {
                                    id: targetChapterNode.id,
                                    title: targetChapterNode.title,
                                };
                            }
                        }
                    }
                    
                    // Set ngôn ngữ mới (nếu có field language)
                    const targetLang = languages.find(lang => lang.code === langCode);
                    
                    if (targetLang) {
                        // Tìm language ID từ languages array nếu có
                        if (targetLang.id) {
                            newPostData.sac_language = targetLang.id;
                            
                            // Set sac_language_detail với thông tin của language
                            if (targetLang.title) {
                                newPostData.sac_language_detail = {
                                    id: targetLang.id,
                                    title: targetLang.title,
                                };
                            }
                        }
                        // Hoặc set language code nếu có field language
                        if (newPostData.language !== undefined) {
                            newPostData.language = langCode;
                        }
                    }


                    const addData: DataResultApiProps = {
                        ...result,
                        post: newPostData,
                        type: objectType,
                        action: "ADD_NEW",
                    };
                    
                    
                    setCurrentEditNodeType(nodeType);
                    setIsCopying(true);
                    setCopyingFromLanguage("en"); // Mặc định copy từ tiếng Anh
                    // Post mới copy chưa có key
                    setInitialHasKey(false);
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
        setIsCopying(false);
        setCopyingFromLanguage("en");
        setInitialHasKey(false);
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

    // Helper function: Tìm courseId chứa post với postId (kèm theo nodeType để tránh trùng id giữa các loại node)
    const findCourseIdByPostId = (
        postId: string,
        coursesList: Course[],
        targetNodeType?: string
    ): string | null => {
        // Hàm đệ quy để tìm node và trả về courseId
        const findCourseId = (nodes: TreeNode[], targetId: string, currentCourseId: string | null): string | null => {
            for (const node of nodes) {
                const nodeType = getNodeType(node);

                // Nếu node là course và có id trùng, return courseId
                if (nodeType === "course" && node.id === targetId) {
                    return node.id;
                }
                
                // Nếu tìm thấy node với id trùng (và nếu có truyền targetNodeType thì phải trùng type),
                // return courseId hiện tại
                if (
                    node.id === targetId &&
                    currentCourseId &&
                    (!targetNodeType || nodeType === targetNodeType)
                ) {
                    return currentCourseId;
                }
                
                // Nếu node là course, update currentCourseId
                let newCourseId = currentCourseId;
                if (nodeType === "course") {
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
                    setIsCopying(false); // Clear copy state khi navigate sang ngôn ngữ khác (đây là edit, không phải copy)
                    // Kiểm tra key ban đầu của post mới
                    const hasKey = currentEditNodeType === "question" 
                        ? !!result.post.title 
                        : !!result.post.key;
                    setInitialHasKey(hasKey);
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

    const reloadCourses = React.useCallback(() => {
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
    }, [data.post.id, api]);

    const handleSubmitCourse = () => {
        if (!api.open && drawerData) {
            const objectType = drawerData.type || "sac_course";
            api.ajax({
                url: `post-type/post/${objectType}`,
                method: "POST",
                data: { ...drawerData.post, _action: drawerData.action },
                success: (result) => {
                    if (result.post?.id) {
                        // Nếu là question và có is_complete, cập nhật courseNodeMap ngay lập tức
                        if (currentEditNodeType === "question" && drawerData.post && courses) {
                            const questionTitle = drawerData.post.title;
                            // Tìm courseId từ result.post.id hoặc từ drawerData.post.course
                            let courseId = findCourseIdByPostId(result.post.id, courses);
                            if (!courseId && drawerData.post.course) {
                                courseId = String(drawerData.post.course);
                            }
                            
                            if (courseId && questionTitle) {
                                const mapKey = buildCourseNodeMapKey({
                                    courseId: String(courseId),
                                    questionKey: questionTitle,
                                });
                                // Tìm language code từ drawerData
                                let langCode = "";
                                if (drawerData.post?.sac_language) {
                                    const lang = languages.find(l => 
                                        l.id?.toString() === drawerData.post?.sac_language?.toString()
                                    );
                                    if (lang) {
                                        langCode = lang.code;
                                    }
                                } else if (drawerData.post?.language) {
                                    langCode = drawerData.post.language;
                                }
                                
                                if (langCode) {
                                    setCourseNodeMap((prevMap) => {
                                        const newMap = { ...prevMap };
                                        if (!newMap[mapKey]) {
                                            newMap[mapKey] = {};
                                        }
                                        
                                        // Cập nhật is_complete cho node trong map
                                        if (newMap[mapKey][langCode] && drawerData.post) {
                                            const updatedNode = {
                                                ...newMap[mapKey][langCode],
                                                is_complete: drawerData.post.is_complete || false,
                                            };
                                            newMap[mapKey] = {
                                                ...newMap[mapKey],
                                                [langCode]: updatedNode,
                                            };
                                        }
                                        return newMap;
                                    });
                                }
                            }
                        }
                        
                        setOpenDrawer(false);
                        setDrawerData(false);
                        // Reload danh sách courses
                        reloadCourses();
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
    const displayCourses =
        selectedCourseId && coursesList.length > 0
            ? coursesList.filter((c) => String(c.id) === String(selectedCourseId))
            : coursesList;

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
                {displayCourses.length === 0 ? (
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
                            const newCourses = [...displayCourses];
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
                                    {displayCourses.map((course, index) => (
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
                                                            displayCourses.length -
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
                                                        onSelectCourseForEdit={handleSelectCourseForEdit}
                                                        onBackToCourseList={handleBackToCourseList}
                                                        selectedCourseId={selectedCourseId}
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
            {drawerData && (() => {
                // Kiểm tra xem có nên dùng MultiLanguageDrawer không
                // Chỉ dùng khi edit (không phải copy) và là các node type có nhiều ngôn ngữ
                const isCurrentlyCopying = isCopying || (drawerData?.action === "ADD_NEW" && !drawerData?.post?.id);
                
                // Sử dụng initialHasKey thay vì kiểm tra key hiện tại trong drawerData
                // để tránh UI chuyển đổi khi user thay đổi key trong form
                const shouldUseMultiLanguageDrawer = !isCurrentlyCopying && 
                    initialHasKey &&
                    (currentEditNodeType === "translate" || 
                     currentEditNodeType === "section" || 
                     currentEditNodeType === "chapter" || 
                     currentEditNodeType === "lesson" || 
                     currentEditNodeType === "question") &&
                    languages.length > 0 &&
                    courses;

                if (shouldUseMultiLanguageDrawer) {
                    return (
                        <MultiLanguageDrawer
                            open={openDrawer}
                            openLoading={api.open}
                            onClose={handleCloseDrawer}
                            initialData={drawerData}
                            setInitialData={setDrawerData}
                            handleSubmit={handleSubmitCourse}
                            onAfterSubmit={reloadCourses}
                            languages={languages}
                            currentEditNodeType={currentEditNodeType}
                            courses={courses}
                            courseNodeMap={courseNodeMap}
                            currentCourseId={selectedCourseId}
                            setCourseNodeMap={setCourseNodeMap}
                            findCourseIdByPostId={findCourseIdByPostId}
                        />
                    );
                }

                return (
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
                            // Kiểm tra xem có đang copy không - kiểm tra cả state và drawerData
                            const isCurrentlyCopying = isCopying || (drawerData?.action === "ADD_NEW" && !drawerData?.post?.id);
                            // Tính fromLanguageName ngay cả khi languages chưa có, sẽ fallback về "EN"
                            const fromLanguageName = isCurrentlyCopying
                                ? (languages.length > 0 
                                    ? (languages.find(lang => lang.code === copyingFromLanguage)?.title || copyingFromLanguage.toUpperCase())
                                    : copyingFromLanguage.toUpperCase())
                                : null;
                            
                            // Lấy ngôn ngữ đích (target language)
                            let toLanguageName: string | null = null;
                            if (isCurrentlyCopying && drawerData?.post) {
                                // Thử lấy từ sac_language_detail (object hoặc JSON string)
                                if (drawerData.post.sac_language_detail) {
                                    try {
                                        const langDetail = typeof drawerData.post.sac_language_detail === 'string' 
                                            ? JSON.parse(drawerData.post.sac_language_detail) 
                                            : drawerData.post.sac_language_detail;
                                        toLanguageName = langDetail?.title || null;
                                    } catch (e) {
                                        // Ignore parse error
                                    }
                                }
                                
                                // Nếu chưa có, thử tìm trong languages array
                                if (!toLanguageName && languages.length > 0 && drawerData.post) {
                                    const post = drawerData.post;
                                    if (post.sac_language) {
                                        const targetLang = languages.find(lang => 
                                            lang.id?.toString() === post.sac_language?.toString()
                                        );
                                        if (targetLang) {
                                            toLanguageName = targetLang.title;
                                        }
                                    } else if (post.language) {
                                        const targetLang = languages.find(lang => 
                                            lang.code === post.language
                                        );
                                        if (targetLang) {
                                            toLanguageName = targetLang.title;
                                        }
                                    }
                                }
                            }
                            
                                            const shouldShow = (currentEditNodeType === "translate" || 
                                             currentEditNodeType === "section" || 
                                             currentEditNodeType === "chapter" || 
                                             currentEditNodeType === "lesson" || 
                                             currentEditNodeType === "question") && 
                                             languages.length > 0 && 
                                             drawerData && 
                                             courses;

                            // Nếu đang copy nhưng không có Language Selector, vẫn hiển thị thông báo copy
                            if (!shouldShow) {
                                if (isCurrentlyCopying && fromLanguageName) {
                                    return (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "text.secondary",
                                                fontSize: "0.75rem",
                                                fontStyle: "italic",
                                            }}
                                        >
                                            {toLanguageName 
                                                ? `Đang copy từ ${fromLanguageName} sang ${toLanguageName}`
                                                : `Đang copy từ ${fromLanguageName}`}
                                        </Typography>
                                    );
                                }
                                return undefined;
                            }

                            // Lấy key từ post hiện tại
                            // Với question thì dùng title, các node type khác dùng key
                            const currentKey = currentEditNodeType === "question" 
                                ? drawerData.post?.title 
                                : drawerData.post?.key;
                            const currentPostId = drawerData.post?.id;
                            
                            if (!currentKey || !currentEditNodeType || !courses) {
                                // Nếu đang copy nhưng không có đủ thông tin, vẫn hiển thị copy message
                                if (isCurrentlyCopying && fromLanguageName) {
                                    return (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "text.secondary",
                                                fontSize: "0.75rem",
                                                fontStyle: "italic",
                                            }}
                                        >
                                            {toLanguageName 
                                                ? `Đang copy từ ${fromLanguageName} sang ${toLanguageName}`
                                                : `Đang copy từ ${fromLanguageName}`}
                                        </Typography>
                                    );
                                }
                                return undefined;
                            }

                            // Tìm courseId: nếu đang copy, lấy từ drawerData.post.course, nếu không thì tìm từ currentPostId
                            let courseId: string | null = null;
                            if (isCurrentlyCopying && drawerData.post?.course) {
                                // Khi đang copy, lấy courseId từ post data
                                if (typeof drawerData.post.course === 'string') {
                                    courseId = drawerData.post.course;
                                } else if (drawerData.post.course && typeof drawerData.post.course === 'object' && 'id' in drawerData.post.course) {
                                    courseId = String((drawerData.post.course as { id: string | number }).id);
                                }
                            } else if (currentPostId) {
                                // Khi edit, tìm courseId từ currentPostId
                                courseId = findCourseIdByPostId(currentPostId, courses);
                            }
                            
                            if (!courseId) {
                                // Nếu đang copy nhưng không tìm thấy courseId, vẫn hiển thị copy message
                                if (isCurrentlyCopying && fromLanguageName) {
                                    return (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "text.secondary",
                                                fontSize: "0.75rem",
                                                fontStyle: "italic",
                                            }}
                                        >
                                            {toLanguageName 
                                                ? `Đang copy từ ${fromLanguageName} sang ${toLanguageName}`
                                                : `Đang copy từ ${fromLanguageName}`}
                                        </Typography>
                                    );
                                }
                                return undefined;
                            }

                            // Tạo map key: sử dụng buildCourseNodeMapKey với questionKey (đang dùng cho dialog question)
                            const mapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                questionKey: currentEditNodeType === "question" ? currentKey : undefined,
                            });
                            
                            // Lookup trong courseNodeMap
                            const nodeMap = courseNodeMap[mapKey];
                            
                            // Tạo availableLanguages array từ map
                            const availableLanguages = languages.map((lang) => {
                                const node = nodeMap?.[lang.code];
                                // Nếu là question, kiểm tra is_complete
                                let isComplete = false;
                                if (currentEditNodeType === "question" && node) {
                                    const questionNode = node as Question;
                                    isComplete = questionNode.is_complete === true;
                                }
                                return {
                                    code: lang.code,
                                    postId: node?.id || null,
                                    isComplete: isComplete,
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
                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-end",
                                        gap: 1,
                                    }}
                                >
                                    {isCurrentlyCopying && fromLanguageName && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "text.secondary",
                                                fontSize: "0.75rem",
                                                fontStyle: "italic",
                                            }}
                                        >
                                            {toLanguageName 
                                                ? `Đang copy từ ${fromLanguageName} sang ${toLanguageName}`
                                                : `Đang copy từ ${fromLanguageName}`}
                                        </Typography>
                                    )}
                                    <LanguageSelector
                                        languages={languages}
                                        currentLanguage={currentLanguage}
                                        availableLanguages={availableLanguages}
                                        onNavigateToLanguage={handleNavigateToLanguage}
                                    />
                                </Box>
                            );
                        })()
                    }
                />
                );
            })()}
            {confirmSync.component}
            {confirmImport.component}
            {confirmExport.component}
        </Box>
    );
}
