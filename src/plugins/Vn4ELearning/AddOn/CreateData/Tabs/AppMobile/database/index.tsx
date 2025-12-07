import React from "react";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import Box from "components/atoms/Box";
import DrawerCustom from "components/molecules/DrawerCustom";
import FieldForm from "components/atoms/fields/FieldForm";
import LoadingButton from "components/atoms/LoadingButton";
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

function Database({ data }: { data: CreatePostTypeData }) {
    const [collections, setCollections] = React.useState<Collection[]>([]);
    const [documents, setDocuments] = React.useState<Array<{id: string, [key: string]: unknown}>>([]);
    const [collectionAction, setCollectionAction] = React.useState<{
        action: "add" | "edit" | "delete",
        oldCollectionName: string,
        collection: Collection,
    }>({
        action: "add",
        oldCollectionName: "",
        collection: collectionInitialState,
    });

    const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);
    const [selectedDocument, setSelectedDocument] = React.useState<string | null>(null);
    const [documentData, setDocumentData] = React.useState<Record<string, unknown>>({});
    const [openAddCollection, setOpenAddCollection] = React.useState(false);
    const [openEditDocument, setOpenEditDocument] = React.useState(false);
    const [editDocumentMode, setEditDocumentMode] = React.useState<"add" | "edit">("add");
    const [subCollections, setSubCollections] = React.useState<string[]>([]);

    const ajax = useAjax();
    const ajaxLoadData = useAjax();
    const ajaxDocuments = useAjax();
    const ajaxDuplicate = useAjax();
    const ajaxDelete = useAjax();

    const getCollections = () => {
        ajaxLoadData.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/collections/index",
            data: { id: data.post.id },
            success: (result) => { setCollections(result.collections); },
        });
    };

    React.useEffect(() => { getCollections(); }, []);

    const handleCollectionClick = (collectionId: string) => {
        setSelectedCollection(collectionId);
        setSelectedDocument(null);
        handleGetDocumentsByCollectionName(collectionId);
    };

    const handleDocumentClick = (documentId: string) => { 
        setSelectedDocument(documentId);
        // Tìm document data từ documents array đã có sẵn
        const document = documents.find(doc => doc.id === documentId);
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
        setCollectionAction({ action: "add", oldCollectionName: "", collection: collectionInitialState });
    };

    const handleEditCollection = (collection: Collection) => {
        setOpenAddCollection(true);
        setCollectionAction({ action: "edit", oldCollectionName: collection.title, collection });
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
                if (result.success) { getCollections(); setOpenAddCollection(false); }
            },
        });
    };

    const handleGetDocumentsByCollectionName = (collectionName: string) => {
        ajaxDocuments.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/index",
            data: { id: data.post.id, collection_name: collectionName },
            success: (result) => { 
                if (result.success) {
                    setDocuments(result.documents || []);
                }
            },
        });
    };

    const handleGetSubCollections = (parentCollectionName: string, document_id: string) => {
        ajaxDocuments.ajax({
        url: "plugin/vn4-e-learning/app-mobile/database/documents/get-subcollections",
        data: { id: data.post.id, collection_name: parentCollectionName, document_id },
        success: (result) => {
            if (result.success) {
                setSubCollections(result.sub_collections || []);
            }
        },
    });
};

    const handleSaveCollection = () => {
        ajax.ajax({
            url: collectionAction.action === "add" ? "plugin/vn4-e-learning/app-mobile/database/collections/create" : "plugin/vn4-e-learning/app-mobile/database/collections/update",
            method: "POST",
            data: {
                id: data.post.id,
                collection: collectionAction.collection,
                action: collectionAction.action,
                old_collection_name: collectionAction.oldCollectionName,
            },
            success: (result) => {
                if (result.success) { getCollections(); setOpenAddCollection(false); }
            },
        });
    };

    const handleDuplicateDocument = (documentId: string) => {
        if (!selectedCollection) return;
        ajaxDuplicate.ajax({
            url: "plugin/vn4-e-learning/app-mobile/database/documents/duplicate",
            method: "POST",
            data: { id: data.post.id, collection_name: selectedCollection, document_id: documentId },
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

    return (
        <>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    mb: 2,
                }}
            >
                <LoadingButton  variant="contained" color="primary" loading={ajax.open} onClick={handleGetIndexes}>
                    Sync Data
                </LoadingButton>
            </Box>
            <Box
                sx={{
                    display: "flex",
                    height: "70vh",
                    minHeight: "500px",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: "#ffffff",
                }}
            >
                <CollectionsColumn
                    collections={collections}
                    selectedCollection={selectedCollection}
                    ajaxLoadData={ajaxLoadData}
                    onCollectionClick={handleCollectionClick}
                    onAddCollection={handleAddCollection}
                    onEditCollection={handleEditCollection}
                    onDeleteCollection={handleDeleteCollection}
                />

                <DocumentsColumn
                    selectedCollection={selectedCollection}
                    selectedDocument={selectedDocument}
                    onDocumentClick={handleDocumentClick}
                    onAddDocument={handleAddDocument}
                    ajaxDocuments={ajaxDocuments}
                    documents={documents}
                    onDuplicateDocument={handleDuplicateDocument}
                    canAddDocument={(() => {
                        const c = collections.find(i => i.title === selectedCollection);
                        return !!(c && Array.isArray(c.fields) && c.fields.length > 0);
                    })()}
                    onDeleteDocument={(documentId) => {
                        if (!selectedCollection) return;
                        ajaxDelete.ajax({
                            url: "plugin/vn4-e-learning/app-mobile/database/documents/delete",
                            method: "POST",
                            data: { id: data.post.id, collection_name: selectedCollection, document_id: documentId },
                            success: (result) => {
                                if (result?.success) {
                                    handleGetDocumentsByCollectionName(selectedCollection);
                                    if (selectedDocument === documentId) setSelectedDocument(null);
                                }
                            },
                        });
                    }}
                />

                <DocumentDetailsColumn
                    selectedDocument={selectedDocument}
                    collections={collections}
                    selectedCollection={selectedCollection}
                    data={data}
                    documentData={documentData}
                    onEditDocument={handleEditDocument}
                    subCollections={subCollections}
                />
            </Box>
            <DrawerCustom
                title="Thêm collection"
                open={openAddCollection}
                onClose={() => { setOpenAddCollection(false); }}
                activeOnClose
                headerAction={
                    <LoadingButton variant="contained" color="success" loading={ajax.open} onClick={handleSaveCollection}>
                        {collectionAction.action === "add" ? "Thêm" : "Cập nhật"} collection
                    </LoadingButton>
                }
            >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 3 }}>
                    <FieldForm
                        data={data}
                        component="text"
                        config={{ label: "Tên collection", placeholder: "Nhập tên collection", required: true }}
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
                            special_notes: [{
                              type: 'warning',
                              content: 'Lưu ý icon phải đúng với material icon, nếu không chương trình sẽ crash, tham khảo thêm tại đây: https://mui.com/material-ui/material-icons/',
                            }],
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
                            layout: 'block',
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
                                                const opts: Record<string, { title: string }> = {};
                                                const fieldsArr = Array.isArray(collectionAction.collection.fields) ? collectionAction.collection.fields : [];
                                                fieldsArr.forEach((f) => { if (f?.title) opts[String(f.title)] = { title: String(f.title) }; });
                                                return Object.keys(opts).length ? opts : { _placeholder: { title: "Chưa có field" } };
                                            })(),
                                        },
                                        order: {
                                            title: "Thứ tự",
                                            view: "select",
                                            list_option: { asc: { title: "asc" }, desc: { title: "desc" } },
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
                selectedDocument={editDocumentMode === "edit" ? selectedDocument : null}
                selectedCollection={selectedCollection}
                collections={collections}
                data={data}
                documentData={editDocumentMode === "edit" ? documentData : {}}
                onSaved={handleDocumentSaved}
            />
        </>
    );
}

export default Database;


