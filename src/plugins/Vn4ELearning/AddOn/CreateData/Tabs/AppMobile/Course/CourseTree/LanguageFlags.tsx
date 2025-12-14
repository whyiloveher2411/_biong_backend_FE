import React from "react";
import Box from "components/atoms/Box";
import { TreeNode, CourseNodeMap, Translate, Section, Chapter, Lesson, Question, Course } from "./types";
import { getNodeType } from "./utils";

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
    const nodeType = getNodeType(node);
    
    // Chỉ hiển thị cho translate, section, chapter, lesson, question
    if (nodeType === "course" || !courseId || !languages || languages.length === 0) {
        return null;
    }

    // Lấy key của node
    let nodeKey: string | undefined;
    if (nodeType === "translate") {
        nodeKey = (node as Translate).key;
    } else if (nodeType === "section") {
        nodeKey = (node as Section).key;
    } else if (nodeType === "chapter") {
        nodeKey = (node as Chapter).key;
    } else if (nodeType === "lesson") {
        nodeKey = (node as Lesson).key;
    } else if (nodeType === "question") {
        nodeKey = (node as Question).title;
    }

    // Tạo map key để lookup (nếu có nodeKey)
    const mapKey = nodeKey ? `course_${courseId}_${nodeType}_${nodeKey}` : null;
    const nodeMap = mapKey ? (courseNodeMap[mapKey] || {}) : {};

    // Hàm kiểm tra parent có tồn tại trong ngôn ngữ target không
    const checkParentExists = (langCode: string): boolean => {
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

        // Tìm parent trong cây courses
        for (const course of courses) {
            if (course.id !== courseId) continue;
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
        const parentMapKey = `course_${courseId}_${parentType}_${parentKey}`;
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
                    </Box>
                );
            })}
        </Box>
    );
}
