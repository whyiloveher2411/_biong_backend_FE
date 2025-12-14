import { Translate, Section, Chapter, Lesson, Question, TreeNode, Course, CourseNodeMap } from "./types";
import { getNodeType, getChildren } from "./utils";

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

// Helper function: Tính toán tiến trình dịch của một node (0-100%)
// Translate 100% khi tất cả section đều 100%
// Section 100% khi tất cả chapter 100%
// Chapter 100% khi tất cả lesson 100%
// Lesson 100% khi tất cả question đều có title (key) và đều 100%
// Question 100% khi tồn tại ở tất cả ngôn ngữ (dựa trên số lượng cờ)
// Các post chưa có key thì không tính vào tiến trình
export function calculateTranslationProgress(
    node: TreeNode,
    languages?: Array<{ code: string; title: string; flag_code: string; icon_url?: string; id?: string | number }>,
    courseNodeMap?: CourseNodeMap,
    courseId?: string | null
): number {
    const nodeType = getNodeType(node);
    
    // Với question: tính dựa trên số lượng bản dịch (số lượng cờ)
    if (nodeType === "question") {
        const question = node as Question;
        
        // Nếu không có title, trả về 0%
        if (!question.title) {
            return 0;
        }
        
        // Nếu không có đủ thông tin để tính, trả về 0%
        if (!languages || !courseNodeMap || !courseId || languages.length === 0) {
            return 0;
        }
        
        // Tìm trong courseNodeMap xem question này có trong bao nhiêu ngôn ngữ
        const mapKey = `course_${courseId}_question_${question.title}`;
        const nodeMap = courseNodeMap[mapKey] || {};
        
        // Đếm số ngôn ngữ có bản dịch
        let translatedCount = 0;
        for (const lang of languages) {
            if (nodeMap[lang.code]) {
                translatedCount++;
            }
        }
        
        // Tính tiến trình: (số ngôn ngữ có / tổng số ngôn ngữ) * 100%
        return Math.round((translatedCount * 100) / languages.length);
    }
    
    // Với các node type khác, tính dựa trên children
    const children = getChildren(node);
    
    // Lọc children có key (hoặc title cho question)
    const childrenWithKey = children.filter((child: TreeNode) => {
        const childType = getNodeType(child);
        if (childType === "question") {
            return !!(child as Question).title;
        } else {
            // Với translate, section, chapter, lesson - kiểm tra key
            const translate = child as Translate;
            const section = child as Section;
            const chapter = child as Chapter;
            const lesson = child as Lesson;
            return !!(translate.key || section.key || chapter.key || lesson.key);
        }
    });
    
    // Với lesson: tính tiến trình dựa trên tất cả question (bao gồm cả question chưa có title)
    // Question chưa có title sẽ có tiến trình 0%
    if (nodeType === "lesson") {
        const lesson = node as Lesson;
        const allQuestions = lesson.questions || [];
        
        if (allQuestions.length === 0) {
            return 0;
        }
        
        // Tính tiến trình của từng question (dựa trên số bản dịch)
        let totalProgress = 0;
        for (const question of allQuestions) {
            totalProgress += calculateTranslationProgress(question, languages, courseNodeMap, courseId);
        }
        
        // Trả về trung bình tiến trình của tất cả question
        return Math.round(totalProgress / allQuestions.length);
    }
    
    // Nếu không có children có key, trả về 0%
    if (childrenWithKey.length === 0) {
        return 0;
    }
    
    // Tính tiến trình của từng child và lấy trung bình
    // Chỉ trả về 100% khi tất cả children có key đều 100%
    let totalProgress = 0;
    let allChildrenComplete = true;
    
    for (const child of childrenWithKey) {
        const childProgress = calculateTranslationProgress(child, languages, courseNodeMap, courseId);
        totalProgress += childProgress;
        
        // Nếu có child chưa 100%, thì parent không thể 100%
        if (childProgress < 100) {
            allChildrenComplete = false;
        }
    }
    
    const averageProgress = Math.round(totalProgress / childrenWithKey.length);
    
    // Đảm bảo chỉ trả về 100% khi tất cả children đều 100%
    return allChildrenComplete ? 100 : averageProgress;
}
