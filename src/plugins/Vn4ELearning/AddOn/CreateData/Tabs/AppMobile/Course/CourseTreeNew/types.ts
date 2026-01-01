export interface Question {
    id: string | number;
    title: string; // JSON string in DB, but represented as string in some contexts or needs parsing
    order?: number;
    type?: string;
    xp_reward?: number;
    estimated_seconds?: number;
    is_complete?: boolean;
    status?: string;
}

export interface Lesson {
    id: string | number;
    title: string; // JSON
    key?: string;
    shortTitle?: string; // JSON
    is_final_test?: number | boolean;
    questions?: Question[];
    order?: number;
}

export interface Chapter {
    id: string | number;
    title: string; // JSON
    key?: string;
    subtitle?: string; // JSON
    lessons?: Lesson[];
    order?: number;
}

export interface Section {
    id: string | number;
    title: string; // JSON
    key?: string;
    description?: string; // JSON
    chapters?: Chapter[];
    order?: number;
}

export interface Course {
    id: string | number;
    title: string; // JSON
    key?: string;
    shortDescription?: string; // JSON
    description?: string; // JSON
    sections?: Section[];
}

export type TreeNode = Course | Section | Chapter | Lesson | Question;

export interface Language {
    id: string | number;
    title: string;
    code: string;
    is_default: number;
    flag_code: string;
}
