import React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { TreeNode, Course, Translate, Section, Chapter, Lesson } from "./types";

export function getNodeType(
    node: TreeNode
): "course" | "translate" | "section" | "chapter" | "lesson" | "question" {
    if ("translates" in node) return "course";
    if ("sections" in node) return "translate";
    if ("chapters" in node) return "section";
    if ("lessons" in node) return "chapter";
    if ("questions" in node) return "lesson";
    return "question";
}

// Hàm tạo key duy nhất cho node (nodeId-nodeType để tránh conflict khi các node khác loại có cùng ID)
export function getNodeKey(node: TreeNode): string {
    return `${node.id}-${getNodeType(node)}`;
}

export function getChildrenCount(node: TreeNode): number {
    const children = getChildren(node);
    return children.length;
}

export function getFolderIcon(hasChildren: boolean, isOpen: boolean): React.ReactNode {
    if (!hasChildren) {
        return <InsertDriveFileIcon sx={{ fontSize: 14 }} />;
    }
    return isOpen ? (
        <FolderOpenIcon sx={{ fontSize: 14 }} />
    ) : (
        <FolderIcon sx={{ fontSize: 14 }} />
    );
}

export function getNodeLabel(node: TreeNode): string {
    const type = getNodeType(node);
    const labels: Record<string, string> = {
        course: "Course",
        translate: "Translate",
        section: "Section",
        chapter: "Chapter",
        lesson: "Lesson",
        question: "Question",
    };
    return labels[type] || "";
}

export function getNodeObjectType(nodeType: string): string {
    const objectTypes: Record<string, string> = {
        course: "sac_course",
        translate: "sac_translate",
        section: "sac_section",
        chapter: "sac_chapter",
        lesson: "sac_lesson",
        question: "sac_question",
    };
    return objectTypes[nodeType] || "";
}

export function getChildType(parentType: string): string {
    const childTypes: Record<string, string> = {
        course: "translate",
        translate: "section",
        section: "chapter",
        chapter: "lesson",
        lesson: "question",
    };
    return childTypes[parentType] || "";
}

export function getNodeColor(node: TreeNode): string {
    const type = getNodeType(node);
    const colors: Record<string, string> = {
        course: "#1976d2", // Blue
        translate: "#388e3c", // Green
        section: "#f57c00", // Orange
        chapter: "#7b1fa2", // Purple
        lesson: "#0288d1", // Light Blue
        question: "#616161", // Grey
    };
    return colors[type] || "#616161";
}

export function getNodeBackgroundColor(node: TreeNode, depth: number): string {
    const type = getNodeType(node);
    const backgrounds: Record<string, string> = {
        course: "rgba(25, 118, 210, 0.05)",
        translate: "rgba(56, 142, 60, 0.05)",
        section: "rgba(245, 124, 0, 0.05)",
        chapter: "rgba(123, 31, 162, 0.05)",
        lesson: "rgba(2, 136, 209, 0.05)",
        question: "rgba(97, 97, 97, 0.03)",
    };
    return backgrounds[type] || "transparent";
}

export function hasChildren(node: TreeNode): boolean {
    const type = getNodeType(node);
    switch (type) {
        case "course": {
            const course = node as Course;
            return !!(course.translates && course.translates.length > 0);
        }
        case "translate": {
            const translate = node as Translate;
            return !!(translate.sections && translate.sections.length > 0);
        }
        case "section": {
            const section = node as Section;
            return !!(section.chapters && section.chapters.length > 0);
        }
        case "chapter": {
            const chapter = node as Chapter;
            return !!(chapter.lessons && chapter.lessons.length > 0);
        }
        case "lesson": {
            const lesson = node as Lesson;
            return !!(lesson.questions && lesson.questions.length > 0);
        }
        default:
            return false;
    }
}

export function getChildren(node: TreeNode): TreeNode[] {
    const type = getNodeType(node);
    switch (type) {
        case "course":
            return (node as Course).translates || [];
        case "translate":
            return (node as Translate).sections || [];
        case "section":
            return (node as Section).chapters || [];
        case "chapter":
            return (node as Chapter).lessons || [];
        case "lesson":
            return (node as Lesson).questions || [];
        default:
            return [];
    }
}
