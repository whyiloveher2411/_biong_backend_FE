import { Course } from "./types";

export const findCourseIdByPostId = (postId: string | number, courses: Course[]): string | null => {
    for (const course of courses) {
        if (String(course.id) === String(postId)) return String(course.id);
        if (course.sections) {
            for (const section of course.sections) {
                if (String(section.id) === String(postId)) return String(course.id);
                if (section.chapters) {
                    for (const chapter of section.chapters) {
                        if (String(chapter.id) === String(postId)) return String(course.id);
                        if (chapter.lessons) {
                            for (const lesson of chapter.lessons) {
                                if (String(lesson.id) === String(postId)) return String(course.id);
                                if (lesson.questions) {
                                    for (const question of lesson.questions) {
                                        if (String(question.id) === String(postId)) return String(course.id);
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
