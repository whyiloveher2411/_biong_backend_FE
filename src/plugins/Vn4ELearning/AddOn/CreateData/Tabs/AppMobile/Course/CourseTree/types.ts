export interface Question {
    id: string;
    title: string;
    key?: string;
}

export interface Lesson {
    id: string;
    title: string;
    key?: string;
    questions?: Question[];
}

export interface Chapter {
    id: string;
    title: string;
    key?: string;
    lessons?: Lesson[];
}

export interface Section {
    id: string;
    title: string;
    key?: string;
    chapters?: Chapter[];
}

export interface Translate {
    id: string;
    title: string;
    key?: string;
    language?: string;
    sac_language?: string; // ID của language
    sac_language_detail?: string; // JSON string chứa thông tin language
    meta?: {
        language?: string;
    };
    sections?: Section[];
}

export interface Course {
    id: string;
    title: string;
    translates?: Translate[];
}

export type TreeNode = Course | Translate | Section | Chapter | Lesson | Question;

// Map structure để lưu trữ nodes theo course, nodeType, key và language
export type CourseNodeMap = {
    [mapKey: string]: {
        [langCode: string]: TreeNode;
    };
};
