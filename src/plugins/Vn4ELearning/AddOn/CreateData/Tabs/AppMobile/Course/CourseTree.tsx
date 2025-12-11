import { CreatePostTypeData } from 'components/pages/PostType/CreateData'
import React from 'react'
import useAjax from 'hook/useApi'
import Box from 'components/atoms/Box'
import List from 'components/atoms/List'
import ListItem from 'components/atoms/ListItem'
import ListItemButton from 'components/atoms/ListItemButton'
import Collapse from 'components/atoms/Collapse'
import Typography from 'components/atoms/Typography'
import Skeleton from 'components/atoms/Skeleton'
import Chip from 'components/atoms/Chip'
import Button from 'components/atoms/Button'
import DrawerEditPost from 'components/atoms/PostType/DrawerEditPost'
import { DataResultApiProps } from 'components/atoms/fields/relationship_onetomany_show/Form'
import { LoadingButton } from '@mui/lab'
import FolderIcon from '@mui/icons-material/Folder'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate, useLocation } from 'react-router-dom'

interface Question {
    id: string
    title: string
}

interface Lesson {
    id: string
    title: string
    questions?: Question[]
}

interface Chapter {
    id: string
    title: string
    lessons?: Lesson[]
}

interface Section {
    id: string
    title: string
    chapters?: Chapter[]
}

interface Translate {
    id: string
    title: string
    language?: string
    sections?: Section[]
}

interface Course {
    id: string
    title: string
    translates?: Translate[]
}

type TreeNode = Course | Translate | Section | Chapter | Lesson | Question

function getNodeType(node: TreeNode): 'course' | 'translate' | 'section' | 'chapter' | 'lesson' | 'question' {
    if ('translates' in node) return 'course'
    if ('sections' in node) return 'translate'
    if ('chapters' in node) return 'section'
    if ('lessons' in node) return 'chapter'
    if ('questions' in node) return 'lesson'
    return 'question'
}

function getChildrenCount(node: TreeNode): number {
    const children = getChildren(node)
    return children.length
}

function getFolderIcon(hasChildren: boolean, isOpen: boolean): React.ReactNode {
    if (!hasChildren) {
        return <InsertDriveFileIcon sx={{ fontSize: 14 }} />
    }
    return isOpen ? <FolderOpenIcon sx={{ fontSize: 14 }} /> : <FolderIcon sx={{ fontSize: 14 }} />
}

function getNodeLabel(node: TreeNode): string {
    const type = getNodeType(node)
    const labels: Record<string, string> = {
        course: 'Course',
        translate: 'Translate',
        section: 'Section',
        chapter: 'Chapter',
        lesson: 'Lesson',
        question: 'Question'
    }
    return labels[type] || ''
}

function getNodeObjectType(nodeType: string): string {
    const objectTypes: Record<string, string> = {
        course: 'sac_course',
        translate: 'sac_translate',
        section: 'sac_section',
        chapter: 'sac_chapter',
        lesson: 'sac_lesson',
        question: 'sac_question'
    }
    return objectTypes[nodeType] || ''
}

function getChildType(parentType: string): string {
    const childTypes: Record<string, string> = {
        course: 'translate',
        translate: 'section',
        section: 'chapter',
        chapter: 'lesson',
        lesson: 'question'
    }
    return childTypes[parentType] || ''
}

function getNodeColor(node: TreeNode): string {
    const type = getNodeType(node)
    const colors: Record<string, string> = {
        course: '#1976d2',      // Blue
        translate: '#388e3c',  // Green
        section: '#f57c00',    // Orange
        chapter: '#7b1fa2',    // Purple
        lesson: '#0288d1',     // Light Blue
        question: '#616161'     // Grey
    }
    return colors[type] || '#616161'
}

function getNodeBackgroundColor(node: TreeNode, depth: number): string {
    const type = getNodeType(node)
    const backgrounds: Record<string, string> = {
        course: 'rgba(25, 118, 210, 0.05)',
        translate: 'rgba(56, 142, 60, 0.05)',
        section: 'rgba(245, 124, 0, 0.05)',
        chapter: 'rgba(123, 31, 162, 0.05)',
        lesson: 'rgba(2, 136, 209, 0.05)',
        question: 'rgba(97, 97, 97, 0.03)'
    }
    return backgrounds[type] || 'transparent'
}

function hasChildren(node: TreeNode): boolean {
    const type = getNodeType(node)
    switch (type) {
        case 'course': {
            const course = node as Course
            return !!(course.translates && course.translates.length > 0)
        }
        case 'translate': {
            const translate = node as Translate
            return !!(translate.sections && translate.sections.length > 0)
        }
        case 'section': {
            const section = node as Section
            return !!(section.chapters && section.chapters.length > 0)
        }
        case 'chapter': {
            const chapter = node as Chapter
            return !!(chapter.lessons && chapter.lessons.length > 0)
        }
        case 'lesson': {
            const lesson = node as Lesson
            return !!(lesson.questions && lesson.questions.length > 0)
        }
        default:
            return false
    }
}

function getChildren(node: TreeNode): TreeNode[] {
    const type = getNodeType(node)
    switch (type) {
        case 'course':
            return (node as Course).translates || []
        case 'translate':
            return (node as Translate).sections || []
        case 'section':
            return (node as Section).chapters || []
        case 'chapter':
            return (node as Chapter).lessons || []
        case 'lesson':
            return (node as Lesson).questions || []
        default:
            return []
    }
}

function CourseTreeItem({ node, depth = 0, isLast = false, onEditNode, onAddChild }: { node: TreeNode; depth?: number; isLast?: boolean; onEditNode?: (nodeId: string, nodeType: string) => void; onAddChild?: (parentId: string, parentType: string, childType: string) => void }) {
    const [open, setOpen] = React.useState(false) // Mặc định đóng tất cả, chỉ hiển thị danh sách khóa học
    const nodeHasChildren = hasChildren(node)
    const childrenCount = getChildrenCount(node)
    const nodeColor = getNodeColor(node)
    const backgroundColor = getNodeBackgroundColor(node, depth)
    const indentSize = 5 // Giảm xuống 5px mỗi level để giảm khoảng cách cho question
    const nodeType = getNodeType(node)
    // Giảm thêm khoảng cách cho question (level sâu nhất)
    const basePadding = nodeType === 'question' ? 0 : 2
    const paddingLeft = depth > 0 ? depth * indentSize + basePadding : basePadding

    const children = getChildren(node)
    const isLastChild = (index: number) => index === children.length - 1

    return (
        <Box sx={{ position: 'relative' }}>
            {/* Đường nối dọc */}
            {depth > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        left: depth * indentSize - 0.5,
                        top: 0,
                        bottom: isLast ? '50%' : 0,
                        width: 1, // Giảm từ 1.5 xuống 1
                        backgroundColor: 'divider',
                        zIndex: 0
                    }}
                />
            )}

            <ListItem disablePadding sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ 
                    display: 'flex',
                    alignItems: 'stretch',
                    width: '100%',
                    borderRadius: 0.5,
                    mx: 0,
                    mb: 0.5,
                    backgroundColor: backgroundColor,
                    borderLeft: `2px solid ${nodeColor}`,
                    borderTop: depth === 0 ? `1px solid ${nodeColor}` : 'none',
                    borderBottom: depth === 0 ? `1px solid ${nodeColor}` : 'none',
                    overflow: 'hidden'
                }}>
                    {/* Phần 1: Phần trước label - Click để expand/collapse */}
                    <Box
                        onClick={() => nodeHasChildren && setOpen(!open)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            pl: paddingLeft,
                            pr: 0.5,
                            py: 1,
                            cursor: nodeHasChildren ? 'pointer' : 'default',
                            flexShrink: 0,
                            backgroundColor: nodeHasChildren ? 'transparent' : 'transparent',
                            transition: 'background-color 0.2s ease',
                            '&:hover': {
                                backgroundColor: nodeHasChildren ? 'rgba(0,0,0,0.05)' : 'transparent'
                            }
                        }}
                    >
                        {/* Icon arrow để expand/collapse - chỉ hiển thị khi có children */}
                        {nodeHasChildren ? (
                            <Box sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 20,
                                height: 20,
                                color: nodeColor
                            }}>
                                {open ? (
                                    <ExpandMoreIcon sx={{ fontSize: 18 }} />
                                ) : (
                                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ width: 20, height: 20 }} />
                        )}
                        {/* Folder/File icon */}
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            color: nodeHasChildren ? nodeColor : 'text.secondary',
                            flexShrink: 0
                        }}>
                            {getFolderIcon(nodeHasChildren, open)}
                        </Box>
                    </Box>

                    {/* Phần 2: Phần title và các button - Click để edit */}
                    <ListItemButton
                        onClick={() => {
                            // Click vào phần này sẽ mở edit
                            if (onEditNode) {
                                const nodeType = getNodeType(node)
                                onEditNode(node.id, nodeType)
                            }
                        }}
                        sx={{ 
                            flex: 1,
                            pr: 0.5,
                            py: 1,
                            minHeight: 40,
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            '&:hover': {
                                backgroundColor: 'action.hover',
                                transform: 'translateX(2px)',
                                boxShadow: `0 2px 4px ${nodeColor}30`
                            }
                        }}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            width: '100%',
                            gap: 0.5,
                            flex: 1,
                            minWidth: 0
                        }}>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    fontWeight: nodeHasChildren ? 600 : 400,
                                    color: nodeHasChildren ? nodeColor : 'text.primary',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: depth === 0 ? '0.8125rem' : '0.75rem'
                                }}
                            >
                                {node.title || `Untitled ${getNodeLabel(node)}`}
                            </Typography>
                            <Chip 
                                label={getNodeLabel(node)} 
                                size="small" 
                                sx={{ 
                                    height: 16,
                                    fontSize: '0.625rem',
                                    minWidth: 'auto',
                                    px: 0.5,
                                    backgroundColor: nodeColor,
                                    color: 'white',
                                    fontWeight: 500,
                                    border: 'none',
                                    flexShrink: 0
                                }}
                            />
                            {/* Button Add Child sau chip label */}
                            {onAddChild && (() => {
                                const nodeType = getNodeType(node)
                                const childType = getChildType(nodeType)
                                if (childType) {
                                    const childLabels: Record<string, string> = {
                                        translate: 'Thêm Translate',
                                        section: 'Thêm Section',
                                        chapter: 'Thêm Chapter',
                                        lesson: 'Thêm Lesson',
                                        question: 'Thêm Question'
                                    }
                                    return (
                                        <Button
                                            size="small"
                                            variant="text"
                                            startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onAddChild(node.id, nodeType, childType)
                                            }}
                                            sx={{
                                                fontSize: '0.7rem',
                                                py: 0.25,
                                                px: 0.75,
                                                minWidth: 'auto',
                                                color: nodeColor,
                                                fontWeight: 500,
                                                textTransform: 'none',
                                                '&:hover': {
                                                    backgroundColor: `${nodeColor}15`
                                                }
                                            }}
                                        >
                                            {childLabels[childType] || `Thêm ${childType}`}
                                        </Button>
                                    )
                                }
                                return null
                            })()}
                            {/* Count indicator ở cuối */}
                            {nodeHasChildren && (
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    gap: 0.25,
                                    ml: 'auto',
                                    backgroundColor: 'rgba(0,0,0,0.05)',
                                    borderRadius: 0.5,
                                    px: 0.5,
                                    py: 0.125,
                                    flexShrink: 0
                                }}>
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: nodeColor,
                                            fontWeight: 600,
                                            fontSize: '0.625rem',
                                            lineHeight: 1
                                        }}
                                    >
                                        {open ? '^' : '^'}
                                    </Typography>
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: nodeColor,
                                            fontWeight: 600,
                                            fontSize: '0.625rem',
                                            lineHeight: 1
                                        }}
                                    >
                                        {childrenCount}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </ListItemButton>
                </Box>
            </ListItem>

            {/* Children với đường nối */}
            {nodeHasChildren && (
                <Collapse in={open} timeout="auto" unmountOnExit>
                    <Box sx={{ position: 'relative', pl: indentSize }}>
                        {/* Đường nối dọc cho children */}
                        <Box
                            sx={{
                                position: 'absolute',
                                left: indentSize / 2 - 0.5,
                                top: 0,
                                bottom: 0,
                                width: 1,
                                backgroundColor: 'divider',
                                zIndex: 0
                            }}
                        />
                        <List component="div" disablePadding sx={{ position: 'relative', zIndex: 1 }}>
                            {children.map((child, index) => (
                                <CourseTreeItem 
                                    key={child.id} 
                                    node={child} 
                                    depth={depth + 1}
                                    isLast={isLastChild(index)}
                                    onEditNode={onEditNode}
                                    onAddChild={onAddChild}
                                />
                            ))}
                        </List>
                    </Box>
                </Collapse>
            )}
        </Box>
    )
}

function CourseTree({ data }: { data: CreatePostTypeData }) {
    const api = useAjax()
    const apiSyncCourses = useAjax()
    const navigate = useNavigate()
    const location = useLocation()
    const [courses, setCourses] = React.useState<Course[] | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [openDrawer, setOpenDrawer] = React.useState(false)
    const [drawerData, setDrawerData] = React.useState<DataResultApiProps | false>(false)

    const handleBackToOverview = () => {
        const searchParams = new URLSearchParams(location.search)
        searchParams.delete('view') // Xóa view param để quay về overview
        navigate(`${location.pathname}?${searchParams.toString()}`)
    }

    const handleSyncCourses = () => {
        apiSyncCourses.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course/sync-course-to-firestore',
            method: 'POST',
            data: {
                id: data.post.id,
            },
            success: (result) => {
                // API sẽ tự động hiển thị thông báo qua showMessage
            },
        })
    }

    const handleAddCourse = () => {
        api.ajax({
            url: 'post-type/show-post-relationship',
            method: 'POST',
            data: {
                object: 'sac_course',
                mainType: data.post.type,
                id: data.post.id,
                field: 'app_mobile',
                view: 'relationship_onetomany_show',
                page: 1,
                rowsPerPage: 5
            },
            success: (result: DataResultApiProps) => {
                if (result.rows) {
                    result.action = 'ADD_NEW'
                    result.type = 'sac_course'
                    setDrawerData({ ...result })
                    setOpenDrawer(true)
                }
            }
        })
    }

    const handleAddChild = (parentId: string, parentType: string, childType: string) => {
        const childObjectType = getNodeObjectType(childType)
        if (!childObjectType) {
            api.showMessage(`Không tìm thấy object type cho ${childType}`, 'error')
            return
        }

        // Tìm parent object type để xác định field relationship
        const parentObjectType = getNodeObjectType(parentType)
        const relationshipField = getRelationshipField(parentType, childType)

        api.ajax({
            url: 'post-type/show-post-relationship',
            method: 'POST',
            data: {
                object: childObjectType,
                mainType: parentObjectType,
                id: parentId,
                field: relationshipField,
                view: 'relationship_onetomany_show',
                page: 1,
                rowsPerPage: 5
            },
            success: (result: DataResultApiProps) => {
                if (result.rows) {
                    result.action = 'ADD_NEW'
                    result.type = childObjectType
                    // Set parent relationship trong post data
                    if (result.post) {
                        result.post[relationshipField] = parentId
                    } else {
                        result.post = { [relationshipField]: parentId }
                    }
                    setDrawerData({ ...result })
                    setOpenDrawer(true)
                }
            }
        })
    }

    const getRelationshipField = (parentType: string, childType: string): string => {
        // Map relationship field names với tiền tố "sac_" cho chapter, lesson, question
        const fields: Record<string, Record<string, string>> = {
            course: {
                translate: 'course'
            },
            translate: {
                section: 'translate'
            },
            section: {
                chapter: 'sac_section' // Field có tiền tố sac_
            },
            chapter: {
                lesson: 'sac_chapter' // Field có tiền tố sac_
            },
            lesson: {
                question: 'sac_lesson' // Field có tiền tố sac_
            }
        }
        return fields[parentType]?.[childType] || 'parent'
    }

    const handleEditNode = (nodeId: string, nodeType: string) => {
        const objectType = getNodeObjectType(nodeType)
        if (!objectType) {
            api.showMessage(`Không tìm thấy object type cho ${nodeType}`, 'error')
            return
        }

        api.ajax({
            url: `post-type/detail/${objectType}/${nodeId}`,
            method: 'POST',
            data: {
                id: nodeId
            },
            success: (result: ANY) => {
                if (result.post) {
                    const editData: DataResultApiProps = {
                        ...result,
                        type: objectType,
                        action: 'EDIT'
                    }
                    setDrawerData(editData)
                    setOpenDrawer(true)
                } else {
                    api.showMessage(`Không tìm thấy dữ liệu để chỉnh sửa`, 'error')
                }
            },
            error: (response: Response) => {
                // Thử với object type khác nếu lỗi 404
                if (response.status === 404) {
                    // Thử các object types khác
                    const alternativeTypes: Record<string, string[]> = {
                        translate: ['sac_course_translate', 'e_learning_translate'],
                        section: ['sac_course_section', 'e_learning_section'],
                        chapter: ['sac_course_chapter', 'e_learning_chapter'],
                        lesson: ['sac_course_lesson', 'e_learning_lesson', 'sac_lesson'],
                        question: ['sac_course_question', 'e_learning_question', 'sac_question']
                    }
                    
                    const alternatives = alternativeTypes[nodeType] || []
                    if (alternatives.length > 0) {
                        api.showMessage(`Object type ${objectType} không tồn tại. Vui lòng kiểm tra lại cấu hình.`, 'error')
                    } else {
                        api.showMessage(`Không thể chỉnh sửa ${nodeType}. Có thể loại này không phải là post type riêng biệt.`, 'error')
                    }
                }
            }
        })
    }

    const handleCloseDrawer = () => {
        setOpenDrawer(false)
        setDrawerData(false)
    }

    const handleSubmitCourse = () => {
        if (!api.open && drawerData) {
            const objectType = drawerData.type || 'sac_course'
            api.ajax({
                url: `post-type/post/${objectType}`,
                method: 'POST',
                data: { ...drawerData.post, _action: drawerData.action },
                success: (result) => {
                    if (result.post?.id) {
                        setOpenDrawer(false)
                        setDrawerData(false)
                        // Reload danh sách courses
                        api.ajax({
                            url: 'plugin/vn4-e-learning/app-mobile/course/get-course',
                            method: 'POST',
                            data: {
                                id: data.post.id,
                            },
                            loading: false,
                            success: (result: ANY) => {
                                if (result.courses) {
                                    setCourses(result.courses)
                                } else if (Array.isArray(result)) {
                                    setCourses(result)
                                } else {
                                    setCourses([])
                                }
                            }
                        })
                    }
                }
            })
        }
    }

    React.useEffect(() => {
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/course/get-course',
            method: 'POST',
            data: {
                id: data.post.id,
            },
            loading: false,
            success: (result: ANY) => {
                if (result.courses) {
                    setCourses(result.courses)
                } else if (Array.isArray(result)) {
                    setCourses(result)
                } else {
                    setCourses([])
                }
                setLoading(false)
            },
            error: () => {
                setLoading(false)
                setCourses([])
            }
        })
    }, [data.post.id])

    if (loading) {
        return (
            <Box sx={{ p: 2 }}>
                <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
                <Skeleton variant="rectangular" height={40} />
            </Box>
        )
    }

    if (!courses || courses.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body1" color="text.secondary">
                    Không có course nào
                </Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
                            Cấu trúc Courses
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                            Course → Translates → Sections → Chapters → Lessons → Questions
                        </Typography>
                        {courses && courses.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                Tổng cộng: {courses.length} khóa học
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddCourse}
                            sx={{ 
                                minWidth: 'auto',
                                px: 2
                            }}
                        >
                            Thêm Course
                        </Button>
                        <LoadingButton 
                            variant="contained" 
                            color="primary" 
                            onClick={handleSyncCourses}
                            loading={apiSyncCourses.open}
                            sx={{ 
                                minWidth: 'auto',
                                px: 2
                            }}
                        >
                            Sync Courses
                        </LoadingButton>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleBackToOverview}
                            sx={{ 
                                minWidth: 'auto',
                                px: 2
                            }}
                        >
                            Quay về Overview
                        </Button>
                    </Box>
                </Box>
            </Box>
            <Box sx={{ 
                backgroundColor: 'background.paper',
                borderRadius: 2,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                overflowX: 'auto',
                maxHeight: 'calc(100vh - 250px)',
                overflowY: 'auto'
            }}>
                {courses.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                        Chưa có khóa học nào
                    </Typography>
                ) : (
                    <List sx={{ minWidth: 'fit-content' }}>
                        {courses.map((course, index) => (
                            <Box 
                                key={course.id}
                                sx={{
                                    mb: index < courses.length - 1 ? 2 : 0,
                                    '&:not(:last-child)': {
                                        borderBottom: '2px solid',
                                        borderColor: 'divider',
                                        pb: 2
                                    }
                                }}
                            >
                                <CourseTreeItem 
                                    node={course} 
                                    isLast={index === courses.length - 1}
                                    onEditNode={handleEditNode}
                                    onAddChild={handleAddChild}
                                />
                            </Box>
                        ))}
                    </List>
                )}
            </Box>
            {drawerData && (
                <DrawerEditPost
                    open={openDrawer}
                    openLoading={api.open}
                    onClose={handleCloseDrawer}
                    data={drawerData}
                    setData={setDrawerData}
                    handleSubmit={handleSubmitCourse}
                />
            )}
        </Box>
    )
}

export default CourseTree