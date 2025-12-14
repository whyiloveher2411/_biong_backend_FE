import { Translate, Section, Chapter, Lesson, Question, TreeNode, Course, CourseNodeMap } from "./types";
import { getNodeType } from "./utils";

// Helper function: Map từ sac_language ID hoặc title sang language code
export function getLanguageCodeFromTranslate(
    translate: Translate,
    languages: Array<{ code: string; title: string; flag_code: string; icon_url?: string; id?: string | number }>
): string {
    // Thử lấy từ language field trước (nếu có)
    if (translate.language) {
        return translate.language;
    }
    if (translate.meta?.language) {
        return translate.meta.language;
    }

    // Nếu có sac_language_detail, parse để lấy title
    if (translate.sac_language_detail) {
        try {
            const langDetail = JSON.parse(translate.sac_language_detail);
            const langTitle = langDetail?.title || "";
            
            // Tìm trong languages array một language có title match
            const matchedLang = languages.find(lang => 
                lang.title === langTitle || 
                lang.title.toLowerCase() === langTitle.toLowerCase()
            );
            if (matchedLang) {
                return matchedLang.code;
            }
        } catch (e) {
            console.warn(`[getLanguageCodeFromTranslate] Failed to parse sac_language_detail:`, e);
        }
    }

    // Nếu có sac_language ID, tìm trong languages array
    if (translate.sac_language && languages.length > 0) {
        const langId = translate.sac_language;
        // Thử tìm bằng id nếu languages có field id
        const matchedLang = languages.find(lang => 
            lang.id?.toString() === langId.toString()
        );
        if (matchedLang) {
            return matchedLang.code;
        }
    }

    return "";
}

// Helper function: Build course node map
export function buildCourseNodeMap(
    courses: Course[],
    languages: Array<{ code: string; title: string; flag_code: string; icon_url?: string; id?: string | number }>
): CourseNodeMap {
    const map: CourseNodeMap = {};

    const addNodeToMap = (
        node: TreeNode,
        courseId: string,
        nodeType: string,
        language: string
    ) => {
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

        if (!nodeKey || !language) {
            return;
        }

        const mapKey = `course_${courseId}_${nodeType}_${nodeKey}`;
        if (!map[mapKey]) {
            map[mapKey] = {};
        }
        map[mapKey][language] = node;
    };

    // Traverse courses
    for (const course of courses) {
        if (!course.id) continue;

        // Traverse translates
        if (course.translates) {
            for (const translate of course.translates) {
                const language = getLanguageCodeFromTranslate(translate, languages);
                
                if (language && translate.key) {
                    addNodeToMap(translate, course.id, "translate", language);
                }

                // Traverse sections
                if (translate.sections) {
                    for (const section of translate.sections) {
                        const sectionLanguage = language; // Section dùng language từ translate parent
                        
                        if (section.key && sectionLanguage) {
                            addNodeToMap(section, course.id, "section", sectionLanguage);
                        }

                        // Traverse chapters
                        if (section.chapters) {
                            for (const chapter of section.chapters) {
                                const chapterLanguage = sectionLanguage;
                                
                                if (chapter.key && chapterLanguage) {
                                    addNodeToMap(chapter, course.id, "chapter", chapterLanguage);
                                }

                                // Traverse lessons
                                if (chapter.lessons) {
                                    for (const lesson of chapter.lessons) {
                                        const lessonLanguage = chapterLanguage;
                                        
                                        if (lesson.key && lessonLanguage) {
                                            addNodeToMap(lesson, course.id, "lesson", lessonLanguage);
                                        }

                                        // Traverse questions
                                        if (lesson.questions) {
                                            for (const question of lesson.questions) {
                                                const questionLanguage = lessonLanguage;
                                                
                                                if (question.title && questionLanguage) {
                                                    addNodeToMap(question, course.id, "question", questionLanguage);
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

    return map;
}

// Helper function: Tìm translate parent của một node
export function findTranslateParent(
    node: TreeNode,
    courses: Course[]
): Translate | null {
    const nodeType = getNodeType(node);

    // Nếu node là translate, return chính nó
    if (nodeType === "translate") {
        return node as Translate;
    }

    // Tìm translate parent bằng cách traverse lên cây
    const findParent = (
        targetNode: TreeNode,
        courseList: Course[]
    ): Translate | null => {
        for (const course of courseList) {
            if (course.translates) {
                for (const translate of course.translates) {
                    // Nếu node là section và thuộc translate này
                    if (nodeType === "section") {
                        if (translate.sections?.some((s) => s.id === targetNode.id)) {
                            return translate;
                        }
                    }
                    // Nếu node là chapter, tìm section cha
                    else if (nodeType === "chapter") {
                        if (translate.sections) {
                            for (const section of translate.sections) {
                                if (section.chapters?.some((c) => c.id === targetNode.id)) {
                                    return translate;
                                }
                            }
                        }
                    }
                    // Nếu node là lesson, tìm chapter cha
                    else if (nodeType === "lesson") {
                        if (translate.sections) {
                            for (const section of translate.sections) {
                                if (section.chapters) {
                                    for (const chapter of section.chapters) {
                                        if (chapter.lessons?.some((l) => l.id === targetNode.id)) {
                                            return translate;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Nếu node là question, tìm lesson cha
                    else if (nodeType === "question") {
                        if (translate.sections) {
                            for (const section of translate.sections) {
                                if (section.chapters) {
                                    for (const chapter of section.chapters) {
                                        if (chapter.lessons) {
                                            for (const lesson of chapter.lessons) {
                                                if (lesson.questions?.some((q) => q.id === targetNode.id)) {
                                                    return translate;
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
        return null;
    };

    return findParent(node, courses);
}
