import { connectDB } from '@/lib/db';
import { OfferConfig } from '@/models/OfferConfig';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    // Get the first (and only) offer config document
    const config = await OfferConfig.findOne().lean();
    
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching offer config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offer configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    
    // Find existing config or create new one
    let config = await OfferConfig.findOne();
    
    if (config) {
      // Update existing
      Object.assign(config, body);
      await config.save();
    } else {
      // Create new
      config = new OfferConfig(body);
      await config.save();
    }
    
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error updating offer config:', error);
    return NextResponse.json(
      { error: 'Failed to update offer configuration' },
      { status: 500 }
    );
  }
}
