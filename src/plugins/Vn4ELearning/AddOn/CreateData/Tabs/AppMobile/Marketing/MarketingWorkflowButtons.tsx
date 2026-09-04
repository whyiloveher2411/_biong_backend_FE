import React from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import {
    fetchWorkflowDefinitions,
    getWorkflowContrastTextColor,
    type WorkflowDefinition,
} from 'helpers/marketingWorkflowPrompts';
import MarketingWorkflowDrawer from './MarketingWorkflowDrawer';

type Props = {
    disabled?: boolean;
};

/**
 * Danh sách button workflow (1 workflow = 1 màu theo index.md).
 * Click mở drawer xem các bước + copy prompt từng bước.
 */
export default function MarketingWorkflowButtons({ disabled = false }: Props) {
    const [workflows, setWorkflows] = React.useState<WorkflowDefinition[] | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [activeWorkflow, setActiveWorkflow] = React.useState<WorkflowDefinition | null>(null);
    const loadedRef = React.useRef(false);

    React.useEffect(() => {
        if (loadedRef.current) {
            return;
        }
        loadedRef.current = true;
        setLoading(true);
        fetchWorkflowDefinitions()
            .then((list) => {
                setWorkflows(list);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading && !workflows) {
        return <CircularProgress size={16} sx={{ mx: 0.5 }} />;
    }

    if (!workflows || workflows.length === 0) {
        return null;
    }

    return (
        <>
            {workflows.map((workflow) => {
                const background = workflow.background || 'primary.main';
                const textColor = workflow.background
                    ? getWorkflowContrastTextColor(workflow.background)
                    : 'primary.contrastText';

                return (
                    <Tooltip
                        key={workflow.key}
                        title={`${workflow.title} · ${workflow.steps.length} bước`}
                        placement="top"
                    >
                        <span>
                            <Button
                                size="small"
                                variant="contained"
                                disabled={disabled}
                                startIcon={<AccountTreeOutlinedIcon fontSize="small" />}
                                onClick={() => setActiveWorkflow(workflow)}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: 12,
                                    py: 0.25,
                                    color: textColor,
                                    bgcolor: background,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: background,
                                        filter: 'brightness(0.93)',
                                    },
                                    '&:disabled': {
                                        bgcolor: background,
                                        color: textColor,
                                        opacity: 0.5,
                                    },
                                }}
                            >
                                {workflow.title}
                            </Button>
                        </span>
                    </Tooltip>
                );
            })}

            <MarketingWorkflowDrawer
                open={Boolean(activeWorkflow)}
                workflow={activeWorkflow}
                onClose={() => setActiveWorkflow(null)}
            />
        </>
    );
}
