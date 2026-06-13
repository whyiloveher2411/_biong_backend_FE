import React from 'react';
import {
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ImageIcon from '@mui/icons-material/Image';
import {
    copyStoreScreenshotImageToClipboard,
    copyTextToClipboard,
} from './storeScreenshotClipboard';

type Props = {
    promptText: string;
    imageUrl: string;
    getImageBlob: () => Promise<Blob>;
    onCopyNotice: (message: string) => void;
};

function ScreenshotSourceCopyMenu({
    promptText,
    imageUrl,
    getImageBlob,
    onCopyNotice,
}: Props) {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [copyingImage, setCopyingImage] = React.useState(false);
    const hasPrompt = Boolean(String(promptText || '').trim());
    const open = Boolean(anchorEl);

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCopyPrompt = async () => {
        handleClose();
        if (!hasPrompt) {
            return;
        }

        try {
            await copyTextToClipboard(promptText);
            onCopyNotice('Đã sao chép prompt');
        } catch (error) {
            onCopyNotice(error instanceof Error ? error.message : 'Không copy được prompt');
        }
    };

    const handleCopyImage = async () => {
        handleClose();
        if (copyingImage) {
            return;
        }

        setCopyingImage(true);
        try {
            await copyStoreScreenshotImageToClipboard({
                imageUrl,
                getImageBlob,
            });
            onCopyNotice('Đã sao chép ảnh');
        } catch (error) {
            onCopyNotice(error instanceof Error ? error.message : 'Không copy được ảnh');
        } finally {
            setCopyingImage(false);
        }
    };

    return (
        <>
            <IconButton
                size="small"
                aria-label="Sao chép"
                title="Sao chép prompt hoặc ảnh"
                onClick={(event) => setAnchorEl(event.currentTarget)}
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    alignSelf: 'stretch',
                }}
            >
                <ArrowDropDownIcon fontSize="small" />
            </IconButton>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: { minWidth: 168 },
                    },
                }}
            >
                <MenuItem onClick={handleCopyPrompt} disabled={!hasPrompt} dense>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        <ContentCopyIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ variant: 'body2' }}>
                        Sao chép prompt
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={handleCopyImage} disabled={copyingImage} dense>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        <ImageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primaryTypographyProps={{ variant: 'body2' }}>
                        {copyingImage ? 'Đang copy…' : 'Sao chép ảnh'}
                    </ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}

export default ScreenshotSourceCopyMenu;
