import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import Box from 'components/atoms/Box'
import Typography from 'components/atoms/Typography'
import Paper from 'components/atoms/Paper'
import Table from 'components/atoms/Table'
import TableBody from 'components/atoms/TableBody'
import TableCell from 'components/atoms/TableCell'
import TableContainer from 'components/atoms/TableContainer'
import TableHead from 'components/atoms/TableHead'
import TableRow from 'components/atoms/TableRow'
import Chip from 'components/atoms/Chip'
import IconButton from 'components/atoms/IconButton'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import useAjax from 'hook/useApi'

// Mock data cho Firebase collections
const mockCollections = [
  {
    id: 'users',
    name: 'users',
    type: 'collection',
    documents: 1250,
    size: '2.3 MB',
    lastModified: '2024-01-15 10:30:00',
    fields: ['name', 'email', 'createdAt', 'role']
  },
  {
    id: 'courses',
    name: 'courses', 
    type: 'collection',
    documents: 45,
    size: '1.8 MB',
    lastModified: '2024-01-14 15:45:00',
    fields: ['title', 'description', 'instructor', 'price', 'duration']
  },
  {
    id: 'lessons',
    name: 'lessons',
    type: 'collection', 
    documents: 320,
    size: '4.1 MB',
    lastModified: '2024-01-13 09:20:00',
    fields: ['title', 'content', 'courseId', 'order', 'videoUrl']
  },
  {
    id: 'enrollments',
    name: 'enrollments',
    type: 'collection',
    documents: 890,
    size: '1.2 MB', 
    lastModified: '2024-01-12 14:15:00',
    fields: ['userId', 'courseId', 'enrolledAt', 'progress']
  },
  {
    id: 'quizzes',
    name: 'quizzes',
    type: 'collection',
    documents: 156,
    size: '3.5 MB',
    lastModified: '2024-01-11 11:30:00', 
    fields: ['title', 'questions', 'courseId', 'timeLimit', 'passingScore']
  }
];

function Database({ data }: { data: CreatePostTypeData }) {
  const [collections, setCollections] = React.useState(mockCollections);
  const [selectedCollection, setSelectedCollection] = React.useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = React.useState<string | null>(null);

  const ajax = useAjax();

  const getCollections = () => {
    ajax.ajax({
      url: "plugin/vn4-e-learning/app-mobile/database/get-collections",
      data: {
        id: data.post.id,
      },
      success: (result) => {
        setCollections(result.data.collections);
      },
    });
  }

  React.useEffect(() => {
    getCollections();
  }, []);

  const handleCollectionClick = (collectionId: string) => {
    setSelectedCollection(collectionId);
    setSelectedDocument(null);
  };

  const handleDocumentClick = (documentId: string) => {
    setSelectedDocument(documentId);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '70vh', 
      minHeight: '500px',
      border: '1px solid #e0e0e0', 
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Cột 1: Collections */}
      <Box sx={{ 
        width: '280px', 
        borderRight: '1px solid #e0e0e0', 
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e0e0e0', 
          backgroundColor: '#f5f5f5',
          flexShrink: 0
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '14px' }}>
            Collections
          </Typography>
        </Box>
        <Box sx={{ 
          p: 1, 
          flex: 1, 
          overflowY: 'auto'
        }}>
          {collections.map((collection) => (
            <Box
              key={collection.id}
              onClick={() => handleCollectionClick(collection.id)}
              sx={{
                p: 1.5,
                cursor: 'pointer',
                borderRadius: '4px',
                mb: 0.5,
                backgroundColor: selectedCollection === collection.id ? '#e3f2fd' : 'transparent',
                '&:hover': {
                  backgroundColor: selectedCollection === collection.id ? '#e3f2fd' : '#f5f5f5'
                },
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.2s ease'
              }}
            >
              {selectedCollection === collection.id ? 
                <FolderOpenIcon color="primary" sx={{ fontSize: 20 }} /> : 
                <FolderIcon sx={{ fontSize: 20, color: '#666' }} />
              }
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: selectedCollection === collection.id ? 'bold' : 'normal',
                    fontSize: '13px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {collection.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {collection.documents} documents
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Cột 2: Documents */}
      <Box sx={{ 
        width: '350px', 
        borderRight: '1px solid #e0e0e0', 
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e0e0e0', 
          backgroundColor: '#f5f5f5',
          flexShrink: 0
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '14px' }}>
            Documents
          </Typography>
        </Box>
        {selectedCollection ? (
          <Box sx={{ 
            p: 1, 
            flex: 1, 
            overflowY: 'auto'
          }}>
            {Array.from({ length: 20 }, (_, index) => {
              const docId = `${selectedCollection}_doc_${index + 1}`;
              return (
                <Box
                  key={docId}
                  onClick={() => handleDocumentClick(docId)}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    borderRadius: '4px',
                    mb: 0.5,
                    backgroundColor: selectedDocument === docId ? '#e3f2fd' : 'transparent',
                    '&:hover': {
                      backgroundColor: selectedDocument === docId ? '#e3f2fd' : '#f5f5f5'
                    },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: selectedDocument === docId ? 'bold' : 'normal',
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {docId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                      Modified: {new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ 
            p: 2, 
            textAlign: 'center', 
            color: 'text.secondary',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="body2">Chọn một collection để xem documents</Typography>
          </Box>
        )}
      </Box>

      {/* Cột 3: Document Details */}
      <Box sx={{ 
        flex: 1, 
        backgroundColor: '#fafafa',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e0e0e0', 
          backgroundColor: '#f5f5f5',
          flexShrink: 0
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '14px' }}>
            Document Details
          </Typography>
        </Box>
        {selectedDocument ? (
          <Box sx={{ 
            p: 2, 
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip label="Active" color="success" size="small" />
              <Chip label="Published" color="primary" size="small" />
            </Box>
            
            <TableContainer 
              component={Paper} 
              sx={{ 
                flex: 1,
                maxHeight: '100%',
                '& .MuiTable-root': {
                  fontSize: '13px'
                }
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>Field</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>Value</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {['id', 'name', 'email', 'createdAt', 'updatedAt', 'status'].map((field) => (
                    <TableRow key={field} hover>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '12px' }}>{field}</TableCell>
                      <TableCell sx={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {field === 'id' ? selectedDocument :
                         field === 'name' ? 'John Doe' :
                         field === 'email' ? 'john.doe@example.com' :
                         field === 'createdAt' ? '2024-01-15T10:30:00Z' :
                         field === 'updatedAt' ? '2024-01-15T14:20:00Z' :
                         'active'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={field === 'id' ? 'string' : 
                                field === 'name' ? 'string' :
                                field === 'email' ? 'string' :
                                field === 'createdAt' ? 'timestamp' :
                                field === 'updatedAt' ? 'timestamp' :
                                'string'} 
                          size="small" 
                          color="secondary"
                          sx={{ fontSize: '10px' }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary" sx={{ p: 0.5 }}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" color="error" sx={{ p: 0.5 }}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : (
          <Box sx={{ 
            p: 2, 
            textAlign: 'center', 
            color: 'text.secondary',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="body2">Chọn một document để xem chi tiết</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default Database