import { NextResponse } from 'next/server';
import { verifyProof } from '@reclaimprotocol/js-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proofs } = body;

    if (!proofs || proofs.length === 0) {
      return NextResponse.json({ success: false, message: 'No proofs provided' }, { status: 400 });
    }

    // This is the lightweight crypto check mentioned in the docs
    const isValid = await verifyProof(proofs);

    if (isValid) {
      // In a real app, you'd save this to a database (e.g., Supabase/Prisma)
      // For the hackathon, we'll return success to let the frontend proceed.
      return NextResponse.json({ 
        success: true, 
        message: 'Proof verified successfully!' 
      });
    } else {
      return NextResponse.json({ success: false, message: 'Proof verification failed' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Reclaim API Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}