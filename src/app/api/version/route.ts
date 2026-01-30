import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API route that returns the current build version
 * This is used by the client to detect when a new version is available
 */
export async function GET() {
  try {
    const versionPath = path.join(process.cwd(), 'public', 'version.json');
    
    if (fs.existsSync(versionPath)) {
      const versionData = fs.readFileSync(versionPath, 'utf8');
      const version = JSON.parse(versionData);
      return NextResponse.json(version);
    }
    
    // Fallback if version file doesn't exist
    return NextResponse.json({
      buildTime: new Date().toISOString(),
      buildTimestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error reading version file:', error);
    return NextResponse.json(
      { error: 'Failed to read version' },
      { status: 500 }
    );
  }
}
