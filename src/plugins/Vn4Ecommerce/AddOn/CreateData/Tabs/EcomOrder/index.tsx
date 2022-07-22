import { CreatePostAddOnProps, CreatePostTypeData } from "components/pages/PostType/CreateData";
import Summary from "./Summary";

export default function (props: CreatePostTypeData) {


    if (props.action === 'EDIT') {
        return {
            summary: {
                title: 'Summary',
                component: (props: CreatePostAddOnProps) => <Summary {...props} />,
                priority: 0,
            }
        };
    }

    return {};

}