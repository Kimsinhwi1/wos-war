import { NextRequest, NextResponse } from 'next/server';
import { getNotionClient, getParentPageId } from '@/lib/notion-client';
import { buildNotionBlocks } from '@/lib/notion-blocks';
import type { StrategyDocument } from '@/lib/types';
import type { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';

const BATCH_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    const doc: StrategyDocument = await request.json();
    const notion = getNotionClient();
    const parentPageId = getParentPageId();

    // Create the page
    const page = await notion.pages.create({
      parent: { page_id: parentPageId },
      icon: { type: 'emoji', emoji: '\u2694\uFE0F' },
      properties: {
        title: {
          title: [{ text: { content: doc.title } }],
        },
      },
    });

    // Build all blocks
    const allBlocks = buildNotionBlocks(doc);

    // Append in batches of 100 (Notion API limit)
    for (let i = 0; i < allBlocks.length; i += BATCH_SIZE) {
      const batch = allBlocks.slice(i, i + BATCH_SIZE);
      await notion.blocks.children.append({
        block_id: page.id,
        children: batch as BlockObjectRequest[],
      });
    }

    const pageUrl = `https://notion.so/${page.id.replace(/-/g, '')}`;

    return NextResponse.json({
      success: true,
      pageId: page.id,
      pageUrl,
    });
  } catch (error) {
    console.error('Notion export error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to export to Notion',
      },
      { status: 500 },
    );
  }
}
