import React from "react";
import { Box, Button } from "@mui/material";
import { FieldViewItemProps } from "components/atoms/fields/type";

function ViewListTitleIngredient(props: FieldViewItemProps) {
    const keyword = String(props.content ?? "").trim();
    const searchImageUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(keyword)}`;
    const handleSearchImage = React.useCallback(() => {
        window.open(searchImageUrl, "_blank", "noopener,noreferrer");
    }, [searchImageUrl]);

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
                variant="text"
                size="small"
                onClick={handleSearchImage}
            >
                {props.content}
            </Button>
        </Box>
    );
}

export default ViewListTitleIngredient;