import React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DescriptionIcon from "@mui/icons-material/Description";
import { TreeNode, Course, Section, Chapter, Lesson } from "./types";

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
    return (node as Course | Section | Chapter | Lesson).key || `${type}-${node.id}`;
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

export const getChildrenIds = (node: TreeNode): (string|number)[] => {
    const children = getChildren(node);
    return children.map((child: TreeNode) => child.id).filter((id): id is (string|number) => id !== undefined && id !== null);
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
