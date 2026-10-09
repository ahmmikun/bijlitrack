import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Reference } from '@/lib/server/models';
import { verifyAuth } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    await connectDB();

    const body = await req.json();
    const { consentGiven, trackingDays } = body;
    let { referenceNo } = body;

    if (!consentGiven) {
      return NextResponse.json(
        { message: 'Consent is required for tracking' },
        { status: 400 }
      );
    }

    if (referenceNo) {
      referenceNo = referenceNo.trim().replace(/[URur]+$/, '');
    }

    if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
      return NextResponse.json(
        { message: 'Invalid 14-digit numeric reference number' },
        { status: 400 }
      );
    }

    const days = Math.min(Math.max(parseInt(trackingDays, 10) || 30, 1), 30);

    const existing = await Reference.findOne({ userId: authUser.id, referenceNo });
    if (existing) {
      return NextResponse.json(
        { message: 'This reference number is already being tracked' },
        { status: 400 }
      );
    }

    const now = new Date();
    const reference = new Reference({
      userId: authUser.id,
      referenceNo,
      referenceNoLast4: referenceNo.slice(-4),
      trackingEnabled: true,
      trackingDays: days,
      trackingStartDate: now,
      trackingEndDate: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      consentGivenAt: now,
    });

    await reference.save();

    return NextResponse.json(reference, { status: 201 });
  } catch (error: any) {
    const status = error.message.includes('Not authorized') ? 401 : 500;
    return NextResponse.json(
      { message: error.message || 'Error tracking reference' },
      { status }
    );
  }
}
