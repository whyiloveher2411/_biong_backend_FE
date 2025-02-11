export interface ID {
    $oid: string;
}
export interface ISchema {
    table: string;
    show_field: string;
    fields: { [key: string]: IField };
}

export interface IField {
    type: string;
    reference?: string;
    field?: string;
    objectStructure?: { [key: string]: IField };
}

const schema: { [key: string]: ISchema } = {};

export interface IUser {
    _id: ID;
    full_name: string;
    email: string;
}

schema.user = {
    table: 'users', 
    show_field: 'fullName',
    fields: {
        fullName: {
            type: 'string',
        },
        email: {
            type: 'string',
        },
        settings: {
            type: 'object',
            objectStructure: {
                language: {
                    type: 'string',
                },
                show_name: {
                    type: 'string',
                }
            }
        }
    }
}

export interface ICourse {
    _id: ID;
    name: string;
    description: string;
}

schema.course = {
    table: 'courses',
    show_field: 'name', 
    fields: {
        name: {
            type: 'string',
        },
        description: {
            type: 'string',
        },
        topics: {
            type: 'has_many',
            reference: 'topic',
            field: 'courseId',
        }
    }
}

export interface ITopic {
    _id: ID;
    name: string;
    courseId: ID | null;
}

schema.topic = {
    table: 'topics',
    show_field: 'name',
    fields: {
        name: {
            type: 'string',
        },
        course: {
            type: 'reference',
            reference: 'course',
            field: 'courseId',
        },
        words: {
            type: 'has_many',
            reference: 'word',
            field: 'topicId',
        }
    }
}

export interface IWord {
    _id: ID;
    text: string;
    topicId: ID;
}

schema.word = {
    table: 'words',
    show_field: 'text',
    fields: {
        text: {
            type: 'string',
        },
        topic: {
            type: 'reference',
            reference: 'topic',
            field: 'topicId',
        }
    }
}

export interface IPaginationData<T> {
    data: Array<T>;
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
}

export default schema;
