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
import { getLanguageCodeFromTranslate, findTranslateParent } from "./helpers";

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
    findCourseIdByPostId,
}: MultiLanguageDrawerProps) {
    const theme = useTheme();
    const api = useAjax();
    const [languageDataMap, setLanguageDataMap] = React.useState<Record<string, DataResultApiProps>>({});
    const [loadingLanguages, setLoadingLanguages] = React.useState<Record<string, boolean>>({});
    const [copyingLanguages, setCopyingLanguages] = React.useState<Record<string, boolean>>({});
    const [attemptedCopy, setAttemptedCopy] = React.useState<Set<string>>(new Set());

    // Lấy key từ post hiện tại
    const currentKey = currentEditNodeType === "question" 
        ? initialData.post?.title 
        : initialData.post?.key;
    const currentPostId = initialData.post?.id;

    // Tìm courseId
    const courseId = React.useMemo(() => {
        if (!currentPostId || !courses) return null;
        return findCourseIdByPostId(currentPostId, courses);
    }, [currentPostId, courses, findCourseIdByPostId]);

    // Tìm node trong cây courses bằng id
    const findNodeById = React.useCallback((nodes: TreeNode[], targetId: string): TreeNode | null => {
        for (const node of nodes) {
            if (node.id === targetId) return node;
            const children = getChildren(node);
            const found = findNodeById(children, targetId);
            if (found) return found;
        }
        return null;
    }, []);

    // Tạo map key và availableLanguages
    const availableLanguages = React.useMemo(() => {
        if (!courseId || !currentEditNodeType || !courses) return [];
        
        // Nếu có key, dùng courseNodeMap
        if (currentKey) {
            const mapKey = `course_${courseId}_${currentEditNodeType}_${currentKey}`;
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
            if (course.id === courseId) {
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

            // Tìm parent key từ node
            let parentKey: string | null = null;
            let parentType: string | null = null;

            for (const course of courses) {
                if (course.id !== courseId) continue;
                if (course.translates) {
                    for (const translate of course.translates) {
                        if (currentEditNodeType === "section") {
                            if (translate.sections?.some(s => s.key === currentKey)) {
                                parentKey = translate.key || null;
                                parentType = "translate";
                                break;
                            }
                        } else if (currentEditNodeType === "chapter") {
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters?.some(c => c.key === currentKey)) {
                                        parentKey = section.key || null;
                                        parentType = "section";
                                        break;
                                    }
                                }
                            }
                        } else if (currentEditNodeType === "lesson") {
                            if (translate.sections) {
                                for (const section of translate.sections) {
                                    if (section.chapters) {
                                        for (const chapter of section.chapters) {
                                            if (chapter.lessons?.some(l => l.key === currentKey)) {
                                                parentKey = chapter.key || null;
                                                parentType = "chapter";
                                                break;
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
                                                    if (lesson.questions?.some(q => q.title === currentKey)) {
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

            const parentMapKey = `course_${courseId}_${parentType}_${parentKey}`;
            const parentNodeMap = courseNodeMap[parentMapKey] || {};
            return !!parentNodeMap[langCode];
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

        // Tìm node tiếng Anh
        const mapKey = `course_${courseId}_${currentEditNodeType}_${currentKey}`;
        const nodeMap = courseNodeMap[mapKey] || {};
        const englishLang = languages.find(lang => lang.code === "en") || languages[0];
        const englishNode = englishLang && nodeMap[englishLang.code] ? nodeMap[englishLang.code] as TreeNode : null;

        if (!englishNode || !englishNode.id) {
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
                        const courseNode = courses.find(c => c.id === courseId);
                        if (courseNode?.title) {
                            newPostData.course_detail = { id: courseId, title: courseNode.title };
                        }
                    } else if (currentEditNodeType === "section") {
                        // Tìm translate parent đúng ngôn ngữ
                        const translateKey = (() => {
                            for (const course of courses) {
                                if (course.id !== courseId) continue;
                                if (course.translates) {
                                    for (const translate of course.translates) {
                                        if (translate.sections?.some(s => s.key === currentKey)) {
                                            return translate.key;
                                        }
                                    }
                                }
                            }
                            return null;
                        })();
                        if (translateKey) {
                            const translateMapKey = `course_${courseId}_translate_${translateKey}`;
                            const translateNodeMap = courseNodeMap[translateMapKey] || {};
                            const targetTranslate = translateNodeMap[langCode] as Translate | null;
                            if (targetTranslate?.id) {
                                newPostData.translate = targetTranslate.id;
                                if (targetTranslate.title) {
                                    newPostData.translate_detail = { id: targetTranslate.id, title: targetTranslate.title };
                                }
                            }
                        }
                    } else if (currentEditNodeType === "chapter") {
                        // Tìm section parent đúng ngôn ngữ
                        const sectionKey = (() => {
                            for (const course of courses) {
                                if (course.id !== courseId) continue;
                                if (course.translates) {
                                    for (const translate of course.translates) {
                                        if (translate.sections) {
                                            for (const section of translate.sections) {
                                                if (section.chapters?.some(c => c.key === currentKey)) {
                                                    return section.key;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            return null;
                        })();
                        if (sectionKey) {
                            const sectionMapKey = `course_${courseId}_section_${sectionKey}`;
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
                        const chapterKey = (() => {
                            for (const course of courses) {
                                if (course.id !== courseId) continue;
                                if (course.translates) {
                                    for (const translate of course.translates) {
                                        if (translate.sections) {
                                            for (const section of translate.sections) {
                                                if (section.chapters) {
                                                    for (const chapter of section.chapters) {
                                                        if (chapter.lessons?.some(l => l.key === currentKey)) {
                                                            return chapter.key;
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
                        if (chapterKey) {
                            const chapterMapKey = `course_${courseId}_chapter_${chapterKey}`;
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
                        const lessonKey = (() => {
                            for (const course of courses) {
                                if (course.id !== courseId) continue;
                                if (course.translates) {
                                    for (const translate of course.translates) {
                                        if (translate.sections) {
                                            for (const section of translate.sections) {
                                                if (section.chapters) {
                                                    for (const chapter of section.chapters) {
                                                        if (chapter.lessons) {
                                                            for (const lesson of chapter.lessons) {
                                                                if (lesson.questions?.some(q => q.title === currentKey)) {
                                                                    return lesson.key;
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
                        if (lessonKey) {
                            const lessonMapKey = `course_${courseId}_lesson_${lessonKey}`;
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
                                    minWidth: 500,
                                    width: 500,
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
                                    {!hasData && (
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                ml: "auto",
                                                color: "text.secondary",
                                                fontStyle: "italic",
                                            }}
                                        >
                                            Chưa có dữ liệu
                                        </Typography>
                                    )}
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
