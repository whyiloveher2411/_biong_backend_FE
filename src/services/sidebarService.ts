import { IconFormat } from 'components/atoms/Icon';
import { ajax } from 'hook/useApi';

const sidebarService = {
    fetch: async (): Promise<SidebarProps> => {
        let data = await ajax({
            url: 'sidebar/get',
        });

        return data.sidebar;
    }
}

export default sidebarService;


export interface MenuItem {
    title: string,
    name: string,
    icon: IconFormat,
    href?: string,
    children?: MenuItem[]
}

export interface SidebarProps {
    title: string,
    description: string,
    icon: IconFormat,
    isBelow?: boolean,
    pages: MenuItem[],
    component?: string,
    priority?: number,
}

export interface ListSidebarProps {
    [key: string]: SidebarProps
}

