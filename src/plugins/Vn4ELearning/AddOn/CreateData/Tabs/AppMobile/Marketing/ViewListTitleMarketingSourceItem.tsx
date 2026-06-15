import React from "react";
import { Box, Button } from "@mui/material";
import { FieldViewItemProps } from "components/atoms/fields/type";
import { getAccessToken } from "store/user/user.reducers";
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from "helpers/url";
import { openExternalTabViaExtension } from "helpers/openExternalTabViaExtension";

function buildTranslateTrendApiUrls() {
    const host = getApiHost();
    const updateApiUrl = convertToURL(
        host,
        "/api/admin/plugin/vn4-e-learning/app-mobile/marketing/source/item/update-translate-trend-from-overview",
    );
    const promptApiUrl = convertToURL(
        host,
        "/api/admin/plugin/vn4-e-learning/app-mobile/marketing/source/item/get-translate-trend-prompt",
    );
    return { updateApiUrl, promptApiUrl };
}

function ViewListTitleMarketingSourceItem(props: FieldViewItemProps) {
    const sourceItemId = String(props.post?.id ?? "").trim();
    const title = String(props.content ?? props.post?.title ?? "").trim();
    const link = String(props.post?.link ?? "").trim();
    const date = String(props.post?.date ?? "").trim();
    const accessToken = getAccessToken() ?? "";
    const { updateApiUrl, promptApiUrl } = React.useMemo(() => buildTranslateTrendApiUrls(), []);

    const openDetailLink = React.useCallback(() => {
        if (!link) {
            window.alert("Không có link bài viết");
            return;
        }
        openExternalTabViaExtension(link);
    }, [link]);

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
                variant="text"
                size="small"
                onClick={openDetailLink}
                disabled={!link}
                className="marketing-source-item-title"
                data-source-item-id={sourceItemId}
                data-title={title}
                data-link={link}
                data-date={date}
                data-access-token={accessToken}
                data-api-url={updateApiUrl}
                data-prompt-api-url={promptApiUrl}
                sx={{
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                    color: link ? "primary.main" : "text.primary",
                    textDecoration: link ? "underline" : "none",
                    textTransform: "none",
                }}
            >
                {props.content}
            </Button>
        </Box>
    );
}

export default ViewListTitleMarketingSourceItem;
