import React from "react";
import Box from "components/atoms/Box";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { TreeNode, CourseNodeMap, Translate, Section, Chapter, Lesson, Question, Course } from "./types";
import { getNodeType } from "./utils";
import { buildCourseNodeMapKey } from "./helpers";

interface LanguageFlagsProps {
    node: TreeNode;
    languages: Array<{ code: string; title: string; flag_code: string; icon_url?: string }>;
    courseNodeMap: CourseNodeMap;
    courseId: string | null;
    currentLanguage?: string;
    onEditNode?: (nodeId: string, nodeType: string) => void;
    onCreateCopyFromEnglish?: (langCode: string, nodeKey: string, nodeType: string, courseId: string) => void;
    courses?: Course[];
}

export default function LanguageFlags({
    node,
    languages,
    courseNodeMap,
    courseId,
    currentLanguage,
    onEditNode,
    onCreateCopyFromEnglish,
    courses,
}: LanguageFlagsProps) {
    const rawNodeType = getNodeType(node);
    
    // Chỉ hiển thị cho translate, section, chapter, lesson, question
    if (rawNodeType === "course" || !courseId || !languages || languages.length === 0) {
        return null;
    }

    const nodeType = rawNodeType as "translate" | "section" | "chapter" | "lesson" | "question";

    // Lấy key của node & tạo mapKey theo cấu trúc phân cấp
    let nodeKey: string | undefined;
    let mapKey: string | null = null;

    if (nodeType === "translate") {
        const translate = node as Translate;
        nodeKey = translate.key;
        if (nodeKey) {
            mapKey = buildCourseNodeMapKey({
                courseId: String(courseId),
                translateKey: nodeKey,
            });
        }
    } else if (nodeType === "section") {
        const section = node as Section;
        nodeKey = section.key;
        if (nodeKey && courses) {
            for (const course of courses) {
                if (String(course.id) !== String(courseId)) continue;
                if (!course.translates) continue;
                for (const translate of course.translates) {
                    if (translate.sections?.some(s => s.key === nodeKey)) {
                        if (translate.key) {
                            mapKey = buildCourseNodeMapKey({
                                courseId: String(courseId),
                                translateKey: translate.key,
                                sectionKey: nodeKey,
                            });
                        }
                        break;
                    }
                }
            }
        }
    } else if (nodeType === "chapter") {
        const chapter = node as Chapter;
        nodeKey = chapter.key;
        if (nodeKey && courses) {
            for (const course of courses) {
                if (String(course.id) !== String(courseId)) continue;
                if (!course.translates) continue;
                for (const translate of course.translates) {
                    if (!translate.sections) continue;
                    for (const section of translate.sections) {
                        if (section.chapters?.some(c => c.key === nodeKey)) {
                            if (translate.key && section.key) {
                                mapKey = buildCourseNodeMapKey({
                                    courseId: String(courseId),
                                    translateKey: translate.key,
                                    sectionKey: section.key,
                                    chapterKey: nodeKey,
                                });
                            }
                            break;
                        }
                    }
                }
            }
        }
    } else if (nodeType === "lesson") {
        const lesson = node as Lesson;
        nodeKey = lesson.key;
        if (nodeKey && courses) {
            for (const course of courses) {
                if (String(course.id) !== String(courseId)) continue;
                if (!course.translates) continue;
                for (const translate of course.translates) {
                    if (!translate.sections) continue;
                    for (const section of translate.sections) {
                        if (!section.chapters) continue;
                        for (const chapter of section.chapters) {
                            // Dò đúng chapter chứa CHÍNH lesson này (theo id), tránh nhầm lesson khác có cùng key
                            if (chapter.lessons?.some(l => String(l.id) === String(lesson.id))) {
                                if (translate.key && section.key && chapter.key) {
                                    mapKey = buildCourseNodeMapKey({
                                        courseId: String(courseId),
                                        translateKey: translate.key,
                                        sectionKey: section.key,
                                        chapterKey: chapter.key,
                                        lessonKey: nodeKey,
                                    });
                                }
                                break;
                            }
                        }
                    }
                }
            }
        }
    } else if (nodeType === "question") {
        const question = node as Question;
        nodeKey = question.title;
        const questionId = question.id ? String(question.id) : null;
        if (courses) {
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
                                // Question: ưu tiên so sánh theo id để tránh trùng title
                                const foundQuestion = lesson.questions?.find(q => {
                                    const qId = q.id ? String(q.id) : null;
                                    const matchById = questionId && qId && questionId === qId;
                                    const matchByTitle = !questionId && nodeKey && q.title === nodeKey;
                                    return matchById || matchByTitle;
                                });
                                if (foundQuestion) {
                                    if (translate.key && section.key && chapter.key && lesson.key && nodeKey) {
                                        mapKey = buildCourseNodeMapKey({
                                            courseId: String(courseId),
                                            translateKey: translate.key,
                                            sectionKey: section.key,
                                            chapterKey: chapter.key,
                                            lessonKey: lesson.key,
                                            questionKey: nodeKey,
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const nodeMap = mapKey ? (courseNodeMap[mapKey] || {}) : {};

    // Hàm kiểm tra parent có tồn tại trong ngôn ngữ target không
    const checkParentExists = (langCode: string): boolean => {
        // Lấy sẵn id của lesson/question (nếu cần so sánh theo id thay vì key)
        const lessonNode = nodeType === "lesson" ? (node as Lesson) : null;
        const lessonId = lessonNode?.id ? String(lessonNode.id) : null;
        const questionNode = nodeType === "question" ? (node as Question) : null;
        const questionId = questionNode?.id ? String(questionNode.id) : null;

        if (nodeType === "translate") {
            // Translate không có parent (parent là course)
            return true;
        }

        if (!nodeKey || !courseId || !courses) {
            return false;
        }

        // Tìm parent key từ node trong cây courses
        let parentKey: string | null = null;
        let parentType: string | null = null;
        let parentTranslateKey: string | null = null;
        let parentSectionKey: string | null = null;
        let parentChapterKey: string | null = null;

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
                            parentTranslateKey = translate.key || null;
                            break;
                        }
                    } else if (nodeType === "chapter") {
                        // Chapter parent là section
                        if (translate.sections) {
                            for (const section of translate.sections) {
                                if (section.chapters?.some(c => c.key === nodeKey)) {
                                    parentKey = section.key || null;
                                    parentType = "section";
                                    parentTranslateKey = translate.key || null;
                                    parentSectionKey = section.key || null;
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
                                        // Dò đúng chapter chứa CHÍNH lesson này (theo id), tránh nhầm lesson khác có cùng key
                                        if (chapter.lessons?.some(l => (lessonId ? String(l.id) === lessonId : l.key === nodeKey))) {
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
                    } else if (nodeType === "question") {
                        // Question parent là lesson
                        if (translate.sections) {
                            for (const section of translate.sections) {
                                if (section.chapters) {
                                    for (const chapter of section.chapters) {
                                        if (chapter.lessons) {
                                            for (const lesson of chapter.lessons) {
                                                // Question: ưu tiên so sánh theo id để tránh trùng title
                                                if (lesson.questions?.some(q => {
                                                    const qId = q.id ? String(q.id) : null;
                                                    return (questionId && qId && questionId === qId) ||
                                                           (!questionId && nodeKey && q.title === nodeKey);
                                                })) {
                                                    parentKey = lesson.key || null;
                                                    parentType = "lesson";
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
                    }
                }
            }
            if (parentKey && parentType) break;
        }

        if (!parentKey || !parentType) {
            return false;
        }

        // Kiểm tra parent có tồn tại trong ngôn ngữ target không
        const parentMapKey = buildCourseNodeMapKey({
            courseId: String(courseId),
            translateKey: parentTranslateKey || undefined,
            sectionKey: parentType === "section" || parentSectionKey ? parentSectionKey || undefined : undefined,
            chapterKey: parentType === "chapter" || parentChapterKey ? parentChapterKey || undefined : undefined,
            lessonKey: parentType === "lesson" ? parentKey || undefined : undefined,
        });
        const parentNodeMap = courseNodeMap[parentMapKey] || {};
        const parentExists = !!parentNodeMap[langCode];

        return parentExists;
    };

    // Luôn hiển thị flags, ngay cả khi không có node nào trong map
    return (
        <Box
            sx={{
                display: "flex",
                gap: 0.5,
                alignItems: "center",
                flexShrink: 0,
            }}
        >
            {languages.map((lang) => {
                const nodeForLang = nodeMap[lang.code];
                const isAvailable = !!nodeForLang;
                const isCurrentLanguage = lang.code === currentLanguage;
                const isUnavailable = !isAvailable;
                
                // Kiểm tra có thể copy không (phải có parent trong ngôn ngữ target)
                const parentExists = checkParentExists(lang.code);
                const canCreateCopy = isUnavailable && 
                    (nodeType === "question" || nodeType === "translate" || nodeType === "section" || nodeType === "chapter" || nodeType === "lesson") && 
                    onCreateCopyFromEnglish && 
                    nodeKey && 
                    parentExists;
                
                // Kiểm tra is_complete cho question
                let isComplete = false;
                if (nodeType === "question" && nodeForLang) {
                    const questionNode = nodeForLang as Question;
                    isComplete = questionNode.is_complete === true;
                }
                
                // Opacity cho flag image
                const flagOpacity = isAvailable ? 1 : (canCreateCopy ? 0.1 : 0.05);

                return (
                    <Box
                        key={lang.code}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isAvailable && nodeForLang && onEditNode) {
                                onEditNode(nodeForLang.id, nodeType);
                            } else if (canCreateCopy && nodeKey && courseId) {
                                // Tạo copy từ tiếng Anh cho question, translate, section, chapter hoặc lesson
                                onCreateCopyFromEnglish(lang.code, nodeKey, nodeType, courseId);
                            }
                        }}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            position: "relative",
                            cursor: isAvailable || canCreateCopy ? "pointer" : "not-allowed",
                            transition: "all 0.2s ease",
                            borderRadius: 0.5,
                            p: 0.25,
                            // Luôn có border để đảm bảo kích thước và alignment giống nhau
                            border: "2px solid",
                            borderColor: isCurrentLanguage 
                                ? "primary.main" 
                                : (isUnavailable && canCreateCopy)
                                    ? "#ffc107" // Màu vàng chỉ khi có thể copy
                                    : "transparent", // Transparent cho button disable
                            "&:hover": isAvailable || canCreateCopy ? {
                                backgroundColor: "action.hover",
                                transform: "scale(1.1)",
                            } : {},
                        }}
                        title={
                            isAvailable 
                                ? `${lang.title} - Click để chuyển` 
                                : canCreateCopy
                                    ? `${lang.title} - Click để tạo bản copy từ tiếng Anh`
                                    : `${lang.title} - Chưa có (Parent chưa được tạo)`
                        }
                    >
                        {lang.icon_url ? (
                            <img
                                src={lang.icon_url}
                                alt={lang.title}
                                style={{
                                    width: 16,
                                    height: 12,
                                    objectFit: "cover",
                                    opacity: flagOpacity,
                                }}
                            />
                        ) : (
                            <img
                                src={`https://flagcdn.com/w20/${lang.flag_code}.png`}
                                alt={lang.title}
                                style={{
                                    width: 16,
                                    height: 12,
                                    objectFit: "cover",
                                    opacity: flagOpacity,
                                }}
                            />
                        )}
                        {isComplete && isAvailable && (
                            <CheckCircleIcon
                                sx={{
                                    position: "absolute",
                                    top: -4,
                                    right: -4,
                                    fontSize: 12,
                                    color: "success.main",
                                    backgroundColor: "background.paper",
                                    borderRadius: "50%",
                                }}
                            />
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
