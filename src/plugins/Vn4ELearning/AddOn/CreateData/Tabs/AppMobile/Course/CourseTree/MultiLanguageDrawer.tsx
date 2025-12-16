import React from "react";
import { useTheme } from "@mui/material";
import DrawerCustom from "components/molecules/DrawerCustom";
import Box from "components/atoms/Box";
import Typography from "components/atoms/Typography";
import Button from "components/atoms/Button";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import Form from "components/pages/PostType/CreateData/Form";
import { HandleUpdateDataProps } from "hook/useForm";
import { DataResultApiProps } from "components/atoms/fields/relationship_onetomany_show/Form";
import useAjax from "hook/useApi";
import { getNodeObjectType, getNodeType, getChildren } from "./utils";
import { Course, TreeNode, Translate, Section, Chapter, Lesson } from "./types";
import { getLanguageCodeFromTranslate, findTranslateParent, buildCourseNodeMapKey } from "./helpers";

interface MultiLanguageDrawerProps {
    open: boolean;
    openLoading: boolean;
    onClose: () => void;
    initialData: DataResultApiProps;
    setInitialData: React.Dispatch<React.SetStateAction<false | DataResultApiProps>>;
    handleSubmit: () => void;
    handleAfterDelete?: () => void;
    onAfterSubmit?: () => void; // Callback để reload courses sau khi submit
    languages: Array<{ code: string; title: string; flag_code: string; icon_url?: string; id?: string | number }>;
    currentEditNodeType: string | null;
    courses: Course[] | null;
    courseNodeMap: Record<string, Record<string, TreeNode>>;
    setCourseNodeMap?: React.Dispatch<React.SetStateAction<Record<string, Record<string, TreeNode>>>>;
    currentCourseId?: string | null;
    findCourseIdByPostId: (postId: string, coursesList: Course[]) => string | null;
}

export default function MultiLanguageDrawer({
    open,
    openLoading,
    onClose,
    initialData,
    setInitialData,
    handleSubmit,
    handleAfterDelete,
    onAfterSubmit,
    languages,
    currentEditNodeType,
    courses,
    courseNodeMap,
    setCourseNodeMap,
    currentCourseId,
    findCourseIdByPostId,
}: MultiLanguageDrawerProps) {
    const theme = useTheme();
    const api = useAjax();
    const apiTranslate = useAjax();
    const [languageDataMap, setLanguageDataMap] = React.useState<Record<string, DataResultApiProps>>({});
    const [loadingLanguages, setLoadingLanguages] = React.useState<Record<string, boolean>>({});
    const [copyingLanguages, setCopyingLanguages] = React.useState<Record<string, boolean>>({});
    const [translatingLanguages, setTranslatingLanguages] = React.useState<Record<string, boolean>>({});
    const [attemptedCopy, setAttemptedCopy] = React.useState<Set<string>>(new Set());

    // Lấy key từ post hiện tại
    const currentKey = currentEditNodeType === "question" 
        ? initialData.post?.title 
        : initialData.post?.key;
    const currentPostId = initialData.post?.id;

    // Ưu tiên lấy courseId trực tiếp từ post (ví dụ field course của translate)
    const explicitCourseId = initialData.post?.course ? String(initialData.post.course) : null;

    // Tìm courseId
    const courseId = React.useMemo(() => {
        // 1. Ưu tiên courseId từ post hiện tại (nếu có)
        if (explicitCourseId) {
            return explicitCourseId;
        }

        // Ưu tiên dùng courseId được truyền trực tiếp từ CourseTree
        if (currentCourseId) {
            return currentCourseId;
        }
        if (!currentPostId || !courses) return null;
        const foundCourseId = findCourseIdByPostId(currentPostId, courses);
        return foundCourseId;
    }, [explicitCourseId, currentCourseId, currentPostId, courses, findCourseIdByPostId]);

    // Tìm node trong cây courses bằng id
    const findNodeById = React.useCallback((nodes: TreeNode[], targetId: string): TreeNode | null => {
        for (const node of nodes) {
            if (String(node.id) === String(targetId)) return node;
            const children = getChildren(node);
            const found = findNodeById(children, targetId);
            if (found) return found;
        }
        return null;
    }, []);

    // Tạo map key và availableLanguages
    const availableLanguages = React.useMemo(() => {
        if (!courseId || !currentEditNodeType || !courses) {
            return [];
        }
        
        // Nếu có key, dùng courseNodeMap theo cấu trúc mapKey mới (phân cấp)
        if (currentKey) {
            // Tìm path của node hiện tại trong cây courses
            const resolveCurrentPath = () => {
                if (!courses) return null;
                for (const course of courses) {
                    if (String(course.id) !== String(courseId)) continue;
                    if (!course.translates) continue;
                    for (const translate of course.translates) {
                        const tKey = translate.key || undefined;
                        // Translate
                        if (currentEditNodeType === "translate" && translate.key === currentKey) {
                            return { translateKey: tKey };
                        }
                        if (!translate.sections) continue;
                        for (const section of translate.sections) {
                            const sKey = section.key || undefined;
                            // Section
                            if (currentEditNodeType === "section" && section.key === currentKey) {
                                return { translateKey: tKey, sectionKey: sKey };
                            }
                            if (!section.chapters) continue;
                            for (const chapter of section.chapters) {
                                const cKey = chapter.key || undefined;
                                // Chapter
                                if (currentEditNodeType === "chapter" && chapter.key === currentKey) {
                                    return { translateKey: tKey, sectionKey: sKey, chapterKey: cKey };
                                }
                                if (!chapter.lessons) continue;
                                for (const lesson of chapter.lessons) {
                                    const lKey = lesson.key || undefined;
                                    const lessonId = lesson.id ? String(lesson.id) : null;
                                    // Lesson: ưu tiên so sánh theo id để tránh trùng key
                                    if (
                                        currentEditNodeType === "lesson" &&
                                        ((currentPostId && lessonId && String(currentPostId) === lessonId) ||
                                            (!currentPostId && lesson.key === currentKey))
                                    ) {
                                        return { translateKey: tKey, sectionKey: sKey, chapterKey: cKey, lessonKey: lKey };
                                    }
                                    if (!lesson.questions) continue;
                                    for (const question of lesson.questions) {
                                        const qKey = question.title || undefined;
                                        const qId = question.id ? String(question.id) : null;
                                        // Question: ưu tiên so sánh theo id
                                        if (
                                            currentEditNodeType === "question" &&
                                            ((currentPostId && qId && String(currentPostId) === qId) ||
                                                (!currentPostId && question.title === currentKey))
                                        ) {
                                            return {
                                                translateKey: tKey,
                                                sectionKey: sKey,
                                                chapterKey: cKey,
                                                lessonKey: lKey,
                                                questionKey: qKey,
                                            };
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                return null;
            };

            const currentPath = resolveCurrentPath();
            if (!currentPath) {
                return languages.map((lang) => ({
                    code: lang.code,
                    title: lang.title,
                    flag_code: lang.flag_code,
                    icon_url: lang.icon_url,
                    postId: null,
                }));
            }

            const mapKey = buildCourseNodeMapKey({
                courseId: String(courseId),
                ...currentPath,
            });
            const nodeMap = courseNodeMap[mapKey] || {};
            
            return languages.map((lang) => {
                const node = nodeMap[lang.code];
                return {
                    code: lang.code,
                    title: lang.title,
                    flag_code: lang.flag_code,
                    icon_url: lang.icon_url,
                    postId: node?.id || null,
                };
            });
        }
        
        // Nếu không có key, tìm node bằng id và hiển thị tất cả ngôn ngữ
        // Chỉ post hiện tại có dữ liệu, các ngôn ngữ khác sẽ là null
        if (!currentPostId) return [];
        
        // Tìm node trong cây courses để xác định ngôn ngữ hiện tại
        let currentNode: TreeNode | null = null;
        for (const course of courses) {
            if (String(course.id) === String(courseId)) {
                currentNode = findNodeById([course], currentPostId);
                if (currentNode) break;
            }
        }
        
        // Xác định ngôn ngữ của node hiện tại
        let currentLanguage = "";
        if (currentNode) {
            if (getNodeType(currentNode) === "translate") {
                currentLanguage = getLanguageCodeFromTranslate(currentNode as Translate, languages);
            } else {
                const translateParent = findTranslateParent(currentNode, courses);
                if (translateParent) {
                    currentLanguage = getLanguageCodeFromTranslate(translateParent, languages);
                }
            }
        }
        
        // Hiển thị tất cả ngôn ngữ, chỉ post hiện tại có postId
        return languages.map((lang) => {
            const isCurrentLanguage = lang.code === currentLanguage;
            return {
                code: lang.code,
                title: lang.title,
                flag_code: lang.flag_code,
                icon_url: lang.icon_url,
                postId: isCurrentLanguage ? currentPostId : null,
            };
        });
    }, [courseId, currentKey, currentEditNodeType, courseNodeMap, languages, currentPostId, courses, findNodeById]);

    // Load dữ liệu cho tất cả các ngôn ngữ
    React.useEffect(() => {
        if (!open || !currentEditNodeType || !availableLanguages.length) return;

        const objectType = getNodeObjectType(currentEditNodeType);
        if (!objectType) return;

        const loadLanguageData = (lang: typeof availableLanguages[0]) => {
            if (!lang.postId) {
                // Nếu không có postId, không load
                return;
            }

            // Kiểm tra xem đã load chưa
            if (languageDataMap[lang.code]) {
                return;
            }

            setLoadingLanguages(prev => ({ ...prev, [lang.code]: true }));

            api.ajax({
                url: `post-type/detail/${objectType}/${lang.postId}`,
                method: "POST",
                data: { id: lang.postId },
                loading: false,
                success: (result: ANY) => {
                    setLoadingLanguages(prev => {
                        const newMap = { ...prev };
                        delete newMap[lang.code];
                        return newMap;
                    });
                    if (result.post) {
                        const editData: DataResultApiProps = {
                            ...result,
                            type: objectType,
                            action: "EDIT",
                        };
                        setLanguageDataMap(prev => ({
                            ...prev,
                            [lang.code]: editData,
                        }));
                    }
                },
                error: () => {
                    // Nếu lỗi, không thêm vào map và xóa loading
                    setLoadingLanguages(prev => {
                        const newMap = { ...prev };
                        delete newMap[lang.code];
                        return newMap;
                    });
                },
            });
        };

        // Load dữ liệu cho tất cả các ngôn ngữ
        availableLanguages.forEach(lang => {
            if (lang.postId) {
                loadLanguageData(lang);
            } else {
                // Nếu không có postId, tự động copy từ tiếng Anh
                // Chỉ copy nếu chưa đang copy, chưa có dữ liệu và chưa thử copy
                if (!copyingLanguages[lang.code] && !languageDataMap[lang.code] && !attemptedCopy.has(lang.code)) {
                    setAttemptedCopy(prev => new Set(prev).add(lang.code));
                    // Delay một chút để tránh copy nhiều lần cùng lúc
                    setTimeout(() => {
                        handleCopyFromEnglish(lang.code);
                    }, 100);
                }
            }
        });
    }, [open, currentEditNodeType]);

    // Reset khi đóng drawer
    React.useEffect(() => {
        if (!open) {
            setLanguageDataMap({});
            setLoadingLanguages({});
            setCopyingLanguages({});
            setTranslatingLanguages({});
            setAttemptedCopy(new Set());
        }
    }, [open]);

    // Hàm copy từ tiếng Anh cho một ngôn ngữ
    const handleCopyFromEnglish = React.useCallback((langCode: string) => {
        if (!courseId || !currentKey || !currentEditNodeType || !courses) {
            api.showMessage("Không tìm thấy thông tin cần thiết", "error");
            return;
        }

        // Chỉ xử lý cho question, translate, section, chapter và lesson
        if (currentEditNodeType !== "question" && currentEditNodeType !== "translate" && 
            currentEditNodeType !== "section" && currentEditNodeType !== "chapter" && 
            currentEditNodeType !== "lesson") {
            return;
        }

        // Kiểm tra parent node có tồn tại trong ngôn ngữ target không
        const checkParentExists = (): boolean => {
            if (currentEditNodeType === "translate") {
                return true;
            }

            // Với SECTION: chỉ cần đảm bảo course đã có translate cho langCode,
            // không cần đi ngược cây theo key (tránh lệ thuộc dữ liệu courses có thể chưa cập nhật)
            if (currentEditNodeType === "section") {
                const translatePrefix = `course_${courseId}_translate_`;
                let hasParent = false;

                Object.keys(courseNodeMap).forEach((key) => {
                    if (key.startsWith(translatePrefix)) {
                        const langMap = courseNodeMap[key];
                        if (langMap && langMap[langCode]) {
                            hasParent = true;
                        }
                    }
                });

                return hasParent;
            }

            // Tìm parent key từ node (và cả path đầy đủ để build mapKey mới)
            let parentKey: string | null = null;
            let parentType: string | null = null;
            let parentTranslateKey: string | null = null;
            let parentSectionKey: string | null = null;
            let parentChapterKey: string | null = null;
            let parentLessonKey: string | null = null;

            for (const course of courses) {
                if (String(course.id) !== String(courseId)) continue;
                if (course.translates) {
                    for (const translate of course.translates) {
                        if (currentEditNodeType === "chapter") {
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters?.some(c => c.key === currentKey)) {
                                        parentKey = section.key || null;
                                        parentType = "section";
                                        parentTranslateKey = translate.key || null;
                                        parentSectionKey = section.key || null;
                                        break;
                                    }
                                }
                            }
                        } else if (currentEditNodeType === "lesson") {
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters) {
                                        for (const chapter of section.chapters) {
                                            if (chapter.lessons) {
                                                for (const lesson of chapter.lessons) {
                                                    const lessonId = lesson.id ? String(lesson.id) : null;
                                                    if (
                                                        (currentPostId && lessonId && String(currentPostId) === lessonId) ||
                                                        (!currentPostId && lesson.key === currentKey)
                                                    ) {
                                                parentKey = chapter.key || null;
                                                parentType = "chapter";
                                                        parentTranslateKey = translate.key || null;
                                                        parentSectionKey = section.key || null;
                                                        parentChapterKey = chapter.key || null;
                                                break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (currentEditNodeType === "question") {
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters) {
                                        for (const chapter of section.chapters) {
                                            if (chapter.lessons) {
                                                for (const lesson of chapter.lessons) {
                                                    if (lesson.questions) {
                                                        for (const question of lesson.questions) {
                                                            const qId = question.id ? String(question.id) : null;
                                                            if (
                                                                (currentPostId && qId && String(currentPostId) === qId) ||
                                                                (!currentPostId && question.title === currentKey)
                                                            ) {
                                                        parentKey = lesson.key || null;
                                                        parentType = "lesson";
                                                                parentTranslateKey = translate.key || null;
                                                                parentSectionKey = section.key || null;
                                                                parentChapterKey = chapter.key || null;
                                                                parentLessonKey = lesson.key || null;
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
                    }
                }
                if (parentKey && parentType) break;
            }

            if (!parentKey || !parentType) {
                return false;
            }

            // Build parentMapKey theo cấu trúc mới
            let parentMapKey: string | null = null;
            if (parentType === "section") {
                if (!parentTranslateKey || !parentSectionKey) {
                    return false;
                }
                parentMapKey = buildCourseNodeMapKey({
                    courseId: String(courseId),
                    translateKey: parentTranslateKey,
                    sectionKey: parentSectionKey,
                });
            } else if (parentType === "chapter") {
                if (!parentTranslateKey || !parentSectionKey || !parentChapterKey) {
                    return false;
                }
                parentMapKey = buildCourseNodeMapKey({
                    courseId: String(courseId),
                    translateKey: parentTranslateKey,
                    sectionKey: parentSectionKey,
                    chapterKey: parentChapterKey,
                });
            } else if (parentType === "lesson") {
                if (!parentTranslateKey || !parentSectionKey || !parentChapterKey || !parentLessonKey) {
                    return false;
                }
                parentMapKey = buildCourseNodeMapKey({
                    courseId: String(courseId),
                    translateKey: parentTranslateKey,
                    sectionKey: parentSectionKey,
                    chapterKey: parentChapterKey,
                    lessonKey: parentLessonKey,
                });
            }

            if (!parentMapKey) {
                return false;
            }
            const parentNodeMap = courseNodeMap[parentMapKey] || {};
            const parentExists = !!parentNodeMap[langCode];

            return parentExists;
        };

        if (!checkParentExists()) {
            const parentLabels: Record<string, string> = {
                translate: "Translate",
                section: "Section",
                chapter: "Chapter",
                lesson: "Lesson",
            };
            const parentType = currentEditNodeType === "section" ? "translate"
                : currentEditNodeType === "chapter" ? "section"
                : currentEditNodeType === "lesson" ? "chapter"
                : "lesson";
            const parentLabel = parentLabels[parentType] || parentType;
            api.showMessage(
                `Không thể copy vì ${parentLabel} chưa được tạo cho ngôn ngữ này. Vui lòng tạo ${parentLabel} trước.`,
                "error"
            );
            return;
        }
        // Tìm node tiếng Anh dựa trên path trong cây courses (không dùng courseNodeMap vì mapKey đã đổi cấu trúc)
        const englishLang = languages.find(lang => lang.code === "en") || languages[0];
        const englishCode = englishLang.code;

        // Tìm path (translateKey / sectionKey / chapterKey / lessonKey / questionKey) cho node hiện tại
        const findCurrentPath = () => {
            if (!courses) return null;
            for (const course of courses) {
                if (String(course.id) !== String(courseId)) continue;
                if (!course.translates) continue;
                for (const translate of course.translates) {
                    const tKey = translate.key || undefined;
                    // Translate
                    if (currentEditNodeType === "translate" && translate.key === currentKey) {
                        return { translateKey: tKey };
                    }
                    if (!translate.sections) continue;
                    for (const section of translate.sections) {
                        const sKey = section.key || undefined;
                        // Section
                        if (currentEditNodeType === "section" && section.key === currentKey) {
                            return { translateKey: tKey, sectionKey: sKey };
                        }
                        if (!section.chapters) continue;
                        for (const chapter of section.chapters) {
                            const cKey = chapter.key || undefined;
                            // Chapter
                            if (currentEditNodeType === "chapter" && chapter.key === currentKey) {
                                return { translateKey: tKey, sectionKey: sKey, chapterKey: cKey };
                            }
                            if (!chapter.lessons) continue;
                                for (const lesson of chapter.lessons) {
                                    const lKey = lesson.key || undefined;
                                    const lessonId = lesson.id ? String(lesson.id) : null;
                                    // Lesson: ưu tiên so sánh theo id
                                    if (
                                        currentEditNodeType === "lesson" &&
                                        ((currentPostId && lessonId && String(currentPostId) === lessonId) ||
                                            (!currentPostId && lesson.key === currentKey))
                                    ) {
                                        return { translateKey: tKey, sectionKey: sKey, chapterKey: cKey, lessonKey: lKey };
                                    }
                                    if (!lesson.questions) continue;
                                    for (const question of lesson.questions) {
                                        const qKey = question.title || undefined;
                                        const qId = question.id ? String(question.id) : null;
                                        // Question: ưu tiên so sánh theo id
                                        if (
                                            currentEditNodeType === "question" &&
                                            ((currentPostId && qId && String(currentPostId) === qId) ||
                                                (!currentPostId && question.title === currentKey))
                                        ) {
                                            return {
                                                translateKey: tKey,
                                                sectionKey: sKey,
                                                chapterKey: cKey,
                                                lessonKey: lKey,
                                                questionKey: qKey,
                                            };
                                        }
                                    }
                                }
                        }
                    }
                }
            }
            return null;
        };

        const currentPath = findCurrentPath();
        if (!currentPath) {
            api.showMessage("Không tìm thấy bản tiếng Anh để copy", "error");
            return;
        }

        // Tìm node tiếng Anh theo path + language code
        const courseForEnglish = courses?.find(c => String(c.id) === String(courseId)) || null;
        let englishTranslate: Translate | null = null;
        if (courseForEnglish?.translates) {
            for (const t of courseForEnglish.translates) {
                const tCode = getLanguageCodeFromTranslate(t, languages);
                if (tCode === englishCode) {
                    englishTranslate = t;
                    break;
                }
            }
        }

        let englishNode: TreeNode | null = null;
        if (currentEditNodeType === "translate") {
            englishNode =
                englishTranslate && englishTranslate.key === currentKey
                    ? (englishTranslate as TreeNode)
                    : null;
        } else if (currentEditNodeType === "section") {
            const sectionKey = currentPath.sectionKey;
            englishNode =
                englishTranslate?.sections?.find(s => s.key === sectionKey) || null;
        } else if (currentEditNodeType === "chapter") {
            const sectionKey = currentPath.sectionKey;
            const chapterKey = currentPath.chapterKey;
            const englishSection =
                englishTranslate?.sections?.find(s => s.key === sectionKey) || null;
            englishNode =
                englishSection?.chapters?.find(c => c.key === chapterKey) || null;
        } else if (currentEditNodeType === "lesson") {
            const sectionKey = currentPath.sectionKey;
            const chapterKey = currentPath.chapterKey;
            const lessonKey = currentPath.lessonKey;
            const englishSection =
                englishTranslate?.sections?.find(s => s.key === sectionKey) || null;
            const englishChapter =
                englishSection?.chapters?.find(c => c.key === chapterKey) || null;
            englishNode =
                englishChapter?.lessons?.find(l => l.key === lessonKey) || null;
        } else if (currentEditNodeType === "question") {
            const sectionKey = currentPath.sectionKey;
            const chapterKey = currentPath.chapterKey;
            const lessonKey = currentPath.lessonKey;
            const questionKey = currentPath.questionKey;
            const englishSection =
                englishTranslate?.sections?.find(s => s.key === sectionKey) || null;
            const englishChapter =
                englishSection?.chapters?.find(c => c.key === chapterKey) || null;
            const englishLesson =
                englishChapter?.lessons?.find(l => l.key === lessonKey) || null;
            englishNode =
                englishLesson?.questions?.find(q => q.title === questionKey) || null;
        }

        if (!englishNode || !(englishNode as ANY).id) {
            api.showMessage("Không tìm thấy bản tiếng Anh để copy", "error");
            return;
        }

        const objectType = getNodeObjectType(currentEditNodeType);
        if (!objectType) {
            api.showMessage(`Không tìm thấy object type cho ${currentEditNodeType}`, "error");
            return;
        }

        setCopyingLanguages(prev => ({ ...prev, [langCode]: true }));

        // Lấy dữ liệu của node tiếng Anh
        api.ajax({
            url: `post-type/detail/${objectType}/${englishNode.id}`,
            method: "POST",
            data: { id: englishNode.id },
            loading: false,
            success: (result: ANY) => {
                if (result.post) {
                    // Tạo dữ liệu mới từ bản tiếng Anh (logic tương tự handleCreateCopyFromEnglish)
                    const newPostData: Record<string, unknown> = { ...result.post };
                    delete newPostData.id;
                    delete newPostData.created_at;
                    delete newPostData.updated_at;

                    // Xử lý relationship dựa trên nodeType
                    if (currentEditNodeType === "translate") {
                        newPostData.course = courseId;
                        const courseNode = courses.find(c => String(c.id) === String(courseId));
                        if (courseNode?.title) {
                            newPostData.course_detail = { id: courseId, title: courseNode.title };
                        }
                    } else if (currentEditNodeType === "section") {
                        // Tìm translate target theo langCode trong course hiện tại
                        const courseNode = courses.find(c => String(c.id) === String(courseId));
                        let targetTranslate: Translate | null = null;
                        if (courseNode?.translates) {
                            for (const t of courseNode.translates) {
                                const tCode = getLanguageCodeFromTranslate(t, languages);
                                if (tCode === langCode) {
                                    targetTranslate = t;
                                    break;
                                }
                            }
                        }

                            if (targetTranslate?.id) {
                                newPostData.translate = targetTranslate.id;
                                if (targetTranslate.title) {
                                newPostData.translate_detail = {
                                    id: targetTranslate.id,
                                    title: targetTranslate.title,
                                };
                            }
                        }
                    } else if (currentEditNodeType === "chapter") {
                        // Tìm section parent đúng ngôn ngữ
                        const sectionPath = (() => {
                            for (const course of courses) {
                                if (String(course.id) !== String(courseId)) continue;
                                if (course.translates) {
                                    for (const translate of course.translates) {
                                        if (translate.sections) {
                                            for (const section of translate.sections) {
                                                if (section.chapters?.some(c => c.key === currentKey)) {
                                                    return {
                                                        translateKey: translate.key || undefined,
                                                        sectionKey: section.key || undefined,
                                                    };
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            return null;
                        })();
                        if (sectionPath && sectionPath.sectionKey) {
                            const sectionMapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                translateKey: sectionPath.translateKey,
                                sectionKey: sectionPath.sectionKey,
                            });
                            const sectionNodeMap = courseNodeMap[sectionMapKey] || {};
                            const targetSection = sectionNodeMap[langCode] as Section | null;
                            if (targetSection?.id) {
                                newPostData.sac_section = targetSection.id;
                                if (targetSection.title) {
                                    newPostData.sac_section_detail = { id: targetSection.id, title: targetSection.title };
                                }
                            }
                        }
                    } else if (currentEditNodeType === "lesson") {
                        // Tìm chapter parent đúng ngôn ngữ
                        const chapterPath = (() => {
                            for (const course of courses) {
                                if (String(course.id) !== String(courseId)) continue;
                                if (course.translates) {
                                    for (const translate of course.translates) {
                                        if (translate.sections) {
                                            for (const section of translate.sections) {
                                                if (section.chapters) {
                                                    for (const chapter of section.chapters) {
                                                        if (chapter.lessons?.some(l => l.key === currentKey)) {
                                                            return {
                                                                translateKey: translate.key || undefined,
                                                                sectionKey: section.key || undefined,
                                                                chapterKey: chapter.key || undefined,
                                                            };
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            return null;
                        })();
                        if (chapterPath && chapterPath.chapterKey) {
                            const chapterMapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                translateKey: chapterPath.translateKey,
                                sectionKey: chapterPath.sectionKey,
                                chapterKey: chapterPath.chapterKey,
                            });
                            const chapterNodeMap = courseNodeMap[chapterMapKey] || {};
                            const targetChapter = chapterNodeMap[langCode] as Chapter | null;
                            if (targetChapter?.id) {
                                newPostData.sac_chapter = targetChapter.id;
                                if (targetChapter.title) {
                                    newPostData.sac_chapter_detail = { id: targetChapter.id, title: targetChapter.title };
                                }
                            }
                        }
                    } else if (currentEditNodeType === "question") {
                        // Tìm lesson parent đúng ngôn ngữ
                        const lessonPath = (() => {
                            for (const course of courses) {
                                if (String(course.id) !== String(courseId)) continue;
                                if (course.translates) {
                                    for (const translate of course.translates) {
                                        if (translate.sections) {
                                            for (const section of translate.sections) {
                                                if (section.chapters) {
                                                    for (const chapter of section.chapters) {
                                                        if (chapter.lessons) {
                                                            for (const lesson of chapter.lessons) {
                                                                if (lesson.questions?.some(q => q.title === currentKey)) {
                                                                    return {
                                                                        translateKey: translate.key || undefined,
                                                                        sectionKey: section.key || undefined,
                                                                        chapterKey: chapter.key || undefined,
                                                                        lessonKey: lesson.key || undefined,
                                                                    };
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
                            return null;
                        })();
                        if (lessonPath && lessonPath.lessonKey) {
                            const lessonMapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                translateKey: lessonPath.translateKey,
                                sectionKey: lessonPath.sectionKey,
                                chapterKey: lessonPath.chapterKey,
                                lessonKey: lessonPath.lessonKey,
                            });
                            const lessonNodeMap = courseNodeMap[lessonMapKey] || {};
                            const targetLesson = lessonNodeMap[langCode] as Lesson | null;
                            if (targetLesson?.id) {
                                newPostData.sac_lesson = targetLesson.id;
                                if (targetLesson.title) {
                                    newPostData.sac_lesson_detail = { id: targetLesson.id, title: targetLesson.title };
                                }
                            }
                        }
                    }

                    // Set ngôn ngữ mới
                    const targetLang = languages.find(lang => lang.code === langCode);
                    if (targetLang?.id) {
                        newPostData.sac_language = targetLang.id;
                        if (targetLang.title) {
                            newPostData.sac_language_detail = { id: targetLang.id, title: targetLang.title };
                        }
                    }
                    if (newPostData.language !== undefined) {
                        newPostData.language = langCode;
                    }

                    // Tạo post mới
                    api.ajax({
                        url: `post-type/post/${objectType}`,
                        method: "POST",
                        data: { ...newPostData, _action: "ADD_NEW" },
                        success: (createResult: ANY) => {
                            setCopyingLanguages(prev => {
                                const newMap = { ...prev };
                                delete newMap[langCode];
                                return newMap;
                            });
                            if (createResult.post?.id) {
                                // Load dữ liệu mới tạo
                                api.ajax({
                                    url: `post-type/detail/${objectType}/${createResult.post.id}`,
                                    method: "POST",
                                    data: { id: createResult.post.id },
                                    loading: false,
                                    success: (detailResult: ANY) => {
                                        if (detailResult.post) {
                                            const editData: DataResultApiProps = {
                                                ...detailResult,
                                                type: objectType,
                                                action: "EDIT",
                                            };
                                            setLanguageDataMap(prev => ({
                                                ...prev,
                                                [langCode]: editData,
                                            }));
                                            // Reload courses
                                            if (onAfterSubmit) {
                                                onAfterSubmit();
                                            }
                                        }
                                    },
                                });
                            }
                        },
                        error: () => {
                            api.showMessage("Không thể tạo bản copy", "error");
                            setCopyingLanguages(prev => {
                                const newMap = { ...prev };
                                delete newMap[langCode];
                                return newMap;
                            });
                        },
                    });
                }
            },
            error: () => {
                api.showMessage("Không thể tải dữ liệu từ bản tiếng Anh", "error");
                setCopyingLanguages(prev => {
                    const newMap = { ...prev };
                    delete newMap[langCode];
                    return newMap;
                });
            },
        });
    }, [courseId, currentKey, currentEditNodeType, courses, courseNodeMap, languages, api, onAfterSubmit]);

    // Thêm initialData vào map nếu chưa có
    React.useEffect(() => {
        if (!open || !initialData.post?.id || !availableLanguages.length) return;

        // Tìm ngôn ngữ của initialData bằng cách so sánh postId
        const defaultLang = availableLanguages.find(l => l.postId === initialData.post?.id);
        if (defaultLang) {
            setLanguageDataMap(prev => {
                // Chỉ thêm nếu chưa có
                if (prev[defaultLang.code]) {
                    return prev;
                }
                return {
                    ...prev,
                    [defaultLang.code]: initialData,
                };
            });
        }
    }, [open, initialData.post?.id]);

    const onUpdateData = (langCode: string) => (value: ANY, key: ANY) => {
        setLanguageDataMap(prev => {
            const langData = prev[langCode];
            if (!langData) return prev;

            let updatedData = { ...langData };
            if (value instanceof Function) {
                updatedData = { ...value(updatedData) };
            } else {
                if (typeof key === 'object' && key !== null) {
                    updatedData = {
                        ...updatedData,
                        ...key,
                    };
                } else {
                    (updatedData as Record<string, unknown>)[key as string] = value;
                }
            }

            return {
                ...prev,
                [langCode]: updatedData,
            };
        });
    };

    const handleSubmitLanguage = (langCode: string) => () => {
        const langData = languageDataMap[langCode];
        if (!langData || api.open) return;

        const objectType = langData.type || getNodeObjectType(currentEditNodeType || "");
        if (!objectType) return;

        api.ajax({
            url: `post-type/post/${objectType}`,
            method: "POST",
            data: { ...langData.post, _action: langData.action },
            success: (result) => {
                if (result.post?.id) {
                    // Nếu là question và có is_complete, cập nhật courseNodeMap ngay lập tức
                    if (currentEditNodeType === "question" && langData.post && courses && setCourseNodeMap) {
                        const questionTitle = langData.post.title;
                        const courseId = findCourseIdByPostId(result.post.id, courses) || 
                                      (langData.post.course ? String(langData.post.course) : null);
                        
                        if (courseId && questionTitle) {
                            // Tìm path (translateKey / sectionKey / chapterKey / lessonKey) cho question này
                            const questionPath = (() => {
                                for (const course of courses) {
                                    if (String(course.id) !== String(courseId)) continue;
                                    if (!course.translates) continue;
                                    for (const translate of course.translates) {
                                        if (!translate.sections) continue;
                                        for (const section of translate.sections) {
                                            if (!section.chapters) continue;
                                            for (const chapter of section.chapters) {
                                                if (!chapter.lessons) continue;
                                                for (const lesson of chapter.lessons) {
                                                    if (lesson.questions?.some(q => q.title === questionTitle)) {
                                                        return {
                                                            translateKey: translate.key || undefined,
                                                            sectionKey: section.key || undefined,
                                                            chapterKey: chapter.key || undefined,
                                                            lessonKey: lesson.key || undefined,
                                                        };
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                return null;
                            })();

                            if (questionPath && questionPath.lessonKey) {
                                const mapKey = buildCourseNodeMapKey({
                                    courseId: String(courseId),
                                    translateKey: questionPath.translateKey,
                                    sectionKey: questionPath.sectionKey,
                                    chapterKey: questionPath.chapterKey,
                                    lessonKey: questionPath.lessonKey,
                                    questionKey: questionTitle,
                                });
                            setCourseNodeMap((prevMap) => {
                                const newMap = { ...prevMap };
                                if (!newMap[mapKey]) {
                                    newMap[mapKey] = {};
                                }
                                
                                if (newMap[mapKey][langCode] && langData.post) {
                                    // Cập nhật is_complete cho node trong map
                                    const updatedNode = {
                                        ...newMap[mapKey][langCode],
                                        is_complete: langData.post.is_complete || false,
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
                    
                    // Reload dữ liệu cho ngôn ngữ này
                    const postId = result.post.id;
                    api.ajax({
                        url: `post-type/detail/${objectType}/${postId}`,
                        method: "POST",
                        data: { id: postId },
                        loading: false,
                        success: (result: ANY) => {
                            if (result.post) {
                                const editData: DataResultApiProps = {
                                    ...result,
                                    type: objectType,
                                    action: "EDIT",
                                };
                                setLanguageDataMap(prev => ({
                                    ...prev,
                                    [langCode]: editData,
                                }));
                            }
                        },
                    });
                    // Gọi onAfterSubmit để reload courses nếu có
                    if (onAfterSubmit) {
                        onAfterSubmit();
                    }
                }
            },
        });
    };

    // Hàm translate từ tiếng Anh bằng AI
    const handleTranslateByAI = React.useCallback((langCode: string) => {
        if (!courseId || !currentKey || !currentEditNodeType || !courses) {
            api.showMessage("Không tìm thấy thông tin cần thiết", "error");
            return;
        }

        const langData = languageDataMap[langCode];
        if (!langData || !langData.post?.id) {
            api.showMessage("Không tìm thấy dữ liệu để translate", "error");
            return;
        }

        // Tìm ID của post tiếng Anh dựa trên courseNodeMap + path đầy đủ
        const resolveCurrentPath = () => {
            if (!courses) return null;
            for (const course of courses) {
                if (String(course.id) !== String(courseId)) continue;
                if (!course.translates) continue;
                for (const translate of course.translates) {
                    const tKey = translate.key || undefined;
                    // Translate
                    if (currentEditNodeType === "translate" && translate.key === currentKey) {
                        return { translateKey: tKey };
                    }
                    if (!translate.sections) continue;
                        for (const section of translate.sections) {
                        const sKey = section.key || undefined;
                        // Section
                        if (currentEditNodeType === "section" && section.key === currentKey) {
                            return { translateKey: tKey, sectionKey: sKey };
                        }
                        if (!section.chapters) continue;
                            for (const chapter of section.chapters) {
                            const cKey = chapter.key || undefined;
                            // Chapter
                            if (currentEditNodeType === "chapter" && chapter.key === currentKey) {
                                return { translateKey: tKey, sectionKey: sKey, chapterKey: cKey };
                            }
                            if (!chapter.lessons) continue;
                                for (const lesson of chapter.lessons) {
                                    const lKey = lesson.key || undefined;
                                    const lessonId = lesson.id ? String(lesson.id) : null;
                                    // Lesson: ưu tiên so sánh theo id
                                    if (
                                        currentEditNodeType === "lesson" &&
                                        ((currentPostId && lessonId && String(currentPostId) === lessonId) ||
                                            (!currentPostId && lesson.key === currentKey))
                                    ) {
                                        return { translateKey: tKey, sectionKey: sKey, chapterKey: cKey, lessonKey: lKey };
                                    }
                                    if (!lesson.questions) continue;
                                    for (const question of lesson.questions) {
                                        const qKey = question.title || undefined;
                                        const qId = question.id ? String(question.id) : null;
                                        // Question: ưu tiên so sánh theo id
                                        if (
                                            currentEditNodeType === "question" &&
                                            ((currentPostId && qId && String(currentPostId) === qId) ||
                                                (!currentPostId && question.title === currentKey))
                                        ) {
                                            return {
                                                translateKey: tKey,
                                                sectionKey: sKey,
                                                chapterKey: cKey,
                                                lessonKey: lKey,
                                                questionKey: qKey,
                                            };
                                        }
                                    }
                                }
                        }
                    }
                }
            }
            return null;
        };

        const currentPath = resolveCurrentPath();
        if (!currentPath) {
            api.showMessage("Không tìm thấy bản tiếng Anh để translate", "error");
            return;
        }

        const mapKey = buildCourseNodeMapKey({
            courseId: String(courseId),
            ...currentPath,
        });
        const nodeMap = courseNodeMap[mapKey] || {};
        const englishLang = languages.find(lang => lang.code === "en") || languages[0];
        const englishNode = englishLang && nodeMap[englishLang.code] ? nodeMap[englishLang.code] as TreeNode : null;

        if (!englishNode || !englishNode.id) {
            api.showMessage("Không tìm thấy bản tiếng Anh để translate", "error");
            return;
        }

        setTranslatingLanguages(prev => ({ ...prev, [langCode]: true }));

        // Lấy post type
        const objectType = langData.type || getNodeObjectType(currentEditNodeType || "");
        if (!objectType) {
            api.showMessage("Không tìm thấy post type", "error");
            setTranslatingLanguages(prev => {
                const newMap = { ...prev };
                delete newMap[langCode];
                return newMap;
            });
            return;
        }

        // Gọi API translate
        apiTranslate.ajax({
            url: "plugin/vn4-e-learning/app-mobile/course/translate-question-by-ai",
            method: "POST",
            data: {
                id_source: englishNode.id,
                id_target: langData.post.id,
                language_target: langCode,
                post_type: objectType,
            },
            success: (result: ANY) => {
                setTranslatingLanguages(prev => {
                    const newMap = { ...prev };
                    delete newMap[langCode];
                    return newMap;
                });
                
                if (result.post?.id) {
                    // Reload dữ liệu sau khi translate
                    const objectType = langData.type || getNodeObjectType(currentEditNodeType || "");
                    if (objectType) {
                        api.ajax({
                            url: `post-type/detail/${objectType}/${result.post.id}`,
                            method: "POST",
                            data: { id: result.post.id },
                            loading: false,
                            success: (detailResult: ANY) => {
                                if (detailResult.post) {
                                    const editData: DataResultApiProps = {
                                        ...detailResult,
                                        type: objectType,
                                        action: "EDIT",
                                    };
                                    setLanguageDataMap(prev => ({
                                        ...prev,
                                        [langCode]: editData,
                                    }));
                                    api.showMessage("Đã translate thành công", "success");
                                }
                            },
                        });
                    }
                    // Gọi onAfterSubmit để reload courses nếu có
                    if (onAfterSubmit) {
                        onAfterSubmit();
                    }
                } else {
                    api.showMessage("Translate thành công nhưng không có dữ liệu trả về", "warning");
                }
            },
            error: () => {
                setTranslatingLanguages(prev => {
                    const newMap = { ...prev };
                    delete newMap[langCode];
                    return newMap;
                });
                api.showMessage("Không thể translate bằng AI", "error");
            },
        });
    }, [courseId, currentKey, currentEditNodeType, courses, courseNodeMap, languages, languageDataMap, api, apiTranslate, onAfterSubmit]);

    const title = React.useMemo(() => {
        const nodeTypeLabel = currentEditNodeType === "translate" ? "Translate"
            : currentEditNodeType === "section" ? "Section"
            : currentEditNodeType === "chapter" ? "Chapter"
            : currentEditNodeType === "lesson" ? "Lesson"
            : currentEditNodeType === "question" ? "Question"
            : "Post";
        
        const titleText = initialData.post?.title || initialData.post?.key || "";
        return `Edit ${nodeTypeLabel}${titleText ? ` - "${titleText}"` : ""}`;
    }, [currentEditNodeType, initialData.post]);

    return (
        <DrawerCustom
            restDialogContent={{
                style: {
                    background: theme.palette.body.background,
                    paddingTop: 0,
                },
            }}
            width={Math.max(window.innerWidth || 1920, 1920)}
            title={title}
            open={open}
            onClose={onClose}
        >
            <Box
                sx={{
                    paddingTop: 3,
                    paddingBottom: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        overflowX: "auto",
                        overflowY: "hidden",
                        gap: 2,
                        pb: 2,
                        flex: 1,
                        "&::-webkit-scrollbar": {
                            height: 8,
                        },
                        "&::-webkit-scrollbar-track": {
                            background: "rgba(0,0,0,0.1)",
                            borderRadius: 4,
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "rgba(0,0,0,0.3)",
                            borderRadius: 4,
                            "&:hover": {
                                background: "rgba(0,0,0,0.5)",
                            },
                        },
                    }}
                >
                    {availableLanguages.map((lang) => {
                        const langData = languageDataMap[lang.code];
                        const isLoading = loadingLanguages[lang.code] || false;
                        const hasData = !!langData && !!lang.postId;

                        return (
                            <Box
                                key={lang.code}
                                sx={{
                                    minWidth: 700,
                                    width: 700,
                                    flexShrink: 0,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 2,
                                    overflow: "hidden",
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                {/* Header cho mỗi column */}
                                <Box
                                    sx={{
                                        p: 2,
                                        borderBottom: "1px solid",
                                        borderColor: "divider",
                                        backgroundColor: "action.hover",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                    }}
                                >
                                    {lang.icon_url ? (
                                        <img
                                            src={lang.icon_url}
                                            alt={lang.title}
                                            style={{
                                                width: 24,
                                                height: 18,
                                                objectFit: "cover",
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={`https://flagcdn.com/w40/${lang.flag_code}.png`}
                                            alt={lang.title}
                                            style={{
                                                width: 24,
                                                height: 18,
                                                objectFit: "cover",
                                            }}
                                        />
                                    )}
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {lang.title}
                                    </Typography>
                                    <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
                                        {lang.code !== "en" && hasData && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => handleTranslateByAI(lang.code)}
                                                disabled={translatingLanguages[lang.code] || apiTranslate.open}
                                                sx={{
                                                    minWidth: "auto",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {translatingLanguages[lang.code] ? "Đang translate..." : "Translate từ tiếng Anh bằng AI"}
                                            </Button>
                                        )}
                                        {!hasData && (
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: "text.secondary",
                                                    fontStyle: "italic",
                                                }}
                                            >
                                                Chưa có dữ liệu
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {/* Content cho mỗi column */}
                                <Box
                                    sx={{
                                        flex: 1,
                                        overflowY: "auto",
                                        p: 2,
                                    }}
                                >
                                    {isLoading ? (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                minHeight: 200,
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                Đang tải...
                                            </Typography>
                                        </Box>
                                    ) : hasData ? (
                                        <Form
                                            data={langData as CreatePostTypeData}
                                            postType={langData.type}
                                            onUpdateData={onUpdateData(lang.code) as HandleUpdateDataProps}
                                            handleSubmit={handleSubmitLanguage(lang.code)}
                                            handleAfterDelete={handleAfterDelete}
                                            open={openLoading && isLoading}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                minHeight: 200,
                                                gap: 2,
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                Không có dữ liệu cho ngôn ngữ này
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                onClick={() => handleCopyFromEnglish(lang.code)}
                                                disabled={copyingLanguages[lang.code] || false}
                                            >
                                                {copyingLanguages[lang.code] ? "Đang copy..." : "Copy từ tiếng Anh"}
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </DrawerCustom>
    );
}
