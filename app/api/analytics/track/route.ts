import { NextRequest, NextResponse } from 'next/server';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Firestore에 저장
    await addDoc(collection(db, 'analytics'), {
      ...data,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics 저장 에러:', error);
    return NextResponse.json({ error: 'Failed to save analytics' }, { status: 500 });
  }
}
