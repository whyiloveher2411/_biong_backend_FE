import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import TextField from "@mui/material/TextField";
import LoadingButton from "components/atoms/LoadingButton";
import useAjax from "hook/useApi";

export type QuickInputCuisineType = "ingredient" | "recipe";

type Props = {
    appMobileId: string | number;
    onSuccess?: () => void;
};

export default function QuickInputIngredientsButton({ appMobileId, onSuccess }: Props) {
    const api = useAjax();
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState("");
    const [inputType, setInputType] = React.useState<QuickInputCuisineType>("ingredient");

    const handleClose = () => {
        setOpen(false);
        setText("");
        setInputType("ingredient");
    };

    const handleSubmit = () => {
        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/cuisine/create-cuisine-ingredient",
            method: "POST",
            data: {
                app_mobile: appMobileId,
                source_type: inputType,
                data: text,
            },
            success: () => {
                handleClose();
                onSuccess?.();
            },
        });
    };

    return (
        <>
            <LoadingButton variant="outlined" size="small" onClick={() => setOpen(true)}>
                Nhập nhanh nguyên liệu
            </LoadingButton>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
                <DialogTitle>Nhập nhanh nguyên liệu</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Loại</FormLabel>
                            <RadioGroup
                                row
                                value={inputType}
                                onChange={(_, v) => setInputType(v as QuickInputCuisineType)}
                            >
                                <FormControlLabel
                                    value="ingredient"
                                    control={<Radio size="small" />}
                                    label="ingredient"
                                />
                                <FormControlLabel
                                    value="recipe"
                                    control={<Radio size="small" />}
                                    label="recipe"
                                />
                            </RadioGroup>
                        </FormControl>
                        <TextField
                            autoFocus
                            fullWidth
                            multiline
                            minRows={8}
                            placeholder="Dán hoặc nhập dữ liệu nguyên liệu..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <LoadingButton variant="contained" loading={api.open} onClick={handleSubmit}>
                        Submit
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </>
    );
}
