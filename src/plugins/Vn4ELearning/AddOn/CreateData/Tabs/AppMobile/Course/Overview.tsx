import React from "react";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import FieldForm from "components/atoms/fields/FieldForm";
import Box from "components/atoms/Box";
import { LoadingButton } from "@mui/lab";
import useAjax from "hook/useApi";
import { Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import useConfirmDialog from "hook/useConfirmDialog";

function Overview({ data }: { data: CreatePostTypeData }) {

    const apiSyncCategories = useAjax();
    const apiSyncCourses = useAjax();
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
            apiSyncCourses.ajax({
                url: "plugin/vn4-e-learning/app-mobile/course/sync-course-to-firestore",
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
                        loading={apiSyncCourses.open}
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
        </Box>
    );
}

export default Overview;
