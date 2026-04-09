import React from "react";
import LoadingButton from "components/atoms/LoadingButton";
import SelectView from "components/atoms/fields/select/View";
import { FieldViewItemProps } from "components/atoms/fields/type";
import useAjax from "hook/useApi";

function RawHtmlLabelView(props: FieldViewItemProps) {
    const api = useAjax();
    const [openLink, setOpenLink] = React.useState("");

    React.useEffect(() => {
        setOpenLink("");
    }, [props.post, props.content]);

    const handleGetHtml = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        e.preventDefault();

        api.ajax({
            url: "plugin/vn4-e-learning/app-mobile/gym/get-html",
            method: "POST",
            data: {
                id: props.post?.id,
            },
            success: (result: JsonFormat) => {
                if (
                    !result ||
                    typeof result.open_link !== "string" ||
                    !result.open_link
                ) {
                    return;
                }

                setOpenLink(result.open_link);
            },
        });
    };

    if (props.content !== "completed") {
        const buttonCustomAttrs: Record<string, string> = {
            open_link: openLink,
        };

        return (
            <LoadingButton
                className="btn-get-html"
                variant="contained"
                color={openLink ? "secondary" : "primary"}
                loading={api.open}
                onClick={handleGetHtml}
                size="small"
                {...buttonCustomAttrs}
            >
                Get HTML
            </LoadingButton>
        );
    }

    return <SelectView {...props} />;
}

export default RawHtmlLabelView;
