import { Client } from '@notionhq/client';

export function getNotionClient() {
  const auth = process.env.NOTION_API_KEY;
  if (!auth) throw new Error('NOTION_API_KEY is not set');
  return new Client({ auth });
}

export function getParentPageId(): string {
  const id = process.env.NOTION_PARENT_PAGE_ID;
  if (!id) throw new Error('NOTION_PARENT_PAGE_ID is not set');
  return id;
}
