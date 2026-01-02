import Box from 'components/atoms/Box';
import ToggleButton from 'components/atoms/ToggleButton';
import ToggleButtonGroup from 'components/atoms/ToggleButtonGroup';
import { HookCreateDataProps } from 'components/pages/PostType/CreateData/Form';
import useAjax from 'hook/useApi';
import ConfirmDialog from 'components/molecules/ConfirmDialog';
import { __ } from 'helpers/i18n';
import React from 'react';

const ENV_OPTIONS = [
    { value: 'production', label: 'Production' },
    { value: 'development', label: 'Development' },
];

function HeaderRightEnvironment({ data, postType }: HookCreateDataProps) {
    const apiGetConfig = useAjax();
    const apiUpdateConfig = useAjax();

    const [envState, setEnvState] = React.useState<{
        current: string;
        serviceAccountProd: string;
        serviceAccountDev: string;
    }>({
        current: '',
        serviceAccountProd: '',
        serviceAccountDev: '',
    });

    const [confirmState, setConfirmState] = React.useState<{
        open: boolean;
        pendingValue: string | null;
    }>({
        open: false,
        pendingValue: null,
    });

    React.useEffect(() => {
        apiGetConfig.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/config/get',
            method: 'POST',
            data: {
                action: 'GET_CONFIG',
                id: data.post.id,
            },
            success: (result: {
                environment_current?: string;
                service_account_prod?: string;
                service_account_dev?: string;
            }) => {
                setEnvState({
                    current: result.environment_current || 'production',
                    serviceAccountProd: result.service_account_prod || '',
                    serviceAccountDev: result.service_account_dev || '',
                });
            },
        });
    }, [data?.post?.id]);

    const handleSwitchEnvironment = (_e: React.MouseEvent<HTMLElement>, value: string | null) => {
        if (!value || value === envState.current) return;
        setConfirmState({
            open: true,
            pendingValue: value,
        });
    };

    const handleConfirmSwitch = () => {
        const value = confirmState.pendingValue;
        if (!value) return;

        apiUpdateConfig.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/config/update',
            method: 'POST',
            data: {
                action: 'UPDATE_CONFIG',
                id: data.post.id,
                environment_current: value,
            },
            success: () => {
                setEnvState((prev) => ({
                    ...prev,
                    current: value,
                }));
            },
        });
        setConfirmState({ open: false, pendingValue: null });
    };

    const handleCloseConfirm = () => {
        setConfirmState({ open: false, pendingValue: null });
    };

    const isLoading = apiGetConfig.open || apiUpdateConfig.open;

    return (
        <React.Fragment>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={envState.current}
                    onChange={handleSwitchEnvironment}
                    disabled={isLoading || !envState.current}
                >
                    {ENV_OPTIONS.map((item) => (
                        <ToggleButton key={item.value} value={item.value} disableRipple>
                            {item.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>
            {confirmState.open && (
                <ConfirmDialog
                    open={confirmState.open}
                    onClose={handleCloseConfirm}
                    onConfirm={handleConfirmSwitch}
                    title={__('Switch Environment')}
                    message={__('Are you sure you want to switch the environment?')}
                />
            )}
        </React.Fragment>
    );
}

export default HeaderRightEnvironment;

