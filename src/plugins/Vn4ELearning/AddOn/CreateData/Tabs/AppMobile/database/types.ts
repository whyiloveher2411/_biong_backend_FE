export interface Collection {
    title: string;
    icon: string;
    status: 'in-app' | 'in-firebase' | 'in-both';
    fields: {
        title: string;
        type: string;
    }[] | null;
    description?: string;
    // Danh sách index theo response mới từ API collections/index
    indexes?: Array<{
        index_id: string;
        name: string; // tên đầy đủ của index trong project
        fields: Array<{
            fieldPath: string;
            order: 'ASCENDING' | 'DESCENDING';
        }>;
    }>;
    // Tổng số document theo API
    document_count?: number;
    // Cờ cho biết collection có index hay chưa (theo API `has_index`)
    has_index?: boolean;
    // Cờ collection có tồn tại trong firestore hay không (theo API `exists_in_firestore`)
    exists_in_firestore?: boolean;
}