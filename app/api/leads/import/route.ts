import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Read file content
    const text = await file.text();
    
    // Parse CSV
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });
    
    if (result.errors.length > 0) {
      return NextResponse.json(
        { error: 'Failed to parse CSV', details: result.errors },
        { status: 400 }
      );
    }
    
    // Transform and create leads
    const leadsData = result.data.map((row: any) => ({
      firstName: row.firstName || row.first_name || '',
      lastName: row.lastName || row.last_name || '',
      companyName: row.companyName || row.company_name || row.company || '',
      email: row.email || '',
      phone: row.phone || '',
      location: row.location || '',
      notes: row.notes || '',
      status: 'NEW',
    }));
    
    // Filter out entries without email
    const validLeads = leadsData.filter((lead: any) => lead.email);
    
    if (validLeads.length === 0) {
      return NextResponse.json(
        { error: 'No valid leads found in CSV (email is required)' },
        { status: 400 }
      );
    }
    
    // Bulk insert
    const leads = await Lead.insertMany(validLeads);
    
    return NextResponse.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('Error importing leads:', error);
    return NextResponse.json(
      { error: 'Failed to import leads' },
      { status: 500 }
    );
  }
}
