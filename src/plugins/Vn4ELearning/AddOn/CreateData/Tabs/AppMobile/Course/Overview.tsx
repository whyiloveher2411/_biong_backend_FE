import React from "react";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/FieldForm";
import Box from "components/atoms/Box";
import { LoadingButton } from "@mui/lab";
import useAjax from "hook/useApi";
import useStreamSync, { extractMessageString } from "hook/useStreamSync";
import SyncProgressDialog from "components/molecules/SyncProgressDialog";
import { Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import useConfirmDialog from "hook/useConfirmDialog";

function Overview({ data }: { data: CreatePostTypeData }) {

    const apiSyncCategories = useAjax();
    const apiSyncCourses = useAjax();
    const streamSync = useStreamSync();
    const [syncProgressDialogOpen, setSyncProgressDialogOpen] = React.useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    const confirmSyncCategories = useConfirmDialog({
        title: 'Xác nhận đồng bộ Categories',
        message: 'Bạn có chắc chắn muốn đồng bộ tất cả categories lên Firestore? Hãy đảm bảo bạn đã kiểm tra và xác nhận dữ liệu trước khi đồng bộ.'
    });

    const confirmSyncCourses = useConfirmDialog({
        title: 'Xác nhận đồng bộ Courses',
        message: 'Bạn có chắc chắn muốn đồng bộ tất cả courses lên Firestore? Hãy đảm bảo bạn đã kiểm tra và xác nhận dữ liệu trước khi đồng bộ.'
    });

    const handleSyncCategories = () => {
        confirmSyncCategories.onConfirm(() => {
            apiSyncCategories.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course/sync-category-to-firestore",
                method: "POST",
                data: {
                    id: data.post.id,
                },
                success: (result) => {
                    // API sẽ tự động hiển thị thông báo qua showMessage
                },
            });
        });
    }

    const handleSyncCourses = () => {
        confirmSyncCourses.onConfirm(() => {
            // Mở dialog progress
            setSyncProgressDialogOpen(true);
            streamSync.reset();
            
            // Gọi streaming sync
            streamSync.sync({
                url: "plugin/vn4-e-learning/app-mobile/course/sync-course-to-firestore",
                data: {
                    id: String(data.post.id),
                },
                onProgress: (data) => {
                    // Progress được cập nhật tự động qua hook
                },
                onComplete: (data) => {
                    const message = extractMessageString(data.message) || "Đồng bộ tất cả courses lên Firebase thành công";
                    apiSyncCourses.showMessage(message, "success");
                    // Đóng dialog sau 2 giây
                    setTimeout(() => {
                        setSyncProgressDialogOpen(false);
                    }, 2000);
                },
                onError: (error) => {
                    apiSyncCourses.showMessage(
                        error || "Không thể đồng bộ courses lên Firebase",
                        "error"
                    );
                },
            });
        });
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4, p: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <LoadingButton 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSyncCategories}
                        loading={apiSyncCategories.open}
                    >
                        Sync Categories
                    </LoadingButton>
                </Box>
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Categories",
                        object: "sac_course_category",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"app_mobile"}
                    onReview={() => {}} //eslint-disable-line
                />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Button variant="outlined" color="primary" onClick={() => {
                        const searchParams = new URLSearchParams(location.search);
                        searchParams.set('view', 'course-tree');
                        navigate(`${location.pathname}?${searchParams.toString()}`);
                    }}>
                        Coruse Tree
                    </Button>
                    <LoadingButton 
                        variant="contained" 
                        color="primary" 
                        onClick={handleSyncCourses}
                        loading={streamSync.isSyncing}
                    >
                        Sync Courses
                    </LoadingButton>
                </Box>
                <FieldForm
                    component={"relationship_onetomany_show"}
                    config={{
                        title: "Courses",
                        object: "sac_course",
                        field: "app_mobile",
                        view: "relationship_onetomany_show",
                        paginate: {
                            rowsPerPage: 10,
                        },
                    }}
                    post={data.post}
                    name={"app_mobile"}
                    onReview={() => {}} //eslint-disable-line
                />
            </Box>
            {confirmSyncCategories.component}
            {confirmSyncCourses.component}
            
            {/* Sync Progress Dialog */}
            <SyncProgressDialog
                open={syncProgressDialogOpen}
                onClose={() => {
                    if (!streamSync.isSyncing) {
                        setSyncProgressDialogOpen(false);
                        streamSync.reset();
                    }
                }}
                progress={streamSync.progress}
                currentStage={streamSync.currentStage}
                messages={streamSync.messages}
                error={streamSync.error}
                isSyncing={streamSync.isSyncing}
                totalObjects={streamSync.totalObjects}
                completedObjects={streamSync.completedObjects}
            />
        </Box>
    );
}

export default Overview;
