import React from "react";
import Overview from "./Overview";
import useQuery from "hook/useQuery";
import { CreatePostTypeData } from "components/pages/PostType/CreateData";
import CourseTree from "./CourseTree";

function Courses({ data }: { data: CreatePostTypeData }) {

    const { view } = useQuery({
        view: "overview",
    });

    if( view !== 'course-tree' ) {
        return <Overview data={data} />;
    }
    return <CourseTree data={data} />;
}

export default Courses;
