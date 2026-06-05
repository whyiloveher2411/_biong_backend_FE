import React from "react";
import { Box, Button } from "@mui/material";
import { FieldViewItemProps } from "components/atoms/fields/type";
import { getAccessToken } from "store/user/user.reducers";
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from "helpers/url";

function ViewListTitleIngredient(props: FieldViewItemProps) {
    const keyword = String(props.content ?? "").trim();
    const cuisineIngredientId = String(props.post?.id ?? "").trim();

    const searchImageUrl = React.useMemo(() => {
        const imageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(keyword)}`;
        const accessToken = getAccessToken() ?? "";
        const apiUrl = convertToURL(
            getApiHost(),
            "/api/admin/plugin/vn4-e-learning/app-mobile/cuisine/update-image-edited",
        );
        const finalUrl = new URL(imageSearchUrl);
        finalUrl.searchParams.set("copy_image_edited", "1");
        finalUrl.searchParams.set("cuisine_ingredient_id", cuisineIngredientId);
        finalUrl.searchParams.set("access_token", accessToken);
        finalUrl.searchParams.set("api_url", apiUrl);
        finalUrl.hash = new URLSearchParams({
            copy_image_edited: "1",
            cuisine_ingredient_id: cuisineIngredientId,
            access_token: accessToken,
            api_url: apiUrl,
        }).toString();
        return finalUrl.toString();
    }, [cuisineIngredientId, keyword]);

    const handleSearchImage = React.useCallback(() => {
        window.open(searchImageUrl, "_blank", "noopener,noreferrer");
    }, [searchImageUrl]);

    const accessToken = getAccessToken() ?? "";

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
                variant="text"
                size="small"
                onClick={handleSearchImage}
                className="title-item-name"
                data-ingredient-id={props.post?.id}
                data-access-token={accessToken}
            >
                {props.content}
            </Button>
        </Box>
    );
}

export default ViewListTitleIngredient;