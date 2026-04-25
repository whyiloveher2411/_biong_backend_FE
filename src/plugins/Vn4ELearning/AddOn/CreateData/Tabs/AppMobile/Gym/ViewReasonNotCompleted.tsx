import React from "react";
import { FieldViewItemProps } from "components/atoms/fields/type";
import { Box } from "@mui/material";

function ViewReasonNotCompleted(props: FieldViewItemProps) {
    const postNameVi = String(props?.post?.name_vi ?? "").trim();
    const reasons = React.useMemo(() => {
        if (typeof document === "undefined") {
            return [];
        }

        const container = document.createElement("div");
        container.innerHTML = String(props.content ?? "");

        return Array.from(container.querySelectorAll("p")).map((item) => ({
            className: item.className,
            text: item.textContent?.trim() ?? "",
        }));
    }, [props.content]);

    const handleReasonClick = React.useCallback(
        (className: string) => {
            if (!postNameVi) return;

            if (className.includes("missing-image-edited")) {
                const imageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(postNameVi)}`;
                window.open(imageSearchUrl, "_blank", "noopener,noreferrer");
                return;
            }

            if (className.includes("missing-cooking-recipe") || className.includes("missing-ingredients")) {
                const query = `công thức nầu món ${postNameVi}`;
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                window.open(searchUrl, "_blank", "noopener,noreferrer");
            }
        },
        [postNameVi],
    );

    return (
        <Box sx={{ whiteSpace: "pre-wrap",'& div':{ marginBottom: 1 } }}>
            {reasons.map((reason, index) => (
                <Box
                    key={`${reason.className}-${index}`}
                    onClick={() => handleReasonClick(reason.className)}
                    sx={{
                        cursor: postNameVi ? "pointer" : "default",
                        "&:hover": postNameVi ? { textDecoration: "underline" } : undefined,
                    }}
                >
                    {reason.text}
                </Box>
            ))}
        </Box>
    );
}

export default ViewReasonNotCompleted;
