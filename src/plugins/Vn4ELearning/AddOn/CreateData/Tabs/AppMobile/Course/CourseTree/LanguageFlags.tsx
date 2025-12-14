import React from "react";
import Box from "components/atoms/Box";
import { TreeNode, CourseNodeMap, Translate, Section, Chapter, Lesson, Question } from "./types";
import { getNodeType } from "./utils";

interface LanguageFlagsProps {
    node: TreeNode;
    languages: Array<{ code: string; title: string; flag_code: string; icon_url?: string }>;
    courseNodeMap: CourseNodeMap;
    courseId: string | null;
    currentLanguage?: string;
    onEditNode?: (nodeId: string, nodeType: string) => void;
}

export default function LanguageFlags({
    node,
    languages,
    courseNodeMap,
    courseId,
    currentLanguage,
    onEditNode,
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
                const opacity = isAvailable ? 1 : 0.1;
                const isCurrentLanguage = lang.code === currentLanguage;

                return (
                    <Box
                        key={lang.code}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isAvailable && nodeForLang && onEditNode) {
                                onEditNode(nodeForLang.id, nodeType);
                            }
                        }}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: isAvailable ? "pointer" : "not-allowed",
                            transition: "all 0.2s ease",
                            borderRadius: 0.5,
                            p: 0.25,
                            border: isCurrentLanguage ? "2px solid" : "none",
                            borderColor: isCurrentLanguage ? "primary.main" : "transparent",
                            "&:hover": isAvailable ? {
                                backgroundColor: "action.hover",
                                transform: "scale(1.1)",
                            } : {},
                        }}
                        title={isAvailable ? `${lang.title} - Click để chuyển` : `${lang.title} - Chưa có`}
                    >
                        {lang.icon_url ? (
                            <img
                                src={lang.icon_url}
                                alt={lang.title}
                                style={{
                                    width: 16,
                                    height: 12,
                                    objectFit: "cover",
                                    opacity,
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
                                    opacity,
                                }}
                            />
                        )}
                    </Box>
                );
            })}
        </Box>
    );
}
