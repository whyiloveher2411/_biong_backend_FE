import Chip from 'components/atoms/Chip';
import React from 'react';
import { NavLink } from 'react-router-dom';
import { FieldViewItemProps } from '../type';

function View({ post, name }: FieldViewItemProps) {

    if (post[name]) {
        try {

            const postJson: JsonFormat[] = JSON.parse(post[name]);

            return (
                <div>
                    {
                        postJson.map(item => (
                            <Chip
                                style={{ textTransform: 'none', fontWeight: 'normal', margin: 2 }}
                                label={item.title}
                                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                                component={NavLink}
                                to={`/post-type/${item.type}/edit?post_id=${item.id}`}
                            />

                            // <Button
                            //     key={item.id}
                            //     variant="contained"
                            //     style={{ textTransform: 'none', fontWeight: 'normal', margin: 2 }}
                            //     onClick={e => e.stopPropagation()}
                            //     color='default'
                            //     component={NavLink}
                            //     to={`/post-type/${item.type}/edit?post_id=${item.id}`}>
                            //     {item.title}
                            // </Button>
                        ))
                    }

                </div>
            )
        } catch (error) {
            //
        }
    }

    return '';
}

export default View
