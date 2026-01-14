import { NextResponse } from 'next/server';
import { getNotionDatabaseSchema } from '@/lib/notion';

/**
 * Test route to verify Notion database property names
 * Visit: http://localhost:3000/api/notion-test
 */
export async function GET() {
  try {
    // Get the schema from Notion
    const { Client } = await import('@notionhq/client');
    
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json(
        { error: 'NOTION_API_KEY not configured' },
        { status: 500 }
      );
    }

    if (!process.env.NOTION_DATABASE_ID) {
      return NextResponse.json(
        { error: 'NOTION_DATABASE_ID not configured' },
        { status: 500 }
      );
    }

    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const response = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    // Extract property names and types
    const properties = Object.entries(response.properties).map(([key, value]: [string, any]) => ({
      name: key,
      type: value.type,
      // Include select options if it's a select field
      options: value.type === 'select' ? value.select?.options?.map((opt: any) => opt.name) : undefined,
    }));

    // Property names used in the code
    const codePropertyNames = [
      'Company Name',
      'Status',
      'Email Address',
      'Current annual revenue range',
    ];

    // Check which properties match
    const matches = codePropertyNames.map(codeName => {
      const found = properties.find(p => p.name === codeName);
      return {
        codeName,
        found: !!found,
        notionName: found?.name,
        type: found?.type,
        options: found?.options,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Notion database schema retrieved',
      allProperties: properties,
      codeProperties: codePropertyNames,
      verification: matches,
      summary: {
        allMatch: matches.every(m => m.found),
        missing: matches.filter(m => !m.found).map(m => m.codeName),
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('[NOTION TEST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch Notion schema',
        message: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
