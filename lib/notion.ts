import { Client } from '@notionhq/client';
import { getStageByScore } from './stages';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

interface NotionLeadData {
  name: string;
  email: string;
  score: number;
  revenueRange?: string;
  stage: {
    name: string;
    emoji: string;
  };
}

export async function createNotionLead(data: NotionLeadData): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.NOTION_API_KEY) {
      console.error('[NOTION] NOTION_API_KEY not configured');
      return { success: false, error: 'Notion service not configured' };
    }

    if (!process.env.NOTION_DATABASE_ID) {
      console.error('[NOTION] NOTION_DATABASE_ID not configured');
      return { success: false, error: 'Notion database not configured' };
    }

    const stage = getStageByScore(data.score);
    const databaseId = process.env.NOTION_DATABASE_ID;

    // Map revenue range from assessment to Notion format
    // Must match your Notion database select options exactly (case-sensitive)
    // The form value IS the Notion value, so we use it directly
    const revenueNotionValue = data.revenueRange || 'NA';

    // Create the lead in Notion
    // Property names match your Notion database schema
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        // Company Name (Title field) - using provided name
        'Company Name': {
          title: [
            {
              text: {
                content: data.name || data.email.split('@')[0], // Fallback to email prefix if name not provided
              },
            },
          ],
        },
        // Status (Select field) - automatically set to "Lead" for new assessments
        'Status': {
          select: {
            name: 'Lead',
          },
        },
        // Email Address (Email field)
        'Email Address': {
          email: data.email,
        },
        // Current annual revenue range (Select field)
        'Current annual revenue range': {
          select: {
            name: revenueNotionValue,
          },
        },
      },
    });

    console.log('[NOTION] Lead created successfully:', response.id);
    return { success: true };
  } catch (error: any) {
    console.error('[NOTION] Error creating lead:', error);
    
    // Notion API errors often have helpful messages
    if (error.code === 'object_not_found') {
      return { success: false, error: 'Notion database not found. Check NOTION_DATABASE_ID.' };
    }
    if (error.code === 'validation_error') {
      return { success: false, error: `Notion property mismatch: ${error.message}` };
    }
    
    return { 
      success: false, 
      error: error.message || 'Unknown error creating Notion lead' 
    };
  }
}

/**
 * Helper function to get your Notion database schema
 * Run this once to see what properties your database has
 */
export async function getNotionDatabaseSchema(): Promise<void> {
  try {
    if (!process.env.NOTION_DATABASE_ID) {
      console.error('NOTION_DATABASE_ID not set');
      return;
    }

    const response = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    console.log('Notion Database Schema:');
    console.log(JSON.stringify(response.properties, null, 2));
  } catch (error) {
    console.error('Error fetching Notion schema:', error);
  }
}
