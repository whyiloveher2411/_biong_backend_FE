import React from "react";
import Box from "components/atoms/Box";
import Typography from "components/atoms/Typography";
import Tooltip from "components/atoms/Tooltip";
import IconButton from "components/atoms/IconButton";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "components/atoms/CircularProgress";
import Icon from "components/atoms/Icon";
import useConfirmDialog from "hook/useConfirmDialog";
import { Collection } from "./types";

interface CollectionsColumnProps {
  collections: Collection[];
  selectedCollection: string | null;
  ajaxLoadData: { open: boolean };
  onCollectionClick: (collectionId: string) => void;
  onAddCollection: () => void;
  onEditCollection: (collection: Collection) => void;
  onDeleteCollection: (collection: Collection) => void;
}

const CollectionsColumn: React.FC<CollectionsColumnProps> = ({
  collections,
  selectedCollection,
  ajaxLoadData,
  onCollectionClick,
  onAddCollection,
  onEditCollection,
  onDeleteCollection,
}) => {
  const confirmDelete = useConfirmDialog();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuCollection, setMenuCollection] = React.useState<Collection | null>(null);
  const open = Boolean(anchorEl);
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, collection: Collection) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
      setMenuCollection(collection);
  };
  const handleCloseMenu = () => {
      setAnchorEl(null);
      setMenuCollection(null);
  };

  return (
      <Box
          sx={{
              width: "280px",
              borderRight: "1px solid #e0e0e0",
              backgroundColor: "#fafafa",
              display: "flex",
              flexDirection: "column",
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
                  justifyContent: "space-between",
                  alignItems: "center",
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
                  Collections
              </Typography>
              <IconButton 
                  color="primary"
                  component="button"
                  sx={{ p: 0.5 }}
                  onClick={onAddCollection}
              >
                  <AddCircleIcon />
              </IconButton>
          </Box>
          <Box
              sx={{
                  p: 1,
                  flex: 1,
                  overflowY: "auto",
              }}
          >
              {ajaxLoadData.open && (
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
              )}
              {collections.map((collection) => (
                  <Box
                      key={collection.title}
                      onClick={() => onCollectionClick(collection.title)}
                      sx={{
                          p: 1.5,
                          cursor: "pointer",
                          borderRadius: "6px",
                          mb: 0.75,
                          backgroundColor:
                              collection.status === 'in-firebase'
                                  ? (selectedCollection === collection.title ? "#e3f2fd" : "#fff8e1")
                                  : (selectedCollection === collection.title ? "#e3f2fd" : "transparent"),
                          "&:hover": {
                              backgroundColor:
                                  collection.status === 'in-firebase'
                                      ? (selectedCollection === collection.title ? "#e3f2fd" : "#ffecb3")
                                      : (selectedCollection === collection.title ? "#e3f2fd" : "#f5f5f5"),
                          },
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          transition: "all 0.2s ease",
                          ...(collection.status === 'in-firebase' ? { border: '1px solid #ffe082' } : {}),
                      }}
                  >
                      {collection.icon ? (
                          <Icon icon={collection.icon}/>
                      ) : selectedCollection === collection.title ? (
                          <FolderOpenIcon
                              color="primary"
                              sx={{ fontSize: 20 }}
                          />
                      ) : (
                          <FolderIcon
                              sx={{ fontSize: 20, color: "#666" }}
                          />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                              <Typography
                                  variant="body2"
                                  sx={{
                                      fontWeight:
                                          selectedCollection === collection.title
                                              ? "bold"
                                              : "normal",
                                      fontSize: "13px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                  }}
                              >
                                  {collection.title}
                              </Typography>
                              {(
                                  // Hiển thị cảnh báo chưa có index: ưu tiên dùng has_index nếu có,
                                  // fallback sang kiểm tra indexes mảng rỗng/không tồn tại
                                  (typeof collection.has_index === 'boolean' && !collection.has_index) ||
                                  (typeof collection.has_index !== 'boolean' && (!Array.isArray(collection.indexes) || collection.indexes.length === 0))
                              ) && (
                                  <Tooltip title="Collection chưa có index" arrow>
                                      <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f44336', display: 'inline-block' }} />
                                  </Tooltip>
                              )}
                          </Box>
                      </Box>
                  {typeof (collection as Collection).document_count === 'number' && (
                      <Box
                          sx={{
                              px: 0.75,
                              py: 0.25,
                              borderRadius: '10px',
                              backgroundColor: '#eeeeee',
                              color: '#555',
                              fontSize: '11px',
                              fontWeight: 500,
                              lineHeight: 1,
                              mr: 0.25,
                              minWidth: 20,
                              textAlign: 'center',
                          }}
                          component="span"
                      >
                          {collection.document_count}
                      </Box>
                  )}
                      <Box
                          sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              opacity: 0.7,
                              transition: "opacity .2s ease",
                              "&:hover": { opacity: 1 },
                              mr: 0.25,
                          }}
                      >
                          <IconButton 
                              size="small" 
                              color="default"
                              aria-label="more-collection"
                              onClick={(e) => handleOpenMenu(e, collection)}
                              sx={{ p: 0.5, borderRadius: 1 }}
                          >
                              <MoreVertIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                      </Box>
                  </Box>
              ))}
          </Box>
          <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleCloseMenu}
          >
              <MenuItem
                  onClick={() => {
                      if (menuCollection) onEditCollection(menuCollection);
                      handleCloseMenu();
                  }}
              >
                  <EditIcon fontSize="small" style={{ marginRight: 8 }} /> Chỉnh sửa
              </MenuItem>
              <MenuItem
                  onClick={() => {
                      if (!menuCollection) return;
                      confirmDelete.onConfirm(() => {
                          onDeleteCollection(menuCollection);
                      }, {
                          message: "Bạn có chắc chắn muốn xoá collection này không?",
                      });
                      handleCloseMenu();
                  }}
              >
                  <DeleteIcon fontSize="small" style={{ marginRight: 8 }} /> Xoá
              </MenuItem>
          </Menu>
          {confirmDelete.component}
      </Box>
  );
};

export default CollectionsColumn;


