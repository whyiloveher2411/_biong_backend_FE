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
    isPublished?: boolean;
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
    status?: string;
    special?: {
        title?: string;
        description?: string;
        active?: boolean;
        lessonId: ID,
        [key: string]: unknown;
    };
    count_app_course_flashcard?: number;
    isPublished?: boolean;
    is_completed?: boolean;
    count_question_not_verify?: number;
}

export interface Chapter {
    id: string | number;
    title: string; // JSON
    key?: string;
    subtitle?: string; // JSON
    lessons?: Lesson[];
    order?: number;
    status?: string;
    guidebook?: string; // JSON
    finalTestConfig?: {
        titleOverride?: string;
        shortDescription?: string;
        [key: string]: unknown;
    };
    isPublished?: boolean;
    count_question_not_verify?: number;
}

export interface Section {
    id: string | number;
    title: string; // JSON
    key?: string;
    description?: string; // JSON
    chapters?: Chapter[];
    status?: string;
    order?: number;
    isPublished?: boolean;
    count_question_not_verify?: number;
}

export interface CourseLabel {
    open?: boolean;
    confirmDelete?: boolean;
    delete?: number;
    title: string;
    color?: string;
    background_color?: string;
    [key: string]: unknown;
}

export type CourseLabelsByLang = {
    [langCode: string]: CourseLabel[];
};

export interface CourseLogo {
    link?: string;
    type_link?: string;
    ext?: string;
    width?: number;
    height?: number;
}

export interface Course {
    id: string | number;
    title: string; // JSON
    key?: string;
    logo?: string | CourseLogo; // JSON string hoặc object
    isComingSoon?: boolean;
    shortDescription?: string; // JSON
    description?: string; // JSON
    sections?: Section[];
    status?: string;
    link_data_craw_json?: string;
    summary_data?: string | {
        count_section?: number;
        count_chapter?: number;
        count_lesson?: number;
        count_lesson_no_question?: number;
        count_question?: number;
    };
    count_question_not_verify?: number;
    count_app_course_flashcard?: number;
    isPublished?: boolean;
    is_completed?: boolean;
    labels?: string | CourseLabelsByLang;
}

export type TreeNode = Course | Section | Chapter | Lesson | Question;

export interface Language {
    id: string | number;
    title: string;
    code: string;
    is_default: number;
    flag_code: string;
}

export type TreeParentContext = {
    courseId?: string | number;
    courseKey?: string;
    sectionId?: string | number;
    chapterId?: string | number;
    sectionNode?: Section;
};

export interface FlatNode {
    node: TreeNode;
    depth: number;
    index: number;
    parentContext: TreeParentContext;
    nodeKey: string;
    parentId: string | number;
    parentType: string;
}
