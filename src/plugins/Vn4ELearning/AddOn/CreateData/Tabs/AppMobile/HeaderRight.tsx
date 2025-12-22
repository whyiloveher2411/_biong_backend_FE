import Box from 'components/atoms/Box';
import ToggleButton from 'components/atoms/ToggleButton';
import ToggleButtonGroup from 'components/atoms/ToggleButtonGroup';
import { HookCreateDataProps } from 'components/pages/PostType/CreateData/Form';
import useAjax from 'hook/useApi';
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
    };

    const isLoading = apiGetConfig.open || apiUpdateConfig.open;

    return (
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
    );
}

export default HeaderRightEnvironment;

