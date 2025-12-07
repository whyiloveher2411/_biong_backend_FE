import React from "react";
import Box from "components/atoms/Box";
import Typography from "components/atoms/Typography";
import LoadingButton from "components/atoms/LoadingButton";
import FieldForm from "components/atoms/fields/FieldForm";
import useAjax from "hook/useApi";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import { Collection } from "./types";
import DrawerCustom from "components/molecules/DrawerCustom";

interface EditDocumentDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedDocument: string | null;
  selectedCollection: string | null;
  collections: Collection[];
  data: CreatePostTypeData;
  documentData: Record<string, unknown>;
  onSaved: () => void;
}

const EditDocumentDrawer: React.FC<EditDocumentDrawerProps> = ({
  open,
  onClose,
  selectedDocument,
  selectedCollection,
  collections,
  data,
  documentData: initialDocumentData,
  onSaved,
}) => {
  const [documentData, setDocumentData] = React.useState<Record<string, unknown>>({});
  const ajax = useAjax();

  const selectedCollectionData = collections.find(
    (collection) => collection.title === selectedCollection
  );

  const handleSaveDocument = () => {
    const isUpdate = Boolean(selectedDocument);
    
    if (isUpdate) {
      // API update document
      ajax.ajax({
        url: "plugin/vn4-e-learning/app-mobile/database/documents/update",
        method: "POST",
        data: {
          id: data.post.id,
          collection_name: selectedCollection,
          document_id: selectedDocument,
          document: documentData,
        },
        success: () => {
          onSaved();
          onClose();
        }
      });
    } else {
      // API create document
      ajax.ajax({
        url: "plugin/vn4-e-learning/app-mobile/database/documents/create",
        method: "POST",
        data: {
          id: data.post.id,
          collection_name: selectedCollection,
          document: documentData,
        },
        success: () => {
          onSaved();
          onClose();
        }
      });
    }
  };

  React.useEffect(() => {
    if (selectedCollectionData) {
      if (!selectedDocument) {
        // Tạo document mới
        const initialData: Record<string, unknown> = {};
        const fieldsArr = Array.isArray(selectedCollectionData.fields) ? selectedCollectionData.fields : [];
        fieldsArr.forEach((field) => {
          initialData[field.title] = "";
        });
        setDocumentData(initialData);
      } else {
        // Sử dụng data có sẵn từ props
        setDocumentData(initialDocumentData);
      }
    }
  }, [selectedCollectionData, selectedDocument, initialDocumentData]);

  return (
    <DrawerCustom
      anchor="right"
      open={open}
      title={selectedDocument ? "Chỉnh sửa Document" : "Thêm Document mới"}
      onClose={onClose}
      activeOnClose
      sx={{
        "& .MuiDrawer-paper": {
          width: 500,
          maxWidth: "90vw",
        },
      }}
    >
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            py: 2,
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedCollection && selectedCollectionData ? (
            <>
              {(!Array.isArray(selectedCollectionData.fields) || selectedCollectionData.fields.length === 0) ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                    textAlign: 'center',
                    py: 6,
                  }}
                >
                  <Typography variant="body2">
                    Collection này chưa được config fields. Vui lòng cấu hình fields để thao tác với document.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {selectedCollectionData.fields.map((field) => {
                    let componentType = "text";
                    let config: Record<string, unknown> = {
                      label: field.title,
                      placeholder: `Nhập ${field.title}`,
                    };

                    switch (field.type) {
                      case "number":
                        componentType = "number";
                        break;
                      case "boolean":
                        componentType = "true_false";
                        (config as ANY).title = field.title;
                        break;
                      case "array":
                        componentType = "repeater";
                        (config as ANY).sub_fields = {
                          value: { title: "Giá trị", view: "text" },
                        };
                        break;
                      case "object":
                        componentType = "repeater";
                        (config as ANY).sub_fields = {
                          key: { title: "Key", view: "text" },
                          value: { title: "Value", view: "text" },
                        };
                        break;
                      default:
                        componentType = "text";
                    }

                    return (
                      <FieldForm
                        key={field.title}
                        data={data}
                        component={componentType}
                        config={config}
                        name={field.title}
                        post={documentData}
                        onReview={(value) => {
                          setDocumentData((prev: Record<string, unknown>) => ({
                            ...prev,
                            [field.title]: value,
                          }));
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                p: 2,
                textAlign: "center",
                color: "text.secondary",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="body2">
                Chọn một collection để thao tác với document
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
          }}
        >
          <LoadingButton
            variant="outlined"
            onClick={onClose}
          >
            Hủy
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="success"
            loading={ajax.open}
            onClick={handleSaveDocument}
            disabled={!selectedCollection}
          >
            {selectedDocument ? "Cập nhật" : "Thêm mới"}
          </LoadingButton>
        </Box>
      </Box>
    </DrawerCustom>
  );
};

export default EditDocumentDrawer;
