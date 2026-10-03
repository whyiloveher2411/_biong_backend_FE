import React from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import {
    fetchWorkflowActive,
    fetchWorkflowDefinitions,
    saveWorkflowActive,
    type WorkflowPromptContext,
    type WorkflowDefinition,
} from 'helpers/marketingWorkflowPrompts';
import MarketingWorkflowDrawer from './MarketingWorkflowDrawer';

type Props = {
    disabled?: boolean;
    /** Giá trị thay các key [key] trong prompt khi copy. VD: { topic: title } */
    promptContext?: WorkflowPromptContext;
    /** ID short video hiện tại — lưu/đọc workflow outputs (key/value updateField). */
    shortVideoId?: number;
    /** Audio script hiện tại — thay key [audio-script] khi copy prompt. */
    audioScript?: string;
};

/**
 * 1 button "Prompt" duy nhất mở drawer; mỗi workflow là 1 tab bên trong drawer.
 * Nhờ vậy timeline không bị tràn button dù có nhiều workflow document.
 */
export default function MarketingWorkflowButtons({
    disabled = false,
    promptContext,
    shortVideoId,
    audioScript,
}: Props) {
    const [workflows, setWorkflows] = React.useState<WorkflowDefinition[] | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [open, setOpen] = React.useState(false);
    const [activeWorkflowKey, setActiveWorkflowKey] = React.useState('');
    const loadedRef = React.useRef(false);
    const activeLoadedRef = React.useRef<number>(-1);

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

    const sid = Number(shortVideoId || 0);

    // Khôi phục workflow đang chọn của short video (mỗi video thuộc 1 workflow).
    React.useEffect(() => {
        if (!sid || activeLoadedRef.current === sid) {
            return;
        }
        activeLoadedRef.current = sid;
        fetchWorkflowActive(sid).then((key) => {
            if (key) {
                setActiveWorkflowKey(key);
            }
        });
    }, [sid]);

    // Đổi tab workflow → lưu lại vào short video để refresh vẫn thấy đúng.
    const handleSelectWorkflow = React.useCallback((key: string) => {
        setActiveWorkflowKey(key);
        if (sid && key) {
            void saveWorkflowActive(sid, key);
        }
    }, [sid]);

    if (loading && !workflows) {
        return <CircularProgress size={16} sx={{ mx: 0.5 }} />;
    }

    if (!workflows || workflows.length === 0) {
        return null;
    }

    const activeWorkflow = workflows.find((workflow) => workflow.key === activeWorkflowKey) || null;

    const handleOpen = () => {
        setActiveWorkflowKey((prev) => {
            const next = prev && workflows.some((workflow) => workflow.key === prev) ? prev : workflows[0].key;
            if (sid && next !== prev) {
                void saveWorkflowActive(sid, next);
            }
            return next;
        });
        setOpen(true);
    };

    return (
        <>
            <Tooltip title={`Prompt workflow (${workflows.length})`} placement="top">
                <span>
                    <Button
                        size="small"
                        variant="contained"
                        disabled={disabled}
                        startIcon={<AccountTreeOutlinedIcon fontSize="small" />}
                        onClick={handleOpen}
                        sx={{
                            textTransform: 'none',
                            fontSize: 12,
                            py: 0.25,
                            boxShadow: 'none',
                        }}
                    >
                        Prompt
                    </Button>
                </span>
            </Tooltip>

            <MarketingWorkflowDrawer
                open={open && Boolean(activeWorkflow)}
                workflow={activeWorkflow}
                workflows={workflows}
                onSelectWorkflow={handleSelectWorkflow}
                promptContext={promptContext}
                shortVideoId={shortVideoId}
                audioScript={audioScript}
                onClose={() => setOpen(false)}
            />
        </>
    );
}
