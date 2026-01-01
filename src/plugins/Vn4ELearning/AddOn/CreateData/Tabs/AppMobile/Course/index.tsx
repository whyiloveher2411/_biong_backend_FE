import React from "react";
import Overview from "./Overview";
import useQuery from "hook/useQuery";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import useAjax from "hook/useApi";
import CourseTree from "./CourseTree/CourseTree";
import CourseTreeNew from "./CourseTreeNew";

interface Language {
    code: string;
    name: string;
    flag_code: string;
    icon_url?: string;
}

declare global {
    interface Window {
        __languages?: Language[];
    }
}

function Courses({ data }: { data: CreatePostTypeData }) {

    const useApi = useAjax();

    React.useEffect(() => {
        useApi.ajax({
            url: "plugin/vn4-e-learning/app-mobile/localization/languages",
            method: "POST",
            data: {
                action: "get",
                id: data.post.id,
            },
            success: (result) => {
                if (result.success && result.data?.languages) {
                    window.__languages = result.data.languages;
                }
            },
        });
    }, []);

    const { view } = useQuery({
        view: "course-tree",
    });

    if( view === 'overview' ) {
        return <Overview data={data} />;
    }

    if( view === 'course-tree-new' ) {
        return <CourseTreeNew data={data} />;
    }
    return <CourseTree data={data} />;
}

export default Courses;
