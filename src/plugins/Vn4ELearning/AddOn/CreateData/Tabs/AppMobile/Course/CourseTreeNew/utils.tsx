import React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DescriptionIcon from "@mui/icons-material/Description";
import { TreeNode, Course, Section, Chapter, Lesson, Language } from "./types";

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

export const mergeNodes = (prev: TreeNode[], next: TreeNode[]): TreeNode[] => {
    if (!prev || prev.length === 0) return next;
    if (!next) return next;

    let hasChanges = false;

    // Map next nodes to potentially reused prev nodes
    const newResult = next.map(nextNode => {
        const nodeType = getNodeType(nextNode);
        const prevNode = prev.find(p => String(p.id) === String(nextNode.id) && getNodeType(p) === nodeType);

        if (!prevNode) {
            hasChanges = true;
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

        // Merge children
        const mergedChildren = childrenKey ? mergeNodes(prevChildren, nextChildren) : [];

        // Check if children changed reference
        const childrenChanged = childrenKey && mergedChildren !== prevChildren;

        // Check props equality (excluding children)
        const propsEqual = arePropsEqual(prevNode, nextNode, childrenKey ? [childrenKey] : []);

        if (propsEqual && !childrenChanged) {
            return prevNode;
        }

        hasChanges = true;
        // If props equal but children changed, reuse prevNode props + new children
        if (propsEqual) {
            return { ...prevNode, [childrenKey]: mergedChildren };
        }

        // If props changed, use nextNode props + merged children (to keep reused children refs)
        return { ...nextNode, [childrenKey]: mergedChildren };
    });

    if (!hasChanges && newResult.length === prev.length) {
        const allSame = newResult.every((n, i) => n === prev[i]);
        if (allSame) return prev;
    }

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
