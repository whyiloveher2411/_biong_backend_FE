import FieldForm from 'components/atoms/fields/FieldForm'
import { FieldFormItemProps } from 'components/atoms/fields/type'
import React from 'react'

function Main(props: FieldFormItemProps) {

    // renderOption={(props, option: Option) => (
    //     <li {...props} key={option.id}>
    //         <span dangerouslySetInnerHTML={{ __html: option.optionLabel }} />{option.title}&nbsp;{Boolean(option.new_post) && '(New Option)'}
    //     </li>
    // )}

    return (
        <FieldForm
            component='relationship_onetomany'
            config={{
                title: props.config.title,
                ...props.config,
                customViewForm: undefined,

            }}
            renderOption={(_p: React.HTMLAttributes<HTMLLIElement>, option: {
                id: string,
                title: string,
                new_post?: boolean,
                e_free_tutorials_cat_detail: string,
                optionLabel: string
            }) => {

                let catTitle = '';
                try {
                    const cat = JSON.parse(option.e_free_tutorials_cat_detail) ?? null;

                    catTitle = cat.title + ' - ';

                } catch (error) {
                    //
                }
                return <li {..._p} key={option.id}>
                    <span dangerouslySetInnerHTML={{ __html: option.optionLabel }} />{catTitle} {option.title}&nbsp;{Boolean(option.new_post) && '(New Option)'}
                </li>

            }}
            post={props.post}
            name={props.name}
            onReview={props.onReview}
        />
    )
}

export default Main