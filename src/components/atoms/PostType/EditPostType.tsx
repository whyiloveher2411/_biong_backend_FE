import Box from 'components/atoms/Box';
import useAjax from 'hook/useApi';
import React from 'react';
import { DataResultApiProps } from '../fields/relationship_onetomany_show/Form';
import DrawerEditPost from './DrawerEditPost';

function EditPostType({ open, onClose, id, postType, onEdit }: {
    open: boolean,
    onClose: () => void,
    id: ID,
    postType: string,
    onEdit: (post: JsonFormat) => void
}) {

    const [data, setData] = React.useState<DataResultApiProps | false>(false);
    const useAjax1 = useAjax({ loadingType: 'custom' });
    const isMountedRef = React.useRef(false);

    React.useEffect(() => {

        if (open && !isMountedRef.current) {
            isMountedRef.current = true;
            useAjax1.ajax({
                url: 'post-type/detail/' + postType + '/' + id,
                data: {
                    id: id
                },
                success: (result) => {
                    if (result.post) {
                        result.type = postType;
                        result.updatePost = new Date();
                        setData({ ...result });
                    } else {
                        onClose();
                    }
                }
            });
        }

        return () => {
            if (!open) {
                isMountedRef.current = false;
            }
        };
    }, [open, id, postType]);

    const handleSubmit = () => {

        if (!useAjax1.open && data) {
            useAjax1.ajax({
                url: 'post-type/post/' + postType,
                method: 'POST',
                data: { ...data.post, _action: 'EDIT' },
                success: (result) => {
                    if (result.post?.id) {
                        if (onEdit) {
                            onEdit(result.post);
                        }
                        onClose();
                        setData(false);
                    }
                }
            });
        }

    };

    return (
        <DrawerEditPost
            open={open}
            openLoading={useAjax1.open}
            onClose={() => { setData(false); onClose(); }}
            data={data as DataResultApiProps}
            setData={setData}
            handleSubmit={handleSubmit}
            showCopyPostJson
        >
            {
                useAjax1.open &&
                <Box style={{ height: 300 }} width={1} display="flex" justifyContent="center" alignItems="center">
                    {useAjax1.Loading}
                </Box>
            }
        </DrawerEditPost>
    )
}

export default EditPostType
