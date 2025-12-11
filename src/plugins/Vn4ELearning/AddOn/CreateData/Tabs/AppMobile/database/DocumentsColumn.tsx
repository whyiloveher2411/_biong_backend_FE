import React from "react";
import Box from "components/atoms/Box";
import Typography from "components/atoms/Typography";
import IconButton from "components/atoms/IconButton";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import useConfirmDialog from "hook/useConfirmDialog";
import CircularProgress from "components/atoms/CircularProgress";

interface DocumentsColumnProps {
  selectedCollection: string | null;
  selectedDocument: string | null;
  onDocumentClick: (documentId: string) => void;
  onAddDocument: () => void;
  ajaxDocuments: { open: boolean };
  documents: Array<{id: string, [key: string]: unknown}>;
  onDuplicateDocument: (documentId: string) => void;
  onDeleteDocument: (documentId: string) => void;
  canAddDocument?: boolean;
  onCloseColumn?: () => void;
  width?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  isResizing?: boolean;
}

const DocumentsColumn: React.FC<DocumentsColumnProps> = ({
  selectedCollection,
  selectedDocument,
  onDocumentClick,
  onAddDocument,
  ajaxDocuments,
  documents,
  onDuplicateDocument,
  onDeleteDocument,
  canAddDocument = true,
  onCloseColumn,
  width = 350,
  onResizeStart,
  isResizing = false,
}) => {
  const confirmDelete = useConfirmDialog();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [activeDoc, setActiveDoc] = React.useState<string | null>(null);
  const open = Boolean(anchorEl);
  const openMenu = (e: React.MouseEvent<HTMLElement>, docId: string) => { e.stopPropagation(); setAnchorEl(e.currentTarget); setActiveDoc(docId); };
  const closeMenu = () => { setAnchorEl(null); setActiveDoc(null); };
  return (
      <Box
          sx={{
              width: `${width}px`,
              minWidth: "200px",
              borderRight: "1px solid #e0e0e0",
              backgroundColor: "#fafafa",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              flexShrink: 0,
          }}
      >
          <Box
              sx={{
                  p: 2,
                  borderBottom: "1px solid #e0e0e0",
                  backgroundColor: "#f5f5f5",
                  height: 52,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
              }}
          >
              <Typography
                  variant="h6"
                  sx={{
                      fontWeight: "bold",
                      color: "#1976d2",
                      fontSize: "14px",
                  }}
              >
                  Documents
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                  {onCloseColumn && (
                      <IconButton 
                          size="small"
                          component="button"
                          sx={{ p: 0.5 }}
                          onClick={onCloseColumn}
                          title="Đóng"
                      >
                          <CloseIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                  )}
                  <IconButton 
                      color="primary"
                      component="button"
                      sx={{ p: 0.5 }}
                      onClick={onAddDocument}
                      disabled={!selectedCollection || !canAddDocument}
                  >
                      <AddCircleIcon />
                  </IconButton>
              </Box>
          </Box>
          {selectedCollection ? (
              <Box
                  sx={{
                      p: 1,
                      flex: 1,
                      overflowY: "auto",
                  }}
              >
                  {
                  ajaxDocuments.open ?
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                        }}
                    >
                        <CircularProgress size={20} />
                    </Box>
                  :
                  documents.map((document) => {
                      return (
                          <Box
                                  key={document.id}
                                  onClick={() => onDocumentClick(document.id)}
                                  sx={{
                                      p: 1.5,
                                      cursor: "pointer",
                                      borderRadius: "4px",
                                      mb: 0.5,
                                      backgroundColor:
                                          selectedDocument === document.id
                                              ? "#e3f2fd"
                                              : "transparent",
                                      "&:hover": {
                                          backgroundColor:
                                              selectedDocument === document.id
                                                  ? "#e3f2fd"
                                                  : "#f5f5f5",
                                      },
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      transition: "all 0.2s ease",
                                  }}
                              >
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography
                                          variant="body2"
                                          sx={{
                                              fontWeight:
                                                  selectedDocument === document.id
                                                      ? "bold"
                                                      : "normal",
                                              fontSize: "13px",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                          }}
                                      >
                                          {String(document.name || document.title || document.id)}
                                      </Typography>
                                      <Typography
                                          variant="caption"
                                          sx={{
                                              color: "text.secondary",
                                              fontSize: "11px",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                              display: "block",
                                          }}
                                      >
                                          {document.id}
                                      </Typography>
                                  </Box>
                                  <IconButton 
                                      size="small" 
                                      color="default"
                                      aria-label="more-document"
                                      onClick={(e) => openMenu(e, document.id)}
                                      sx={{ p: 0.5 }}
                                  >
                                      <MoreVertIcon sx={{ fontSize: 18 }} />
                                  </IconButton>
                              </Box>
                          );
                      })}
              <Menu anchorEl={anchorEl} open={open} onClose={closeMenu}>
                  <MenuItem onClick={() => { if (activeDoc) onDuplicateDocument(activeDoc); closeMenu(); }}>
                      <ContentCopyIcon fontSize="small" style={{ marginRight: 8 }} /> Duplicate
                  </MenuItem>
                  <MenuItem onClick={() => {
                      if (!activeDoc) return;
                      confirmDelete.onConfirm(() => { onDeleteDocument(activeDoc); }, { message: "Bạn có chắc chắn muốn xoá document này không?" });
                      closeMenu();
                  }}>
                      <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Xoá
                  </MenuItem>
              </Menu>
              {confirmDelete.component}
              </Box>
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
                      Chọn một collection để xem documents
                  </Typography>
              </Box>
          )}
          {onResizeStart && (
              <Box
                  onMouseDown={onResizeStart}
                  sx={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: "4px",
                      cursor: "col-resize",
                      backgroundColor: isResizing ? "#1976d2" : "transparent",
                      "&:hover": {
                          backgroundColor: "#1976d2",
                      },
                      zIndex: 10,
                      transition: "background-color 0.2s ease",
                  }}
              />
          )}
      </Box>
  );
};

export default DocumentsColumn;


