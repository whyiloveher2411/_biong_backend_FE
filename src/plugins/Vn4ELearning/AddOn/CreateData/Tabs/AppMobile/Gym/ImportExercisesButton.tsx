import React from "react";
import LoadingButton from "components/atoms/LoadingButton";
import useAjax from "hook/useApi";
import ConfirmDialog from "components/molecules/ConfirmDialog";

type Props = {
    appMobileId: string | number;
    onImported: () => void;
};

type PendingAction = "import" | "sync" | null;

export default function ImportExercisesButton({ appMobileId, onImported }: Props) {
    const importApi = useAjax();
    const syncApi = useAjax();
    const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);

    const runImport = () => {
        importApi.ajax({
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

    const runSyncToMongodb = () => {
        syncApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/gym/sync-exercies-to-mongodb",
            method: "POST",
            data: {
                app_mobile: appMobileId,
            },
            success: () => {
                onImported();
            },
        });
    };

    const handleConfirm = () => {
        const action = pendingAction;
        setPendingAction(null);
        if (action === "import") {
            runImport();
        } else if (action === "sync") {
            runSyncToMongodb();
        }
    };

    return (
        <>
            <LoadingButton
                variant="outlined"
                size="small"
                loading={importApi.open}
                onClick={() => setPendingAction("import")}
            >
                Import bài tập
            </LoadingButton>
            <LoadingButton
                variant="outlined"
                size="small"
                loading={syncApi.open}
                onClick={() => setPendingAction("sync")}
            >
                Sync to MongoDB
            </LoadingButton>
            <ConfirmDialog
                open={pendingAction !== null}
                onClose={() => setPendingAction(null)}
                onConfirm={handleConfirm}
                title={
                    pendingAction === "import"
                        ? "Xác nhận import bài tập"
                        : pendingAction === "sync"
                          ? "Xác nhận đồng bộ MongoDB"
                          : ""
                }
                message={
                    pendingAction === "import"
                        ? "Bạn có chắc muốn thực hiện import bài tập? Thao tác này có thể cập nhật dữ liệu theo nguồn import."
                        : pendingAction === "sync"
                          ? "Bạn có chắc muốn đồng bộ bài tập lên MongoDB? Hãy đảm bảo cấu hình kết nối đã đúng trước khi tiếp tục."
                          : ""
                }
            />
        </>
    );
}
