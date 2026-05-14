/**
 * `config.dialogContent.disableCloseOnSave === true`: sau khi save post thành công, drawer không tự đóng.
 */
export function shouldCloseDrawerAfterPostSave(data: ANY): boolean {
    return !data?.config?.dialogContent?.disableCloseOnSave;
}
