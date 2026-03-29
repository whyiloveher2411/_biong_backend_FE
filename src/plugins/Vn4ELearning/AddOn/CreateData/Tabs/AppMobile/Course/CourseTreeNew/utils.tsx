import React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DescriptionIcon from "@mui/icons-material/Description";
import { TreeNode, Course, Section, Chapter, Lesson, Language, FlatNode, CourseLabel, CourseLabelsByLang, CourseLogo, TreeParentContext } from "./types";

/** Parse logo từ course (JSON string hoặc object) và trả về URL nếu có */
export const parseCourseLogoUrl = (logo: string | CourseLogo | undefined): string | null => {
    if (!logo) return null;
    try {
        const parsed = typeof logo === "string" ? (JSON.parse(logo) as CourseLogo) : logo;
        return parsed?.link || null;
    } catch {
        return null;
    }
};

const MULTILANG_FIELDS: { [key: string]: string[] } = {
    course: ["title", "shortDescription", "description"],
    section: ["title", "description"],
    chapter: ["title", "subtitle", "guidebook", "finalTestConfig.titleOverride", "finalTestConfig.shortDescription"],
    lesson: ["title", "shortTitle", "special.title", "special.description"],
    question: ["title", "body", "content"],
};

export const calculateNodeProgress = (node: TreeNode, languages: Language[]): number => {
    if (!languages || languages.length === 0) return 0;

    const type = getNodeType(node);
    const fields = MULTILANG_FIELDS[type] || [];

    // 1. Calculate Field Progress
    let totalFields = fields.length * languages.length;
    let filledFields = 0;

    fields.forEach(fieldPath => {
        // Resolve nested path (e.g., 'special.title')
        const parts = fieldPath.split('.');
        let value: unknown = node;
        for (const part of parts) {
            value = (value as Record<string, unknown>)?.[part];
            if (value === undefined || value === null) break;
        }

        let parsedValue: Record<string, unknown> = {};
        try {
            if (typeof value === 'object' && value !== null) {
                parsedValue = value as Record<string, unknown>;
            } else if (typeof value === 'string') {
                parsedValue = JSON.parse(value) as Record<string, unknown>;
            }
        } catch (e) {
            // If parse error, treat as empty
        }

        languages.forEach(lang => {
            if (parsedValue && parsedValue[lang.code]) {
                filledFields++;
            }
        });
    });

    // 2. Calculate Children Progress
    const children = getChildren(node);
    let totalChildrenProgress = 0;
    let childrenCount = 0;

    if (children.length > 0) {
        children.forEach(child => {
            const childProgress = calculateNodeProgress(child, languages);
            totalChildrenProgress += childProgress;
            childrenCount++;
        });
    }

    // Combine Progress
    // We can weight them. 
    // Option A: Treat fields and children as equal units?
    // Option B: Average of (Fields % + Children %) ?
    // Option C: (Filled Fields + Sum(ChildProgress/100)) / (TotalFields + ChildrenCount) ?? No this is mixing units.

    // Let's use weighted average.
    // If leaf node (Question): Progress = FilledFields / TotalFields
    // If parent node: Progress = (SelfFieldsProgress + ChildrenAverageProgress) / 2 ? OR
    // Progress = (FilledFields + Sum(ChildProgress for each child)) / (TotalFields + ChildrenCount * 100) * 100 ??
    // Let's stick to the prompt's implication: "lesson: ... and question children complete".
    // This implies if a lesson has 3 questions, and 2 are done, lesson is partial?

    // Revised Formula:
    // Total Units = TotalFields (each field-lang pair is 1 unit) + ChildrenCount (each child complete is effectively 1 unit scaled to fields?)

    // Let's try: Total Score = (Percentage Fields * 1) + (Average Percentage Children * 1) / 2 ?
    // If no children: Percentage Fields.
    // If no fields: Average Percentage Children.
    // If both: Average of both.

    let fieldPercentage = totalFields > 0 ? (filledFields / totalFields) * 100 : 100; // If no fields, assume 100% on that part? Or 0?
    // If no fields defined (unlikely for these types), usually it means config driven.
    if (totalFields === 0) fieldPercentage = 100;

    let childrenPercentage = 0;
    if (childrenCount > 0) {
        childrenPercentage = totalChildrenProgress / childrenCount;
    } else {
        childrenPercentage = 100; // If no children required, 100% on that part.
    }

    // Special case: If node expects children but has none?
    // E.g. Lesson should have questions? Maybe not strictly required.
    // Let's keep it simple: strict average of the two components existence.

    if (totalFields > 0 && childrenCount > 0) {
        return Math.round((fieldPercentage + childrenPercentage) / 2);
    } else if (totalFields > 0) {
        return Math.round(fieldPercentage);
    } else if (childrenCount > 0) {
        return Math.round(childrenPercentage);
    } else {
        return 0; // Or 100? If nothing to do, it's done?
    }
};


export const getNodeType = (node: TreeNode): string => {
    if ('sections' in node) return "course";
    if ('chapters' in node) return "section";
    if ('lessons' in node) return "chapter";
    if ('questions' in node) return "lesson";
    return "question";
};

export const getChildType = (type: string): string | null => {
    switch (type) {
        case "app_mobile":
            return "course";
        case "course":
            return "section";
        case "section":
            return "chapter";
        case "chapter":
            return "lesson";
        case "lesson":
            return "question";
        default:
            return null;
    }
};

export const getNodeKey = (node: TreeNode): string => {
    const type = getNodeType(node);
    if (type === "question") return `question-${node.id}`;
    const nodeKey = (node as Course | Section | Chapter | Lesson).key;
    // Thêm type vào key để tránh xung đột giữa các loại node khác nhau có cùng key
    if (nodeKey) return `${type}-${nodeKey}`;
    return `${type}-${node.id}`;
};

export const getNodeObjectType = (type: string): string => {
    switch (type) {
        case "app_mobile":
            return "app_mobile";
        case "course":
            return "spacedev_course";
        case "section":
            return "spacedev_section";
        case "chapter":
            return "spacedev_chapter";
        case "lesson":
            return "spacedev_lesson";
        case "question":
            return "spacedev_question";
        default:
            return "";
    }
};

export const getChildren = (node: TreeNode): TreeNode[] => {
    const type = getNodeType(node);
    switch (type) {
        case "course":
            return (node as Course).sections || [];
        case "section":
            return (node as Section).chapters || [];
        case "chapter":
            return (node as Chapter).lessons || [];
        case "lesson":
            return (node as Lesson).questions || [];
        default:
            return [];
    }
};

/** Lấy danh sách lessons trong section theo thứ tự (bỏ qua trạng thái trash) */
export const getSectionLessonsOrdered = (section: Section): Lesson[] => {
    const chapters = section.chapters || [];
    return chapters.flatMap((ch) => (ch.lessons || []).filter((l) => (l as { status?: string }).status !== "trash"));
};

/** Tìm chỉ số (0-based) của lesson trong tổng bài học của section */
export const getLessonIndexInSection = (lesson: Lesson, section: Section): number => {
    const lessons = getSectionLessonsOrdered(section);
    const key = getNodeKey(lesson);
    const idx = lessons.findIndex((l) => getNodeKey(l) === key);
    return idx;
};

export const findNodeByKey = (nodes: TreeNode[], key: string): TreeNode | null => {
    for (const node of nodes) {
        if (getNodeKey(node) === key) return node;
        const children = getChildren(node);
        if (children.length > 0) {
            const found = findNodeByKey(children, key);
            if (found) return found;
        }
    }
    return null;
};

export const getAllNodeKeys = (node: TreeNode): string[] => {
    let keys: string[] = [getNodeKey(node)];
    const children = getChildren(node);
    children.forEach((child) => {
        keys = keys.concat(getAllNodeKeys(child));
    });
    return keys;
};

export const getAllChildrenKeys = (node: TreeNode): string[] => {
    let keys: string[] = [];
    const children = getChildren(node);
    children.forEach((child) => {
        keys.push(getNodeKey(child));
        keys = keys.concat(getAllChildrenKeys(child));
    });
    return keys;
};

export const getChildrenIds = (node: TreeNode): (string | number)[] => {
    const children = getChildren(node);
    return children.map((child: TreeNode) => child.id).filter((id): id is (string | number) => id !== undefined && id !== null);
};

export const hasChildren = (node: TreeNode): boolean => {
    return getChildren(node).length > 0;
};

export const getChildrenCount = (node: TreeNode): number => {
    return getChildren(node).length;
};

export const getFolderIcon = (hasChildren: boolean, isOpen: boolean) => {
    if (!hasChildren) return <DescriptionIcon sx={{ fontSize: 18 }} />;
    return isOpen ? (
        <FolderOpenIcon sx={{ fontSize: 18 }} />
    ) : (
        <FolderIcon sx={{ fontSize: 18 }} />
    );
};

export const getNodeLabel = (node: TreeNode): string => {
    const type = getNodeType(node);
    switch (type) {
        case "course":
            return "Course";
        case "section":
            return "Section";
        case "chapter":
            return "Chapter";
        case "lesson":
            return "Lesson";
        case "question":
            return "Question";
        default:
            return "";
    }
};

export const getNodeColor = (node: TreeNode): string => {
    const type = getNodeType(node);
    switch (type) {
        case "course":
            return "#1976d2"; // Blue
        case "section":
            return "#388e3c"; // Green
        case "chapter":
            return "#f57c00"; // Orange
        case "lesson":
            return "#7b1fa2"; // Purple
        case "question":
            return "#d32f2f"; // Red
        default:
            return "#757575";
    }
};

export const getNodeBackgroundColor = (node: TreeNode, depth: number): string => {
    const color = getNodeColor(node);
    return `${color}08`; // 8% opacity of the node color
};

export const parseJsonTitle = (title: string, langCode: string): string => {
    if (!title) return "";
    try {
        const parsed = JSON.parse(title);
        return parsed[langCode] || parsed["en"] || title;
    } catch (e) {
        return title;
    }
};

/** Title dạng `{ [langCode]: string }` trong JSON; legacy plain string → isMulti: false */
export const parseMultiLangTitle = (
    raw: string | undefined | null
): { isMulti: boolean; map: Record<string, string> } => {
    const s = raw == null ? "" : String(raw);
    if (!s.trim()) return { isMulti: false, map: {} };
    try {
        const parsed = JSON.parse(s);
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
            const map: Record<string, string> = {};
            for (const [k, v] of Object.entries(parsed)) {
                if (v == null) continue;
                map[k] = typeof v === "string" ? v : String(v);
            }
            return { isMulti: true, map };
        }
    } catch {
        /* chuỗi tiêu đề cũ */
    }
    return { isMulti: false, map: {} };
};

/** Ngôn ngữ đầu tiên có text khác rỗng: ưu tiên currentLanguageCode, rồi en, rồi key đầu tiên */
export const pickDefaultTitleLang = (
    map: Record<string, string>,
    currentLanguageCode: string
): string | null => {
    const hasData = (code: string) => Boolean(map[code]?.trim());
    if (hasData(currentLanguageCode)) return currentLanguageCode;
    if (hasData("en")) return "en";
    const first = Object.keys(map).find((k) => hasData(k));
    return first ?? null;
};

export const getCourseLabelsViOrEn = (course: Course): CourseLabel[] => {
    const raw = (course as ANY).labels as string | CourseLabelsByLang | undefined;
    if (!raw) return [];

    let parsed: CourseLabelsByLang | null = null;

    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw) as CourseLabelsByLang;
        } catch (e) {
            return [];
        }
    } else if (typeof raw === "object") {
        parsed = raw as CourseLabelsByLang;
    }

    if (!parsed) return [];

    const vi = Array.isArray(parsed["vi"]) ? parsed["vi"] : [];
    const en = Array.isArray(parsed["en"]) ? parsed["en"] : [];

    if (vi.length > 0) return vi;
    if (en.length > 0) return en;

    return [];
};

export const arePropsEqual = (prev: ANY, next: ANY, keysToIgnore: string[] = []): boolean => {
    const prevKeys = Object.keys(prev).filter(k => !keysToIgnore.includes(k));
    const nextKeys = Object.keys(next).filter(k => !keysToIgnore.includes(k));

    if (prevKeys.length !== nextKeys.length) return false;

    for (const key of prevKeys) {
        if (prev[key] !== next[key]) {
            if (typeof prev[key] === 'object' && prev[key] !== null && next[key] !== null) {
                if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) return false;
            } else {
                return false;
            }
        }
    }
    return true;
};

/** count_section từ course (field phẳng hoặc summary_data) */
const getCourseSectionCountHint = (course: Course): number | undefined => {
    const anyC = course as ANY;
    if (typeof anyC.count_section === "number") return anyC.count_section;
    let summary = course.summary_data;
    if (typeof summary === "string") {
        try {
            summary = JSON.parse(summary) as { count_section?: number };
        } catch {
            summary = undefined;
        }
    }
    if (summary && typeof summary === "object" && "count_section" in summary) {
        const n = (summary as { count_section?: number }).count_section;
        return typeof n === "number" ? n : undefined;
    }
    return undefined;
};

/**
 * API get-course-list thường trả sections/chapters/... rỗng (không nhúng nested).
 * Nếu ghi đè bằng [] thì mất cây đã load → mất trạng thái expand và phải tải lại chi tiết.
 * Chỉ chấp nhận mảng rỗng khi server báo rõ số con = 0.
 */
const shouldKeepPrevChildrenWhenNextEmpty = (nextNode: TreeNode, childrenKey: string): boolean => {
    const nodeType = getNodeType(nextNode);

    if (childrenKey === "sections" && nodeType === "course") {
        const n = getCourseSectionCountHint(nextNode as Course);
        if (n === 0) return false;
        return true;
    }

    if (childrenKey === "chapters" && nodeType === "section") {
        const n = (nextNode as ANY).count_chapter;
        if (n === 0) return false;
        return true;
    }

    if (childrenKey === "lessons" && nodeType === "chapter") {
        const n = (nextNode as ANY).count_lesson;
        if (n === 0) return false;
        return true;
    }

    if (childrenKey === "questions" && nodeType === "lesson") {
        const n = (nextNode as ANY).count_question;
        if (n === 0) return false;
        return true;
    }

    return true;
};

export const mergeNodes = (prev: TreeNode[], next: TreeNode[]): TreeNode[] => {
    if (!prev || prev.length === 0) return next;
    if (!next) return next;

    // Map next nodes to potentially reused prev nodes
    const newResult = next.map(nextNode => {
        const nodeType = getNodeType(nextNode);
        const prevNode = prev.find(p => String(p.id) === String(nextNode.id) && getNodeType(p) === nodeType);

        if (!prevNode) {
            return nextNode;
        }

        // Identify children key
        let childrenKey = "";
        let prevChildren: TreeNode[] = [];
        let nextChildren: TreeNode[] = [];

        if ('sections' in nextNode) {
            childrenKey = 'sections';
            nextChildren = (nextNode as ANY).sections || [];
            prevChildren = (prevNode as ANY).sections || [];
        } else if ('chapters' in nextNode) {
            childrenKey = 'chapters';
            nextChildren = (nextNode as ANY).chapters || [];
            prevChildren = (prevNode as ANY).chapters || [];
        } else if ('lessons' in nextNode) {
            childrenKey = 'lessons';
            nextChildren = (nextNode as ANY).lessons || [];
            prevChildren = (prevNode as ANY).lessons || [];
        } else if ('questions' in nextNode) {
            childrenKey = 'questions';
            nextChildren = (nextNode as ANY).questions || [];
            prevChildren = (prevNode as ANY).questions || [];
        }

        // Mảng con rỗng từ API list/detail không được coi là “xóa hết” nếu summary/count hoặc prev còn dữ liệu
        let mergedChildren: TreeNode[] = [];
        if (childrenKey) {
            if (
                nextChildren.length === 0 &&
                prevChildren.length > 0 &&
                shouldKeepPrevChildrenWhenNextEmpty(nextNode, childrenKey)
            ) {
                mergedChildren = mergeNodes(prevChildren, prevChildren);
            } else {
                mergedChildren = mergeNodes(prevChildren, nextChildren);
            }
        }

        // Check if children changed reference
        const childrenChanged = childrenKey && mergedChildren !== prevChildren;

        // Check props equality (excluding children)
        const propsEqual = arePropsEqual(prevNode, nextNode, childrenKey ? [childrenKey] : []);

        if (propsEqual && !childrenChanged) {
            return prevNode;
        }

        // If props equal but children changed, reuse prevNode props + new children
        if (propsEqual) {
            return { ...prevNode, [childrenKey]: mergedChildren };
        }

        // If props changed, use nextNode props + merged children (to keep reused children refs)
        return { ...nextNode, [childrenKey]: mergedChildren };
    });

    // Luôn trả về mảng mới từ .map — không return `prev` dù nội dung giống nhau.
    // Nếu return `prev`, setState nhận cùng reference → React bỏ qua render, UI không cập nhật (phải đóng/mở node).
    return newResult;
};

export const calculateTotalLessonFlashcards = (course: Course): number => {
    let total = 0;
    if (course.sections) {
        course.sections.forEach(section => {
            if (section.chapters) {
                section.chapters.forEach(chapter => {
                    if (chapter.lessons) {
                        chapter.lessons.forEach(lesson => {
                            total += (lesson.count_app_course_flashcard || 0);
                        });
                    }
                });
            }
        });
    }
    return total;
};

export const flattenTree = (
    nodes: TreeNode[],
    expandedNodes: Set<string>,
    depth = 0,
    parentContext: TreeParentContext = {},
    parentId: string | number = "root",
    parentType = "app_mobile"
): FlatNode[] => {
    let flatList: FlatNode[] = [];

    nodes.forEach((node, index) => {
        const nodeType = getNodeType(node);
        const nodeKey = getNodeKey(node);

        const currentContext: TreeParentContext = { ...parentContext };
        if (nodeType === 'course') {
            currentContext.courseId = node.id;
            currentContext.courseKey = (node as Course).key;
        }
        if (nodeType === 'section') {
            currentContext.sectionId = node.id;
            currentContext.sectionNode = node as Section;
        }
        if (nodeType === 'chapter') currentContext.chapterId = node.id;

        flatList.push({
            node,
            depth,
            index,
            parentContext: currentContext,
            nodeKey,
            parentId,
            parentType
        });

        if (expandedNodes.has(nodeKey)) {
            const children = getChildren(node);
            if (children.length > 0) {
                flatList = flatList.concat(flattenTree(children, expandedNodes, depth + 1, currentContext, node.id, nodeType));
            }
        }
    });

    return flatList;
};

/**
 * Parse number_chat_ai: format "a/b" (ví dụ đã làm/tổng hoặc tương tự), "0" hoặc number (legacy).
 * Màu xanh (hoàn thành) chỉ khi hai số bằng nhau và > 0 — ví dụ 9/9, 2/2.
 * 0/2 không phải hoàn thành (hai số khác nhau) → màu tím.
 */
export const parseNumberChatAi = (
    val: number | string | undefined | null
): { hasChatAi: boolean; displayText: string; isAllComplete: boolean } => {
    if (val == null || val === "") return { hasChatAi: false, displayText: "", isAllComplete: false };
    if (typeof val === "number") {
        const hasChatAi = val > 0;
        return { hasChatAi, displayText: hasChatAi ? `${val} Chat AI` : "", isAllComplete: false };
    }
    const s = String(val).trim();
    if (s === "0") return { hasChatAi: false, displayText: "", isAllComplete: false };
    const match = s.match(/^(\d+)\/(\d+)$/);
    if (match) {
        const a = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        const hasChatAi = b > 0;
        const isAllComplete = hasChatAi && a === b && b > 0;
        return { hasChatAi, displayText: hasChatAi ? `${s} Chat AI` : "", isAllComplete };
    }
    return { hasChatAi: false, displayText: "", isAllComplete: false };
};
