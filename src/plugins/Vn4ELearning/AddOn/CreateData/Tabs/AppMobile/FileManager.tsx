import React from "react";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import Box from "components/atoms/Box";
import GoogleDrive from "components/atoms/fields/image/GoogleDrive";
function FileManager({ data }: { data: CreatePostTypeData }) {

    const filesActive = React.useState({});

    return (
        <Box>
            <GoogleDrive
                values={{}}
                filesActive={filesActive}
                maxColumns={10}
                fileType={['ext_file', 'ext_image', 'ext_misc', 'ext_video', 'ext_music']}
                handleChooseFile={() => {
                    //
                }}
                config={{}}
            />
        </Box>
    );
}

export default FileManager;
