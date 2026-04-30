import React from "react";
import { FieldViewItemProps } from "components/atoms/fields/type";
import { Box } from "@mui/material";
import { getAccessToken } from "store/user/user.reducers";
import { convertToURL } from "helpers/url";

function ViewReasonNotCompleted(props: FieldViewItemProps) {
    const postNameVi = String(props?.post?.name_vi ?? "").trim();
    const cuisineIngredientId = String(props?.post?.id ?? "").trim();
    const [activeReasonIndex, setActiveReasonIndex] = React.useState<number | null>(null);

    const appendParams = React.useCallback(
        (url: string) => {
            const accessToken = getAccessToken() ?? "";
            const apiUrl = convertToURL(
                process.env.REACT_APP_HOST_API_KEY || window.location.origin,
                "/api/admin/plugin/vn4-e-learning/app-mobile/cuisine/update-image-edited",
            );
            const finalUrl = new URL(url);
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
        },
        [cuisineIngredientId],
    );

    const getUrlByClassNames = React.useCallback(
        (classNames: string[]) => {
            if (!postNameVi) return "";

            if (classNames.includes("missing-image-edited")) {
                const imageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(postNameVi)}`;
                return appendParams(imageSearchUrl);
            }

            if (classNames.includes("missing-cooking-recipe") || classNames.includes("missing-ingredients")) {
                const query = `công thức nầu món ${postNameVi}`;
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                return appendParams(searchUrl);
            }

            return "";
        },
        [appendParams, postNameVi],
    );

    const [reasons, setReasons] = React.useState<
        { className: string; classNames: string[]; text: string; html: string }[]
    >([]);

    React.useEffect(() => {
        if (typeof document === "undefined") {
            setReasons([]);
            return;
        }

        const container = document.createElement("div");
        container.innerHTML = String(props.content ?? "");

        const nextReasons = Array.from(container.querySelectorAll("p")).map((item) => {
            const classNames = Array.from(item.classList);
            const dataUrl = getUrlByClassNames(classNames);

            if (dataUrl) {
                item.setAttribute("data-url", dataUrl);
            } else {
                item.removeAttribute("data-url");
            }

            return {
                className: item.className,
                classNames,
                text: item.textContent?.trim() ?? "",
                html: item.outerHTML,
            };
        });
        setReasons(nextReasons);
    }, [getUrlByClassNames, props.content]);

    const handleReasonClick = React.useCallback(
        (event: React.MouseEvent<HTMLDivElement>, classNames: string[], index: number) => {
            event.preventDefault();
            event.stopPropagation();
            setActiveReasonIndex(index);

            if (!postNameVi) return;

            if (classNames.includes("missing-image-edited")) {
                setReasons((prevReasons) =>
                    prevReasons.map((reason, reasonIndex) => {
                        if (reasonIndex !== index || !reason.classNames.includes("missing-image-edited")) {
                            return reason;
                        }

                        const container = document.createElement("div");
                        container.innerHTML = reason.html;
                        const pTag = container.querySelector("p");

                        if (!pTag) return reason;

                        pTag.classList.remove("missing-image-edited");
                        const nextClassNames = Array.from(pTag.classList);
                        const nextUrl = getUrlByClassNames(nextClassNames);
                        if (nextUrl) {
                            pTag.setAttribute("data-url", nextUrl);
                        } else {
                            pTag.removeAttribute("data-url");
                        }

                        return {
                            ...reason,
                            className: pTag.className,
                            classNames: nextClassNames,
                            html: pTag.outerHTML,
                        };
                    }),
                );
                const currentUrl = getUrlByClassNames(classNames);
                if (currentUrl) {
                    window.open(currentUrl, "_blank", "noopener,noreferrer");
                }
                return;
            }

            if (classNames.includes("missing-cooking-recipe") || classNames.includes("missing-ingredients")) {
                const currentUrl = getUrlByClassNames(classNames);
                if (currentUrl) {
                    window.open(currentUrl, "_blank", "noopener,noreferrer");
                }
            }
        },
        [getUrlByClassNames, postNameVi],
    );

    return (
        <Box
            sx={{ whiteSpace: "pre-wrap", "& > div": { marginBottom: 1 } }}
        >
            {reasons.map((reason, index) => (
                <Box
                    key={`${reason.className}-${index}`}
                    onClick={(event) => handleReasonClick(event, reason.classNames, index)}
                    sx={{
                        cursor: postNameVi ? "pointer" : "default",
                        backgroundColor: activeReasonIndex === index ? "rgba(25, 118, 210, 0.14)" : "transparent",
                        borderRadius: 1,
                        padding: "4px 8px",
                        "&:hover": postNameVi ? { textDecoration: "underline" } : undefined,
                    }}
                >
                    <Box
                        sx={{ "& > p": { margin: 0 } }}
                        dangerouslySetInnerHTML={{ __html: reason.html }}
                    />
                </Box>
            ))}
        </Box>
    );
}

export default ViewReasonNotCompleted;
