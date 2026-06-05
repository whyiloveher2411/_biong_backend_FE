import React from "react";
import { Box, Button } from "@mui/material";
import { FieldViewItemProps } from "components/atoms/fields/type";
import { getAccessToken } from "store/user/user.reducers";
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from "helpers/url";

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

    const openGoogleOverview = React.useCallback(async () => {
        if (!sourceItemId) return;
        try {
            const promptUrl = new URL(promptApiUrl);
            promptUrl.searchParams.set("source_item_id", sourceItemId);
            if (accessToken) {
                promptUrl.searchParams.set("access_token", accessToken);
            }
            const res = await fetch(promptUrl.toString(), {
                method: "GET",
                credentials: "include",
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            });
            const json = await res.json();
            if (!json?.success) {
                const msg = json?.message?.content || "Không lấy được prompt";
                window.alert(msg);
                return;
            }
            if (json.skipped) {
                window.alert(json?.message?.content || "Item đã đủ dữ liệu dịch/chấm xu hướng");
                return;
            }
            const prompt = String(json.prompt || "").trim();
            const googleBase = String(json.google_ai_mode_url || "https://www.google.com/search?udm=50&hl=vi");
            const url = new URL(googleBase);
            const hashParams = new URLSearchParams();
            hashParams.set("copy_translate_trend", "1");
            hashParams.set("source_item_id", sourceItemId);
            hashParams.set("access_token", accessToken);
            hashParams.set("api_url", updateApiUrl);
            if (prompt) {
                hashParams.set("marketing_prompt", encodeURIComponent(prompt));
            }
            url.hash = hashParams.toString();
            window.open(url.toString(), "_blank", "noopener,noreferrer");
        } catch (e) {
            window.alert("Lỗi mở Google Overview: " + (e instanceof Error ? e.message : String(e)));
        }
    }, [accessToken, promptApiUrl, sourceItemId, updateApiUrl]);

    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
                variant="text"
                size="small"
                onClick={openGoogleOverview}
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
                }}
            >
                {props.content}
            </Button>
        </Box>
    );
}

export default ViewListTitleMarketingSourceItem;
