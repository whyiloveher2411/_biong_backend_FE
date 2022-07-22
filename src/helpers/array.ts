
import cloneDeep from 'lodash/cloneDeep';

export function array_flip(trans: string[]): { [key: string]: number } {

    if (!trans) return {};

    var tmp_ar: { [key: string]: number } = {}; //eslint-disable-line

    trans.forEach((key, index) => {
        tmp_ar[key] = index;
    });

    return tmp_ar;
}

export function copyArray<T>(variable: T): T {
    return cloneDeep(variable);
}

export type TreeProps = Array<TreeItem>

export type TreeItem = {
    [key: string]: any, //eslint-disable-line
    id: string,
    parent: string,
    children: TreeProps
};

export function convertListToTree(list: TreeProps): TreeProps {

    let map: {
        [key: string]: any //eslint-disable-line
    } = {}, node, roots = [], i;

    for (i = 0; i < list.length; i += 1) {
        map[list[i].id] = i; // initialize the map
        list[i].children = []; // initialize the children
        if (list[i].expanded === undefined) {
            list[i].expanded = true;
        }
    }

    for (i = 0; i < list.length; i += 1) {
        node = list[i];
        if (node.parent !== "0" && list[map[node.parent]]) {
            // if you have dangling branches check that map[node.parentId] exists
            list[map[node.parent]].children.push(node);
        } else {
            roots.push(node);
        }
    }
    return roots;
}

