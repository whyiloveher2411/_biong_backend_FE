import React from "react";

export default function useForm(props: ANY | JsonFormat): {
    data: null | JsonFormat,
    setData: React.Dispatch<React.SetStateAction<JsonFormat>>,
    onUpdateData: HandleUpdateDataProps
} {

    const [post, setPost] = React.useState<null | JsonFormat>(props);

    // const updateOnlyField = (value: any, key: string): void => {
    //     setPost((prev: JsonFormat): JsonFormat => {
    //         prev[key] = value;
    //         return { ...prev };
    //     });
    // }

    // const updateMultiField = (fields: { [key: string]: any }): void => {
    //     setPost((prev: JsonFormat): JsonFormat => {
    //         prev = {
    //             ...prev,
    //             ...fields
    //         };
    //         return { ...prev };
    //     });
    // }

    const onUpdateData = (callback: UpdateDataProps) => {
        setPost((prev: JsonFormat): JsonFormat => {
            let result;
            if (typeof prev === 'object') {
                result = { ...callback(prev) };
            } else {
                result = { ...callback({}) };
            }

            return result;
        });
    }

    // const onUpdateData = (value: any | null | ((prevValue: JsonFormat) => JsonFormat), key: string | { [key: string]: any } | null): void => {

    //     setPost((prev: JsonFormat): JsonFormat => {

    //         if (value instanceof Function) {
    //             return { ...value(prev) };
    //         } else {
    //             if (typeof key === 'object' && key !== null) {
    //                 prev = {
    //                     ...prev,
    //                     ...key
    //                 };
    //             } else {

    //                 if (typeof key === 'string') {
    //                     prev[key] = value;
    //                 }
    //             }
    //         }

    //         return { ...prev };

    //     });

    // }

    return {
        data: post,
        setData: setPost,
        onUpdateData: onUpdateData,
    };
}

export type UpdateDataProps = (preValue: JsonFormat) => JsonFormat;

export type HandleUpdateDataProps = (callback: UpdateDataProps) => void;
// export type UpdateOnlyField = (value: any, key: string) => void;
// export type UpdateMultiField = (value: null, key: { [key: string]: any }) => void;
// export type UpdateMultiFieldWithPreValue = (callback: (prevValue: JsonFormat) => JsonFormat) => void;


// export type UpdateFieldFunc = UpdateOnlyField | UpdateMultiField | UpdateMultiFieldWithPreValue;