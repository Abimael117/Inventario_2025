
import { getFirebaseAdmin } from '@/app/firebase-admin';
import { NextResponse } from 'next/server';

// This route handler will act as a one-time script to create the initial admin user.
export async function GET() {
  const { auth, firestore } = getFirebaseAdmin();

  const adminEmail = 'admin@example.com';
  const adminPassword = 'password123';
  let uid = '';

  try {
    // Attempt to create the user.
    const userRecord = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: 'Admin User',
    });
    uid = userRecord.uid;
    console.log('Successfully created new admin user:', uid);
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      // If the user already exists, get their UID to ensure their Firestore profile is correct.
      console.log('Admin user already exists in Auth. Fetching UID.');
      const userRecord = await auth.getUserByEmail(adminEmail);
      uid = userRecord.uid;
    } else {
      // For any other auth error, fail loudly.
      console.error('Error creating admin user in Auth:', error);
      return NextResponse.json({ error: 'Failed to create admin user in Auth.', details: error.message }, { status: 500 });
    }
  }

  if (!uid) {
    return NextResponse.json({ error: 'Could not obtain UID for admin user.'}, { status: 500 });
  }

  try {
    // With the UID, create or overwrite the Firestore document to ensure the role is set.
    const userDocRef = firestore.collection('users').doc(uid);
    await userDocRef.set({
      name: 'Admin User',
      email: adminEmail,
      role: 'admin',
    });
    console.log('Successfully created/verified admin profile in Firestore for UID:', uid);
    return NextResponse.json({ message: 'Admin user created or verified successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error setting admin role in Firestore:', error);
    return NextResponse.json({ error: 'Failed to set admin role in Firestore.', details: error.message }, { status: 500 });
  }
}
