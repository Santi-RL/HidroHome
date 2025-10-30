import { nanoid } from 'nanoid';

export const createNodeId = (prefix = 'node'): string => `${prefix}_${nanoid(6)}`;
export const createLinkId = (prefix = 'link'): string => `${prefix}_${nanoid(6)}`;
