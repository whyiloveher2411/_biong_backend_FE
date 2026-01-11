import React from 'react'
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import Box from 'components/atoms/Box';
import FieldForm from 'components/atoms/fields/FieldForm';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import useAjax from 'hook/useApi';

function Asset({ data }: { data: CreatePostTypeData }) {

    const useApi = useAjax();

    const handleSyncAsset = () => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/asset/sync",
            method: "POST",
            data: {
                action: "sync",
                app_id: data.post.id,
            },
            success: (result) => {
                // 
            },
        });
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Button variant="outlined" color="primary">
                    Asset
                </Button>
                <LoadingButton
                    variant="contained"
                    color="primary"
                    onClick={handleSyncAsset}
                    loading={useApi.open}
                >
                    Sync asset
                </LoadingButton>
            </Box>
            <FieldForm
                component={"relationship_onetomany_show"}
                config={{
                    title: "Asset",
                    object: "app_asset",
                    field: "app_mobile",
                    view: "relationship_onetomany_show",
                    paginate: {
                        rowsPerPage: 10,
                    },
                }}
                post={data.post}
                name={"app_mobile"}
                onReview={() => { }} //eslint-disable-line
            />
        </Box>
    )
}

export default Asset