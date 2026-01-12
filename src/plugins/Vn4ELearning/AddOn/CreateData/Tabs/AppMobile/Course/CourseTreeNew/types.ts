export interface Question {
    id: string | number;
    title: string; // JSON string in DB, but represented as string in some contexts or needs parsing
    order?: number;
    type?: string;
    xp_reward?: number;
    estimated_seconds?: number;
    is_complete?: boolean;
    status?: string;
    body?: string; // JSON
    content?: string; // JSON
    verify?: boolean;
}

export interface Lesson {
    id: string | number;
    title: string; // JSON
    key?: string;
    shortTitle?: string; // JSON
    is_final_test?: number | boolean;
    questions?: Question[];
    order?: number;
    link_data_craw_json?: string;
    special?: {
        title?: string;
        description?: string;
        active?: boolean;
        lessonId: ID,
        [key: string]: unknown;
    };
}

export interface Chapter {
    id: string | number;
    title: string; // JSON
    key?: string;
    subtitle?: string; // JSON
    lessons?: Lesson[];
    order?: number;
    guidebook?: string; // JSON
    finalTestConfig?: {
        titleOverride?: string;
        shortDescription?: string;
        [key: string]: unknown;
    };
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
    link_data_craw_json?: string;
    summary_data?: string | {
        count_section?: number;
        count_chapter?: number;
        count_lesson?: number;
        count_lesson_no_question?: number;
        count_question?: number;
    };
}

export type TreeNode = Course | Section | Chapter | Lesson | Question;

export interface Language {
    id: string | number;
    title: string;
    code: string;
    is_default: number;
    flag_code: string;
}
