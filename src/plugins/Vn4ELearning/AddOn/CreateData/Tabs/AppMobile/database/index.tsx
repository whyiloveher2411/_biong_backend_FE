import React from "react";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import Box from "components/atoms/Box";
import DrawerCustom from "components/molecules/DrawerCustom";
import FieldForm from "components/atoms/fields/FieldForm";
import LoadingButton from "components/atoms/LoadingButton";
import Breadcrumbs from "components/atoms/Breadcrumbs";
import Typography from "components/atoms/Typography";
import useAjax from "hook/useApi";
import CollectionsColumn from "./CollectionsColumn";
import DocumentsColumn from "./DocumentsColumn";
import DocumentDetailsColumn from "./DocumentDetailsColumn";
import EditDocumentDrawer from "./EditDocumentDrawer";
import { Collection } from "./types";

const collectionInitialState: Collection = {
    title: "",
    icon: "",
    fields: [],
    status: "in-app",
};

type ColumnConfig = {
    component: React.ComponentType<Record<string, unknown>>;
    props: Record<string, unknown>;
};

function Database({ data }: { data: CreatePostTypeData }) {
    const [collections, setCollections] = React.useState<Collection[]>([]);
    const [documents, setDocuments] = React.useState<
        Array<{ id: string;[key: string]: unknown }>
    >([]);
    const [collectionAction, setCollectionAction] = React.useState<{
        action: "add" | "edit" | "delete";
        oldCollectionName: string;
        collection: Collection;
    }>({
        action: "add",
        oldCollectionName: "",
        collection: collectionInitialState,
    });
    const [searchText, setSearchText] = React.useState("");


    const [selectedCollection, setSelectedCollection] = React.useState<
        string | null
    >(null);
    const [selectedDocument, setSelectedDocument] = React.useState<
        string | null
    >(null);
    const [documentData, setDocumentData] = React.useState<
        Record<string, unknown>
    >({});
    const [openAddCollection, setOpenAddCollection] = React.useState(false);
    const [openEditDocument, setOpenEditDocument] = React.useState(false);
    const [editDocumentMode, setEditDocumentMode] = React.useState<
        "add" | "edit"
    >("add");
    const [openSubCollectionEditDocument, setOpenSubCollectionEditDocument] = React.useState<
        Record<string, boolean>
    >({});
    const [subCollectionEditDocumentMode, setSubCollectionEditDocumentMode] = React.useState<
        Record<string, "add" | "edit">
    >({});
    const [subCollections, setSubCollections] = React.useState<Collection[]>([]);
    const [subCollectionColumns, setSubCollectionColumns] = React.useState<
        Array<{
            id: string;
            parentPath: string;
            collectionName: string;
            collectionData?: Collection; // Lưu collection data để dùng trong DocumentDetailsColumn
            documents: Array<{ id: string;[key: string]: unknown }>;
            selectedDocument: string | null;
            documentData?: Record<string, unknown>;
            subCollections?: Collection[];
            searchText?: string;
        }>
    >([]);

    const ajax = useAjax();
    const ajaxLoadData = useAjax();
    const ajaxDocuments = useAjax();
    const ajaxSubCollections = useAjax();
    const ajaxDuplicate = useAjax();
    const ajaxDelete = useAjax();
    const ajaxClearProgress = useAjax();
    const ajaxClearCourseCache = useAjax();

    // Map để lưu loading state cho mỗi sub-collection column (documents loading)
    const [subCollectionLoading, setSubCollectionLoading] = React.useState<
        Record<string, boolean>
    >({});

    // Map để lưu loading state cho sub-collections của mỗi column (riêng biệt)
    const [subCollectionSubCollectionsLoading, setSubCollectionSubCollectionsLoading] = React.useState<
        Record<string, boolean>
    >({});

    // Ajax instance riêng cho sub-collections của sub-collection columns
    const ajaxSubCollectionSubCollections = useAjax();

    // Ref để scroll đến column cuối
    const columnsContainerRef = React.useRef<HTMLDivElement>(null);

    // State để quản lý width của các columns
    const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({
        collections: 280,
        documents: 350,
        documentDetails: 600,
    });

    // State để quản lý width của các sub-collection columns
    const [subCollectionColumnWidths, setSubCollectionColumnWidths] = React.useState<
        Record<string, number>
    >({});

    // State để track column đang resize
    const [resizingColumn, setResizingColumn] = React.useState<string | null>(null);
    const [resizeStartX, setResizeStartX] = React.useState<number>(0);
    const [resizeStartWidth, setResizeStartWidth] = React.useState<number>(0);

    const getCollections = () => {
        ajaxLoadData.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/collections/index",
            data: { id: data.post.id, parent_path: "" },
            success: (result) => {
                setCollections(result.collections);
            },
        });
    };

    React.useEffect(() => {
        getCollections();
    }, []);

    // Handle resize logic
    const handleResizeStart = (columnKey: string, startX: number, isSubCollection = false) => {
        setResizingColumn(columnKey);
        setResizeStartX(startX);
        if (isSubCollection) {
            // Xác định default width dựa trên loại column (documents hoặc details)
            const defaultWidth = columnKey.includes('-details') ? 600 : 350;
            setResizeStartWidth(subCollectionColumnWidths[columnKey] || defaultWidth);
        } else {
            setResizeStartWidth(columnWidths[columnKey] || 280);
        }
    };

    const handleResizeMove = React.useCallback((e: MouseEvent) => {
        if (!resizingColumn) return;

        const diff = e.clientX - resizeStartX;
        const newWidth = Math.max(200, resizeStartWidth + diff); // Min width 200px

        // Kiểm tra xem có phải sub-collection column không (có chứa "/" trong key)
        if (resizingColumn.includes('/')) {
            setSubCollectionColumnWidths((prev) => ({
                ...prev,
                [resizingColumn]: newWidth,
            }));
        } else {
            setColumnWidths((prev) => ({
                ...prev,
                [resizingColumn]: newWidth,
            }));
        }
    }, [resizingColumn, resizeStartX, resizeStartWidth]);

    const handleResizeEnd = React.useCallback(() => {
        setResizingColumn(null);
    }, []);

    React.useEffect(() => {
        if (resizingColumn) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleResizeMove);
                document.removeEventListener('mouseup', handleResizeEnd);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [resizingColumn, handleResizeMove, handleResizeEnd]);

    // Auto scroll đến column cuối khi documents được load hoặc document detail được hiển thị
    React.useEffect(() => {
        if (columnsContainerRef.current) {
            // Sử dụng requestAnimationFrame để đảm bảo DOM đã render xong
            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (columnsContainerRef.current) {
                        columnsContainerRef.current.scrollTo({
                            left: columnsContainerRef.current.scrollWidth,
                            behavior: "smooth",
                        });
                    }
                }, 50);
            });
        }
    }, [documents, selectedDocument, subCollectionColumns]);

    const handleCollectionClick = (collectionId: string) => {
        // Nếu collection đang active, không làm gì cả
        if (selectedCollection === collectionId) {
            return;
        }
        setSelectedCollection(collectionId);
        setSelectedDocument(null);
        setSelectedCollection(collectionId);
        setSelectedDocument(null);
        setSearchText("");
        handleGetDocumentsByCollectionName(collectionId, "");
    };

    const handleDocumentClick = (documentId: string) => {
        // Nếu document đang active, không làm gì cả
        if (selectedDocument === documentId) {
            return;
        }
        setSelectedDocument(documentId);
        // Reset sub-collection columns khi chọn document mới
        setSubCollectionColumns([]);
        // Tìm document data từ documents array đã có sẵn
        const document = documents.find((doc) => doc.id === documentId);
        if (document) {
            // Loại bỏ id field để chỉ lấy data fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...fields } = document;
            setDocumentData(fields);
            handleGetSubCollections(selectedCollection || "", documentId);
        }
    };

    const handleAddCollection = () => {
        setOpenAddCollection(true);
        setCollectionAction({
            action: "add",
            oldCollectionName: "",
            collection: collectionInitialState,
        });
    };

    const handleEditCollection = (collection: Collection) => {
        setOpenAddCollection(true);
        setCollectionAction({
            action: "edit",
            oldCollectionName: collection.title,
            collection,
        });
    };

    const handleDeleteCollection = (collection: Collection) => {
        ajax.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/collections/delete",
            method: "POST",
            data: {
                id: data.post.id,
                delete_collection_name: collection.title,
            },
            success: (result) => {
                if (result.success) {
                    getCollections();
                    setOpenAddCollection(false);
                }
            },
        });
    };

    const handleGetDocumentsByCollectionName = (collectionName: string, paramSearchText?: string) => {
        const search = paramSearchText !== undefined ? paramSearchText : searchText;
        ajaxDocuments.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/index",
            data: { id: data.post.id, collection_name: collectionName, search_text: search },
            success: (result) => {
                if (result.success) {
                    setDocuments(result.documents || []);
                }
            },
        });
    };

    const handleGetSubCollections = (
        parentCollectionName: string,
        document_id: string
    ) => {
        ajaxSubCollections.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/collections/index",
            data: { id: data.post.id, parent_path: parentCollectionName + '/' + document_id },
            success: (result) => {
                if (result.success) {
                    setSubCollections(result.collections || []);
                }
            },
        });
    };

    const handleSubCollectionClick = (
        subCollection: Collection,
        parentPath: string
    ) => {
        const columnId = `${parentPath}/${subCollection.title}`;

        // Kiểm tra xem column đã tồn tại và đang active chưa
        const existingColumn = subCollectionColumns.find(
            (col) => col.id === columnId
        );

        // Nếu column đã tồn tại và đang active (có documents), không làm gì cả
        if (existingColumn && existingColumn.documents.length > 0) {
            return;
        }

        // Xóa tất cả các column cùng level (cùng parentPath) và các column con
        // Xóa các columns có parentPath === parentPath (cùng level)
        // Xóa các columns có parentPath bắt đầu bằng parentPath + "/" (các column con)
        setSubCollectionColumns((prev) => {
            return prev.filter((col) => {
                // Giữ lại các column không cùng level và không phải là column con
                // Column cùng level: có parentPath === parentPath
                // Column con: có parentPath bắt đầu bằng parentPath + "/"
                return col.parentPath !== parentPath && !col.parentPath.startsWith(parentPath + "/");
            });
        });

        // Xóa loading states của các column đã bị xóa
        // Xóa loading states của các columns cùng level (có key bắt đầu bằng parentPath + "/")
        // và các columns con (có key bắt đầu bằng parentPath + "/" + ...)
        setSubCollectionLoading((prev) => {
            const newState: Record<string, boolean> = {};
            Object.keys(prev).forEach((key) => {
                // key là columnId có format: parentPath/collectionName
                // Giữ lại loading state nếu key không bắt đầu bằng parentPath + "/"
                if (!key.startsWith(parentPath + "/")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });

        setSubCollectionSubCollectionsLoading((prev) => {
            const newState: Record<string, boolean> = {};
            Object.keys(prev).forEach((key) => {
                // key là columnId, giữ lại nếu không bắt đầu bằng parentPath + "/"
                if (!key.startsWith(parentPath + "/")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });

        // Xóa width states của các columns cùng level và columns con
        setSubCollectionColumnWidths((prev) => {
            const newState: Record<string, number> = {};
            Object.keys(prev).forEach((key) => {
                // key có format: columnId-documents hoặc columnId-details
                // Xóa nếu columnId bắt đầu bằng parentPath + "/"
                // Tìm columnId từ key (loại bỏ "-documents" hoặc "-details")
                const columnIdFromKey = key.replace(/-documents$|-details$/, '');
                if (!columnIdFromKey.startsWith(parentPath + "/")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });

        // Luôn thêm column mới (hoặc thêm lại nếu đã bị xóa ở trên)
        const newColumn = {
            id: columnId,
            parentPath: parentPath,
            collectionName: subCollection.title,
            collectionData: subCollection, // Lưu collection data để dùng sau
            documents: [],
            selectedDocument: null,
            searchText: "",
        };

        setSubCollectionColumns((prev) => [...prev, newColumn]);
        setSubCollectionLoading((prev) => ({ ...prev, [columnId]: true }));

        // Gọi API để lấy documents
        // Gộp parent_path và collection_name thành collection_name
        const fullCollectionName = parentPath
            ? `${parentPath}/${subCollection.title}`
            : subCollection.title;
        ajax.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/index",
            data: {
                id: data.post.id,
                collection_name: fullCollectionName,
                search_text: "",
            },
            success: (result) => {
                if (result.success) {
                    setSubCollectionColumns((prev) =>
                        prev.map((col) =>
                            col.id === columnId
                                ? { ...col, documents: result.documents || [] }
                                : col
                        )
                    );
                }
                setSubCollectionLoading((prev) => ({ ...prev, [columnId]: false }));
            },
            error: () => {
                setSubCollectionLoading((prev) => ({ ...prev, [columnId]: false }));
            },
        });
    };

    const handleSubCollectionDocumentClick = (
        columnId: string,
        documentId: string
    ) => {
        const column = subCollectionColumns.find((col) => col.id === columnId);
        if (!column) return;

        // Nếu document đang active, không làm gì cả
        if (column.selectedDocument === documentId) {
            return;
        }

        // Tìm document data từ documents array
        const document = column.documents.find((doc) => doc.id === documentId);
        if (document) {
            // Loại bỏ id field để chỉ lấy data fields
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id, ...fields } = document;

            // Cập nhật selectedDocument và documentData
            setSubCollectionColumns((prev) =>
                prev.map((col) =>
                    col.id === columnId
                        ? { ...col, selectedDocument: documentId, documentData: fields }
                        : col
                )
            );

            // Load sub-collections cho document này
            const fullCollectionName = column.parentPath
                ? `${column.parentPath}/${column.collectionName}`
                : column.collectionName;
            const parentPath = `${fullCollectionName}/${documentId}`;

            setSubCollectionSubCollectionsLoading((prev) => ({ ...prev, [columnId]: true }));
            // Sử dụng ajax instance riêng để tránh conflict với column 3
            ajaxSubCollectionSubCollections.ajax({
                url: "plugin/vn4-e-learning/app-mobile/database/collections/index",
                data: { id: data.post.id, parent_path: parentPath },
                success: (result) => {
                    if (result.success) {
                        setSubCollectionColumns((prev) =>
                            prev.map((col) =>
                                col.id === columnId
                                    ? { ...col, subCollections: result.collections || [] }
                                    : col
                            )
                        );
                    }
                    setSubCollectionSubCollectionsLoading((prev) => ({ ...prev, [columnId]: false }));
                },
                error: () => {
                    setSubCollectionSubCollectionsLoading((prev) => ({ ...prev, [columnId]: false }));
                },
            });
        } else {
            // Nếu không tìm thấy document, chỉ cập nhật selectedDocument
            setSubCollectionColumns((prev) =>
                prev.map((col) =>
                    col.id === columnId
                        ? { ...col, selectedDocument: documentId }
                        : col
                )
            );
        }
    };

    const handleRemoveSubCollectionColumn = (columnId: string) => {
        const column = subCollectionColumns.find((col) => col.id === columnId);
        if (!column) return;

        // Xóa column và tất cả các column con
        setSubCollectionColumns((prev) => {
            return prev.filter((col) => {
                // Xóa column hiện tại và tất cả column con
                return col.id !== columnId && !col.parentPath.startsWith(columnId + "/");
            });
        });

        // Xóa loading states và edit document states
        setSubCollectionLoading((prev) => {
            const newState: Record<string, boolean> = {};
            Object.keys(prev).forEach((key) => {
                if (key !== columnId && !key.startsWith(columnId + "/")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });

        setSubCollectionSubCollectionsLoading((prev) => {
            const newState: Record<string, boolean> = {};
            Object.keys(prev).forEach((key) => {
                if (key !== columnId && !key.startsWith(columnId + "/")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });

        setOpenSubCollectionEditDocument((prev) => {
            const newState: Record<string, boolean> = {};
            Object.keys(prev).forEach((key) => {
                if (key !== columnId && !key.startsWith(columnId + "/")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });

        setSubCollectionEditDocumentMode((prev) => {
            const newState: Record<string, "add" | "edit"> = {};
            Object.keys(prev).forEach((key) => {
                if (key !== columnId && !key.startsWith(columnId + "/")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });

        // Xóa width states của các column đã bị xóa
        setSubCollectionColumnWidths((prev) => {
            const newState: Record<string, number> = {};
            Object.keys(prev).forEach((key) => {
                // key có format: columnId-documents hoặc columnId-details
                // Xóa nếu key bắt đầu bằng columnId + "-"
                if (!key.startsWith(columnId + "-")) {
                    newState[key] = prev[key];
                }
            });
            return newState;
        });
    };

    const handleSubCollectionAddDocument = (columnId: string) => {
        setSubCollectionEditDocumentMode((prev) => ({ ...prev, [columnId]: "add" }));
        setOpenSubCollectionEditDocument((prev) => ({ ...prev, [columnId]: true }));
    };

    const handleSubCollectionEditDocument = (columnId: string) => {
        setSubCollectionEditDocumentMode((prev) => ({ ...prev, [columnId]: "edit" }));
        setOpenSubCollectionEditDocument((prev) => ({ ...prev, [columnId]: true }));
    };

    const handleSubCollectionCloseEditDocument = (columnId: string) => {
        setOpenSubCollectionEditDocument((prev) => ({ ...prev, [columnId]: false }));
    };

    const handleSubCollectionDocumentSaved = (columnId: string) => {
        const column = subCollectionColumns.find((col) => col.id === columnId);
        if (!column) return;

        const fullCollectionName = column.parentPath
            ? `${column.parentPath}/${column.collectionName}`
            : column.collectionName;

        ajax.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/index",
            data: {
                id: data.post.id,
                collection_name: fullCollectionName,
            },
            success: (result) => {
                if (result.success) {
                    setSubCollectionColumns((prev) =>
                        prev.map((col) =>
                            col.id === columnId
                                ? { ...col, documents: result.documents || [] }
                                : col
                        )
                    );
                }
            },
        });
    };

    const handleSubCollectionDuplicateDocument = (
        columnId: string,
        documentId: string
    ) => {
        const column = subCollectionColumns.find((col) => col.id === columnId);
        if (!column) return;

        const fullCollectionName = column.parentPath
            ? `${column.parentPath}/${column.collectionName}`
            : column.collectionName;

        ajaxDuplicate.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/duplicate",
            method: "POST",
            data: {
                id: data.post.id,
                collection_name: fullCollectionName,
                document_id: documentId,
            },
            success: (result) => {
                if (result?.success) {
                    const newId = result.new_document_id;
                    handleSubCollectionDocumentSaved(columnId);
                    if (newId) {
                        setSubCollectionColumns((prev) =>
                            prev.map((col) =>
                                col.id === columnId
                                    ? { ...col, selectedDocument: newId }
                                    : col
                            )
                        );
                    }
                }
            },
        });
    };

    const handleSaveCollection = () => {
        ajax.ajax({
            url:
                collectionAction.action === "add"
                    ? "plugin/vn4-e-learning/app-mobile/database/collections/create"
                    : "plugin/vn4-e-learning/app-mobile/database/collections/update",
            method: "POST",
            data: {
                id: data.post.id,
                collection: collectionAction.collection,
                action: collectionAction.action,
                old_collection_name: collectionAction.oldCollectionName,
            },
            success: (result) => {
                if (result.success) {
                    getCollections();
                    setOpenAddCollection(false);
                }
            },
        });
    };

    const handleDuplicateDocument = (documentId: string) => {
        if (!selectedCollection) return;
        ajaxDuplicate.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/duplicate",
            method: "POST",
            data: {
                id: data.post.id,
                collection_name: selectedCollection,
                document_id: documentId,
            },
            success: (result) => {
                if (result?.success) {
                    const newId = result.new_document_id;
                    handleGetDocumentsByCollectionName(selectedCollection);
                    if (newId) setSelectedDocument(newId);
                }
            },
        });
    };

    const handleAddDocument = () => {
        setEditDocumentMode("add");
        setSelectedDocument(null);
        setOpenEditDocument(true);
    };

    const handleEditDocument = () => {
        setEditDocumentMode("edit");
        setOpenEditDocument(true);
    };

    const handleCloseEditDocument = () => {
        setOpenEditDocument(false);
    };

    const handleDocumentSaved = () => {
        if (selectedCollection) {
            handleGetDocumentsByCollectionName(selectedCollection);
        }
    };

    const handleClearProgress = (documentId: string) => {
        if (!selectedCollection || selectedCollection !== "users") return;
        ajaxClearProgress.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/users/clear-progress",
            method: "POST",
            data: {
                id: data.post.id,
                document_id: documentId,
            },
            success: (result) => {
                if (result?.success) {
                    handleGetDocumentsByCollectionName(selectedCollection);
                }
            },
        });
    };

    const handleClearCourseCache = (documentId: string) => {
        if (!selectedCollection || selectedCollection !== "users") return;
        ajaxClearCourseCache.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/users/clear-course-cache",
            method: "POST",
            data: {
                id: data.post.id,
                document_id: documentId,
            },
            success: (result) => {
                if (result?.success) {
                    handleGetDocumentsByCollectionName(selectedCollection);
                }
            },
        });
    };

    const handleSubCollectionSearch = (columnId: string, text: string) => {
        setSubCollectionColumns((prev) =>
            prev.map((col) =>
                col.id === columnId ? { ...col, searchText: text } : col
            )
        );

        const column = subCollectionColumns.find((col) => col.id === columnId);
        if (!column) return;

        const fullCollectionName = column.parentPath
            ? `${column.parentPath}/${column.collectionName}`
            : column.collectionName;

        setSubCollectionLoading((prev) => ({ ...prev, [columnId]: true }));

        ajaxDocuments.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/index",
            data: {
                id: data.post.id,
                collection_name: fullCollectionName,
                search_text: text,
            },
            success: (result) => {
                if (result.success) {
                    setSubCollectionColumns((prev) =>
                        prev.map((col) =>
                            col.id === columnId
                                ? { ...col, documents: result.documents || [] }
                                : col
                        )
                    );
                }
                setSubCollectionLoading((prev) => ({ ...prev, [columnId]: false }));
            },
            error: () => {
                setSubCollectionLoading((prev) => ({ ...prev, [columnId]: false }));
            },
        });
    };

    const handleGetIndexes = () => {
        ajax.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/firebase/index-list",
            method: "POST",
            data: { id: data.post.id },
            success: (result) => {
                console.log(result);
            },
        });
    };

    const columns = React.useMemo<ColumnConfig[]>(
        () => [
            {
                component: CollectionsColumn as unknown as React.ComponentType<Record<string, unknown>>,
                props: {
                    collections,
                    selectedCollection,
                    ajaxLoadData,
                    onCollectionClick: handleCollectionClick,
                    onAddCollection: handleAddCollection,
                    onEditCollection: handleEditCollection,
                    onDeleteCollection: handleDeleteCollection,
                    width: columnWidths.collections,
                    onResizeStart: (e: React.MouseEvent) => handleResizeStart('collections', e.clientX),
                    isResizing: resizingColumn === 'collections',
                },
            },
            {
                component: DocumentsColumn as unknown as React.ComponentType<Record<string, unknown>>,
                props: {
                    selectedCollection,
                    selectedDocument,
                    onDocumentClick: handleDocumentClick,
                    onAddDocument: handleAddDocument,
                    ajaxDocuments,
                    documents,
                    onSearch: (text: string) => {
                        setSearchText(text);
                        if (selectedCollection) handleGetDocumentsByCollectionName(selectedCollection, text);
                    },
                    onDuplicateDocument: handleDuplicateDocument,
                    canAddDocument: (() => {
                        const c = collections.find(
                            (i) => i.title === selectedCollection
                        );
                        return !!(
                            c &&
                            Array.isArray(c.fields) &&
                            c.fields.length > 0
                        );
                    })(),
                    onDeleteDocument: (documentId: string) => {
                        if (!selectedCollection) return;
                        ajaxDelete.ajax({
                            url: "plugin/vn4-e-learning/app-mobile/database/documents/delete",
                            method: "POST",
                            data: {
                                id: data.post.id,
                                collection_name: selectedCollection,
                                document_id: documentId,
                            },
                            success: (result) => {
                                if (result?.success) {
                                    handleGetDocumentsByCollectionName(
                                        selectedCollection
                                    );
                                    if (selectedDocument === documentId)
                                        setSelectedDocument(null);
                                }
                            },
                        });
                    },
                    onClearProgress: selectedCollection === "users" ? handleClearProgress : undefined,
                    onClearCourseCache: selectedCollection === "users" ? handleClearCourseCache : undefined,
                    width: columnWidths.documents,
                    onResizeStart: (e: React.MouseEvent) => handleResizeStart('documents', e.clientX),
                    isResizing: resizingColumn === 'documents',
                },
            },
            {
                component: DocumentDetailsColumn as unknown as React.ComponentType<Record<string, unknown>>,
                props: {
                    selectedDocument,
                    collections,
                    selectedCollection,
                    data,
                    documentData,
                    onEditDocument: handleEditDocument,
                    subCollections,
                    ajaxSubCollections,
                    activeSubCollections: (() => {
                        if (!selectedCollection || !selectedDocument) return [];
                        const parentPath = `${selectedCollection}/${selectedDocument}`;
                        // Tìm các sub-collection đang active (có column tương ứng trong subCollectionColumns)
                        return subCollectionColumns
                            .filter((col) => col.parentPath === parentPath)
                            .map((col) => col.collectionName);
                    })(),
                    onSubCollectionClick: (subCollection: Collection) => {
                        if (!selectedCollection || !selectedDocument) return;
                        const parentPath = `${selectedCollection}/${selectedDocument}`;
                        // Thêm sub-collection column mới (giữ nguyên column hiện tại)
                        handleSubCollectionClick(subCollection, parentPath);
                    },
                    width: columnWidths.documentDetails,
                    onResizeStart: (e: React.MouseEvent) => handleResizeStart('documentDetails', e.clientX),
                    isResizing: resizingColumn === 'documentDetails',
                },
            },
            // Thêm các sub-collection columns động
            ...subCollectionColumns.flatMap((subCol) => {
                const fullCollectionName = subCol.parentPath
                    ? `${subCol.parentPath}/${subCol.collectionName}`
                    : subCol.collectionName;

                const documentsColumnKey = `${subCol.id}-documents`;
                const detailsColumnKey = `${subCol.id}-details`;

                const columns: ColumnConfig[] = [
                    {
                        component: DocumentsColumn as unknown as React.ComponentType<Record<string, unknown>>,
                        props: {
                            selectedCollection: subCol.collectionName,
                            selectedDocument: subCol.selectedDocument,
                            onDocumentClick: (documentId: string) =>
                                handleSubCollectionDocumentClick(subCol.id, documentId),
                            onAddDocument: () => handleSubCollectionAddDocument(subCol.id),
                            ajaxDocuments: {
                                open: subCollectionLoading[subCol.id] || false,
                            },
                            documents: subCol.documents,
                            onSearch: (text: string) => handleSubCollectionSearch(subCol.id, text),
                            onDuplicateDocument: (documentId: string) =>
                                handleSubCollectionDuplicateDocument(subCol.id, documentId),
                            canAddDocument: (() => {
                                const c = collections.find(
                                    (i) => i.title === subCol.collectionName
                                );
                                return !!(
                                    c &&
                                    Array.isArray(c.fields) &&
                                    c.fields.length > 0
                                );
                            })(),
                            onDeleteDocument: (documentId: string) => {
                                ajaxDelete.ajax({
                                    url: "plugin/vn4-e-learning/app-mobile/database/documents/delete",
                                    method: "POST",
                                    data: {
                                        id: data.post.id,
                                        collection_name: fullCollectionName,
                                        document_id: documentId,
                                    },
                                    success: (result) => {
                                        if (result?.success) {
                                            handleSubCollectionDocumentSaved(subCol.id);
                                            setSubCollectionColumns((prev) =>
                                                prev.map((col) =>
                                                    col.id === subCol.id
                                                        ? {
                                                            ...col,
                                                            selectedDocument:
                                                                col.selectedDocument ===
                                                                    documentId
                                                                    ? null
                                                                    : col.selectedDocument,
                                                        }
                                                        : col
                                                )
                                            );
                                        }
                                    },
                                });
                            },
                            onCloseColumn: () => handleRemoveSubCollectionColumn(subCol.id),
                            width: subCollectionColumnWidths[documentsColumnKey] || 350,
                            onResizeStart: (e: React.MouseEvent) => handleResizeStart(documentsColumnKey, e.clientX, true),
                            isResizing: resizingColumn === documentsColumnKey,
                        },
                    },
                ];

                // Thêm DocumentDetailsColumn nếu có selectedDocument
                // Sử dụng documentData nếu có, nếu không thì dùng empty object (sẽ được load sau)
                if (subCol.selectedDocument) {
                    // Tìm collection từ collectionData đã lưu, hoặc từ collections array, hoặc từ subCollections
                    const collectionForDetails = subCol.collectionData
                        || collections.find((c) => c.title === subCol.collectionName)
                        || subCol.subCollections?.find((c) => c.title === subCol.collectionName);

                    // Tạo collections array bao gồm cả collection chính và sub-collections
                    const collectionsForDetails = collectionForDetails
                        ? [
                            ...collections.filter((c) => c.title !== subCol.collectionName),
                            collectionForDetails,
                            ...(subCol.subCollections || []).filter(
                                (c) => c.title !== subCol.collectionName
                            ),
                        ]
                        : [
                            ...collections,
                            ...(subCol.subCollections || []),
                        ];

                    columns.push({
                        component: DocumentDetailsColumn as unknown as React.ComponentType<Record<string, unknown>>,
                        props: {
                            selectedDocument: subCol.selectedDocument,
                            collections: collectionsForDetails,
                            selectedCollection: subCol.collectionName,
                            data,
                            documentData: subCol.documentData || {},
                            onEditDocument: () => handleSubCollectionEditDocument(subCol.id),
                            subCollections: subCol.subCollections || [],
                            ajaxSubCollections: {
                                open: subCollectionSubCollectionsLoading[subCol.id] || false,
                            },
                            activeSubCollections: (() => {
                                if (!subCol.selectedDocument) return [];
                                const newParentPath = `${fullCollectionName}/${subCol.selectedDocument}`;
                                // Tìm các sub-collection đang active (có column tương ứng trong subCollectionColumns)
                                return subCollectionColumns
                                    .filter((col) => col.parentPath === newParentPath)
                                    .map((col) => col.collectionName);
                            })(),
                            onSubCollectionClick: (subCollection: Collection) => {
                                if (!subCol.selectedDocument) return;
                                const newParentPath = `${fullCollectionName}/${subCol.selectedDocument}`;
                                // Thêm sub-collection column mới (giữ nguyên column hiện tại)
                                handleSubCollectionClick(subCollection, newParentPath);
                            },
                            width: subCollectionColumnWidths[detailsColumnKey] || 600,
                            onResizeStart: (e: React.MouseEvent) => handleResizeStart(detailsColumnKey, e.clientX, true),
                            isResizing: resizingColumn === detailsColumnKey,
                        },
                    });
                }

                return columns;
            }),
        ],
        [
            collections,
            selectedCollection,
            selectedDocument,
            documents,
            documentData,
            subCollections,
            subCollectionColumns,
            subCollectionLoading,
            subCollectionSubCollectionsLoading,
            ajaxLoadData,
            ajaxDocuments,
            ajaxSubCollections,
            ajaxSubCollectionSubCollections,
            ajaxDelete,
            ajax,
            ajaxDuplicate,
            data,
            columnWidths,
            subCollectionColumnWidths,
            resizingColumn,
        ]
    );

    // Tính toán breadcrumb items
    const breadcrumbItems = React.useMemo(() => {
        const items: Array<{ label: string; onClick?: () => void; isActive?: boolean }> = [
            {
                label: "Collections",
                onClick: () => {
                    setSelectedCollection(null);
                    setSelectedDocument(null);
                    setSubCollectionColumns([]);
                },
            },
        ];

        if (selectedCollection) {
            items.push({
                label: selectedCollection,
                onClick: () => {
                    setSelectedDocument(null);
                    setSubCollectionColumns([]);
                    handleGetDocumentsByCollectionName(selectedCollection);
                },
            });
        }

        if (selectedDocument) {
            const document = documents.find((doc) => doc.id === selectedDocument);
            const documentName = document
                ? String(document.name || document.title || selectedDocument)
                : selectedDocument;
            items.push({
                label: documentName,
                isActive: true,
            });
        }

        // Thêm các sub-collection từ subCollectionColumns
        subCollectionColumns.forEach((subCol, colIndex) => {
            items.push({
                label: subCol.collectionName,
                onClick: () => {
                    // Xóa tất cả columns sau column này
                    const columnIndex = subCollectionColumns.findIndex(
                        (col) => col.id === subCol.id
                    );
                    if (columnIndex !== -1) {
                        setSubCollectionColumns((prev) => {
                            const newColumns = prev.slice(0, columnIndex + 1);
                            // Reset selectedDocument và documentData cho column này
                            return newColumns.map((col, idx) =>
                                idx === columnIndex
                                    ? { ...col, selectedDocument: null, documentData: undefined, subCollections: [] }
                                    : col
                            );
                        });
                        // Reload documents cho sub-collection này
                        const fullCollectionName = subCol.parentPath
                            ? `${subCol.parentPath}/${subCol.collectionName}`
                            : subCol.collectionName;
                        ajaxDocuments.ajax({
                            url: "plugin/vn4-e-learning/app-mobile/database/documents/index",
                            data: {
                                id: data.post.id,
                                collection_name: fullCollectionName,
                                search_text: subCol.searchText || "",
                            },
                            success: (result) => {
                                if (result.success) {
                                    setSubCollectionColumns((prev) =>
                                        prev.map((col) =>
                                            col.id === subCol.id
                                                ? { ...col, documents: result.documents || [] }
                                                : col
                                        )
                                    );
                                }
                            },
                        });
                    }
                },
            });

            if (subCol.selectedDocument) {
                const document = subCol.documents.find(
                    (doc) => doc.id === subCol.selectedDocument
                );
                const documentName = document
                    ? String(document.name || document.title || subCol.selectedDocument)
                    : subCol.selectedDocument;
                items.push({
                    label: documentName,
                    isActive: colIndex === subCollectionColumns.length - 1,
                });
            }
        });

        return items;
    }, [selectedCollection, selectedDocument, documents, subCollectionColumns, handleGetDocumentsByCollectionName, ajaxDocuments, data.post.id]);

    return (
        <>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    mb: 2,
                }}
            >
                <Breadcrumbs
                    separator="›"
                    sx={{
                        flex: 1,
                        "& .MuiBreadcrumbs-ol": {
                            flexWrap: "nowrap",
                        },
                    }}
                >
                    {breadcrumbItems.map((item, index) => {
                        const isLast = index === breadcrumbItems.length - 1 || item.isActive;
                        return isLast ? (
                            <Typography
                                key={index}
                                sx={{
                                    color: "text.primary",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                }}
                            >
                                {item.label}
                            </Typography>
                        ) : (
                            <Typography
                                key={index}
                                component="button"
                                onClick={item.onClick}
                                sx={{
                                    color: "primary.main",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    background: "none",
                                    border: "none",
                                    padding: 0,
                                    font: "inherit",
                                    "&:hover": {
                                        textDecoration: "underline",
                                    },
                                }}
                            >
                                {item.label}
                            </Typography>
                        );
                    })}
                </Breadcrumbs>
                <LoadingButton
                    variant="contained"
                    color="primary"
                    loading={ajax.open}
                    onClick={handleGetIndexes}
                >
                    Sync Data
                </LoadingButton>
            </Box>
            <Box
                ref={columnsContainerRef}
                sx={{
                    display: "flex",
                    height: "70vh",
                    minHeight: "500px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    overflowX: "auto",
                    overflowY: "hidden",
                    backgroundColor: "#ffffff",
                    "&::-webkit-scrollbar": {
                        height: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                        backgroundColor: "#f1f1f1",
                        borderRadius: "4px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "#888",
                        borderRadius: "4px",
                        "&:hover": {
                            backgroundColor: "#555",
                        },
                    },
                }}
            >
                {columns.map((column, index) => {
                    const ColumnComponent = column.component;
                    // Tạo key duy nhất cho mỗi column
                    const columnKey = index === 0 ? 'collections'
                        : index === 1 ? 'documents'
                            : index === 2 ? 'documentDetails'
                                : `sub-collection-${index}`;
                    return (
                        <ColumnComponent key={columnKey} {...column.props} />
                    );
                })}
            </Box>
            <DrawerCustom
                title="Thêm collection"
                open={openAddCollection}
                onClose={() => {
                    setOpenAddCollection(false);
                }}
                activeOnClose
                headerAction={
                    <LoadingButton
                        variant="contained"
                        color="success"
                        loading={ajax.open}
                        onClick={handleSaveCollection}
                    >
                        {collectionAction.action === "add"
                            ? "Thêm"
                            : "Cập nhật"}{" "}
                        collection
                    </LoadingButton>
                }
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        pt: 3,
                    }}
                >
                    <FieldForm
                        data={data}
                        component="text"
                        config={{
                            label: "Tên collection",
                            placeholder: "Nhập tên collection",
                            required: true,
                        }}
                        name="title"
                        post={collectionAction.collection}
                        onReview={(title) => {
                            setCollectionAction((prev) => ({
                                ...prev,
                                collection: { ...prev.collection, title },
                            }));
                        }}
                    />

                    <FieldForm
                        data={data}
                        component="text"
                        config={{ label: "Mô tả", placeholder: "Nhập mô tả" }}
                        name="description"
                        post={collectionAction.collection}
                        onReview={(description) => {
                            setCollectionAction((prev) => ({
                                ...prev,
                                collection: { ...prev.collection, description },
                            }));
                        }}
                    />

                    <FieldForm
                        data={data}
                        component="text"
                        config={{
                            label: "Icon (optional)",
                            placeholder: "Nhập icon",
                            special_notes: [
                                {
                                    type: "warning",
                                    content:
                                        "Lưu ý icon phải đúng với material icon, nếu không chương trình sẽ crash, tham khảo thêm tại đây: https://mui.com/material-ui/material-icons/",
                                },
                            ],
                            required: true,
                        }}
                        name="icon"
                        post={collectionAction.collection}
                        onReview={(icon) => {
                            setCollectionAction((prev) => ({
                                ...prev,
                                collection: { ...prev.collection, icon },
                            }));
                        }}
                    />

                    <FieldForm
                        data={data}
                        component="repeater"
                        config={{
                            label: "Các trường",
                            sub_fields: {
                                title: { title: "Tên trường", view: "text" },
                                type: {
                                    title: "Loại trường",
                                    view: "select",
                                    list_option: {
                                        string: { title: "string" },
                                        number: { title: "number" },
                                        boolean: { title: "boolean" },
                                        array: { title: "array" },
                                        object: { title: "object" },
                                    },
                                },
                            },
                        }}
                        name="fields"
                        post={collectionAction.collection || {}}
                        onReview={(fields) => {
                            setCollectionAction((prev) => ({
                                ...prev,
                                collection: { ...prev.collection, fields },
                            }));
                        }}
                    />

                    <FieldForm
                        data={data}
                        component="repeater"
                        config={{
                            label: "Indexes",
                            note: "Thiết lập các chỉ mục cho collection để tối ưu truy vấn",
                            layout: "block",
                            sub_fields: {
                                name: { title: "Tên index", view: "text" },
                                unique: { title: "Unique", view: "true_false" },
                                fields: {
                                    title: "Fields",
                                    view: "repeater",
                                    sub_fields: {
                                        field: {
                                            title: "Field",
                                            view: "select",
                                            // list_option sẽ được bind runtime từ các field hiện có
                                            list_option: (() => {
                                                const opts: Record<
                                                    string,
                                                    { title: string }
                                                > = {};
                                                const fieldsArr = Array.isArray(
                                                    collectionAction.collection
                                                        .fields
                                                )
                                                    ? collectionAction
                                                        .collection.fields
                                                    : [];
                                                fieldsArr.forEach((f) => {
                                                    if (f?.title)
                                                        opts[String(f.title)] =
                                                        {
                                                            title: String(
                                                                f.title
                                                            ),
                                                        };
                                                });
                                                return Object.keys(opts).length
                                                    ? opts
                                                    : {
                                                        _placeholder: {
                                                            title: "Chưa có field",
                                                        },
                                                    };
                                            })(),
                                        },
                                        order: {
                                            title: "Thứ tự",
                                            view: "select",
                                            list_option: {
                                                asc: { title: "asc" },
                                                desc: { title: "desc" },
                                            },
                                        },
                                    },
                                },
                            },
                        }}
                        name="indexes"
                        post={collectionAction.collection || {}}
                        onReview={(indexes) => {
                            setCollectionAction((prev) => ({
                                ...prev,
                                collection: { ...prev.collection, indexes },
                            }));
                        }}
                    />
                </Box>
            </DrawerCustom>

            <EditDocumentDrawer
                open={openEditDocument}
                onClose={handleCloseEditDocument}
                selectedDocument={
                    editDocumentMode === "edit" ? selectedDocument : null
                }
                selectedCollection={selectedCollection}
                collections={collections}
                data={data}
                documentData={editDocumentMode === "edit" ? documentData : {}}
                onSaved={handleDocumentSaved}
            />

            {/* EditDocumentDrawer cho các sub-collection columns */}
            {subCollectionColumns.map((subCol) => {
                const fullCollectionName = subCol.parentPath
                    ? `${subCol.parentPath}/${subCol.collectionName}`
                    : subCol.collectionName;

                // Tìm collection thực sự trong mảng collections
                const actualCollection = collections.find(
                    (c) => c.title === subCol.collectionName
                );

                // Tạo một collection object với title là fullCollectionName để EditDocumentDrawer có thể tìm thấy
                // nhưng vẫn dùng fields từ collection thực sự
                const collectionForDrawer = actualCollection
                    ? { ...actualCollection, title: fullCollectionName }
                    : undefined;

                const collectionsForDrawer = collectionForDrawer
                    ? [...collections.filter((c) => c.title !== subCol.collectionName), collectionForDrawer]
                    : collections;

                return (
                    <EditDocumentDrawer
                        key={subCol.id}
                        open={openSubCollectionEditDocument[subCol.id] || false}
                        onClose={() => handleSubCollectionCloseEditDocument(subCol.id)}
                        selectedDocument={
                            subCollectionEditDocumentMode[subCol.id] === "edit"
                                ? subCol.selectedDocument
                                : null
                        }
                        selectedCollection={fullCollectionName}
                        collections={collectionsForDrawer}
                        data={data}
                        documentData={
                            subCollectionEditDocumentMode[subCol.id] === "edit" && subCol.documentData
                                ? subCol.documentData
                                : {}
                        }
                        onSaved={() => handleSubCollectionDocumentSaved(subCol.id)}
                    />
                );
            })}
        </>
    );
}

export default Database;
