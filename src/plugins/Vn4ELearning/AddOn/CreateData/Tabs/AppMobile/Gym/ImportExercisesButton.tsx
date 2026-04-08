import React from "react";
import LoadingButton from "components/atoms/LoadingButton";
import useAjax from "hook/useApi";

type Props = {
    appMobileId: string | number;
    onImported: () => void;
};

export default function ImportExercisesButton({ appMobileId, onImported }: Props) {
    const api = useAjax();

    const handleImport = () => {
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/gym/import-exercies",
            method: "POST",
            data: {
                id: appMobileId,
            },
            success: () => {
                onImported();
            },
        });
    };

    return (
        <LoadingButton variant="outlined" size="small" loading={api.open} onClick={handleImport}>
            Import bài tập
        </LoadingButton>
    );
}
