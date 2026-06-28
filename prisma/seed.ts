import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SQLite LoanLens database...');

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.officerComment.deleteMany();
  await prisma.aiResult.deleteMany();
  await prisma.location.deleteMany();
  await prisma.report.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.otpToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password@123', 12);

  // ── Seed Admin ────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      name: 'Rajesh Kumar',
      email: 'admin@loanlens.ai',
      phone: '+91-9876543210',
      passwordHash,
      role: 'ADMIN',
      address: '12, MG Road, Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560001',
      isVerified: true,
      isActive: true,
    },
  });

  // ── Seed Loan Officers ─────────────────────────────────────────────────────
  const officer1 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'officer1@loanlens.ai',
      phone: '+91-9876543211',
      passwordHash,
      role: 'LOAN_OFFICER',
      address: '45, Anna Nagar, Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
      isVerified: true,
      isActive: true,
    },
  });

  const officer2 = await prisma.user.create({
    data: {
      name: 'Suresh Patel',
      email: 'officer2@loanlens.ai',
      phone: '+91-9876543212',
      passwordHash,
      role: 'LOAN_OFFICER',
      address: '78, CG Road, Ahmedabad',
      district: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380009',
      isVerified: true,
      isActive: true,
    },
  });

  // ── Seed Beneficiaries ────────────────────────────────────────────────────
  const beneficiary1 = await prisma.user.create({
    data: {
      name: 'Ramesh Yadav',
      email: 'farmer1@example.com',
      phone: '+91-9876543213',
      passwordHash,
      role: 'BENEFICIARY',
      address: 'Village Sundarpur, Dist Varanasi',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      pincode: '221001',
      isVerified: true,
      isActive: true,
    },
  });

  const beneficiary2 = await prisma.user.create({
    data: {
      name: 'Anita Devi',
      email: 'farmer2@example.com',
      phone: '+91-9876543214',
      passwordHash,
      role: 'BENEFICIARY',
      address: 'Village Rampur, Dist Patiala',
      district: 'Patiala',
      state: 'Punjab',
      pincode: '147001',
      isVerified: true,
      isActive: true,
    },
  });

  const beneficiary3 = await prisma.user.create({
    data: {
      name: 'Mohammed Irfan',
      email: 'business1@example.com',
      phone: '+91-9876543215',
      passwordHash,
      role: 'BENEFICIARY',
      address: '23, Lal Bagh, Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      isVerified: true,
      isActive: true,
    },
  });

  const beneficiary4 = await prisma.user.create({
    data: {
      name: 'Lakshmi Nair',
      email: 'business2@example.com',
      phone: '+91-9876543216',
      passwordHash,
      role: 'BENEFICIARY',
      address: '56, MG Road, Kochi',
      district: 'Ernakulam',
      state: 'Kerala',
      pincode: '682001',
      isVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Users seeded');

  // ── Seed Loans ─────────────────────────────────────────────────────────────
  const loan1 = await prisma.loan.create({
    data: {
      loanNumber: 'LL-2024-000001',
      borrowerId: beneficiary1.id,
      officerId: officer1.id,
      purpose: 'Purchase of agricultural tractor for farm operations',
      amount: 850000,
      status: 'ACTIVE',
      loanType: 'AGRICULTURAL',
      sanctionDate: new Date('2024-01-15'),
      dueDate: new Date('2027-01-15'),
      bankName: 'State Bank of India',
      branchName: 'Varanasi Main Branch',
    },
  });

  const loan2 = await prisma.loan.create({
    data: {
      loanNumber: 'LL-2024-000002',
      borrowerId: beneficiary2.id,
      officerId: officer1.id,
      purpose: 'Purchase of dairy cattle for milk production',
      amount: 250000,
      status: 'VERIFIED',
      loanType: 'LIVESTOCK',
      sanctionDate: new Date('2024-02-10'),
      dueDate: new Date('2026-02-10'),
      bankName: 'Punjab National Bank',
      branchName: 'Patiala Branch',
    },
  });

  const loan3 = await prisma.loan.create({
    data: {
      loanNumber: 'LL-2024-000003',
      borrowerId: beneficiary3.id,
      officerId: officer2.id,
      purpose: 'Purchase of commercial goods vehicle',
      amount: 1200000,
      status: 'ACTIVE',
      loanType: 'VEHICLE',
      sanctionDate: new Date('2024-03-05'),
      dueDate: new Date('2028-03-05'),
      bankName: 'HDFC Bank',
      branchName: 'Hyderabad Central Branch',
    },
  });

  const loan4 = await prisma.loan.create({
    data: {
      loanNumber: 'LL-2024-000004',
      borrowerId: beneficiary4.id,
      officerId: officer2.id,
      purpose: 'Purchase of shop inventory and business equipment',
      amount: 500000,
      status: 'REJECTED',
      loanType: 'BUSINESS',
      sanctionDate: new Date('2024-04-20'),
      dueDate: new Date('2026-04-20'),
      bankName: 'Axis Bank',
      branchName: 'Kochi Branch',
    },
  });

  const loan5 = await prisma.loan.create({
    data: {
      loanNumber: 'LL-2024-000005',
      borrowerId: beneficiary1.id,
      officerId: officer1.id,
      purpose: 'Construction of storage facility for farm produce',
      amount: 600000,
      status: 'PENDING',
      loanType: 'CONSTRUCTION',
      sanctionDate: new Date('2024-05-01'),
      dueDate: new Date('2029-05-01'),
      bankName: 'State Bank of India',
      branchName: 'Varanasi Main Branch',
    },
  });

  console.log('✅ Loans seeded');

  // ── Seed Uploads & Verifications ───────────────────────────────────────────
  const upload1 = await prisma.upload.create({
    data: {
      loanId: loan1.id,
      userId: beneficiary1.id,
      fileUrl: 'https://images.unsplash.com/photo-1605778636759-27651c645b2d?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1605778636759-27651c645b2d?w=400',
      fileType: 'IMAGE',
      mimeType: 'image/jpeg',
      fileSize: 2400000,
      fileName: 'tractor_front.jpg',
      gpsLat: 25.3176,
      gpsLng: 82.9739,
      gpsAlt: 87.5,
      gpsAccuracy: 4.2,
      capturedAt: new Date('2024-01-25T10:30:00Z'),
      deviceInfo: JSON.stringify({ brand: 'Samsung', model: 'Galaxy A52', os: 'Android 13' }),
    },
  });

  await prisma.location.create({
    data: {
      uploadId: upload1.id,
      lat: 25.3176,
      lng: 82.9739,
      address: 'Sundarpur Village, Varanasi, UP',
      district: 'Varanasi',
      state: 'Uttar Pradesh',
      pincode: '221001',
      matchesBorrowerAddress: true,
      distanceKm: 1.2,
    },
  });

  const ver1 = await prisma.verification.create({
    data: {
      uploadId: upload1.id,
      loanId: loan1.id,
      officerId: officer1.id,
      status: 'APPROVED',
      officerComment: 'Tractor clearly visible with valid registration plate. GPS matches farm location. Approved.',
      processedAt: new Date('2024-01-25T11:00:00Z'),
      decidedAt: new Date('2024-01-26T09:00:00Z'),
    },
  });

  await prisma.aiResult.create({
    data: {
      verificationId: ver1.id,
      detectedObjects: JSON.stringify([
        { label: 'Agricultural Tractor', confidence: 0.97, boundingBox: { x: 120, y: 80, w: 560, h: 340 } },
        { label: 'Farm Equipment', confidence: 0.84, boundingBox: { x: 50, y: 200, w: 200, h: 150 } },
      ]),
      fraudFlags: JSON.stringify([]),
      duplicateScore: 3.2,
      imageQualityScore: 92.5,
      metadataValid: true,
      gpsValid: true,
      timestampValid: true,
      assetMatchScore: 96.8,
      riskScore: 12,
      riskLevel: 'LOW',
      explanation: 'The image clearly shows an agricultural tractor matching the loan purpose of farm equipment purchase. GPS coordinates (25.3176°N, 82.9739°E) confirm the location is within 1.2 km of the registered borrower address. Image metadata indicates it was captured using a Samsung Galaxy A52 without any signs of editing or tampering. No duplicate images detected in our database. The overall risk assessment is LOW with high confidence in asset authenticity.',
    },
  });

  // Upload 2 (verified loan)
  const upload2 = await prisma.upload.create({
    data: {
      loanId: loan2.id,
      userId: beneficiary2.id,
      fileUrl: 'https://images.unsplash.com/photo-1546721823-b1f4d8c9af66?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546721823-b1f4d8c9af66?w=400',
      fileType: 'IMAGE',
      mimeType: 'image/jpeg',
      fileSize: 1800000,
      fileName: 'dairy_cattle.jpg',
      gpsLat: 30.3398,
      gpsLng: 76.3869,
      gpsAlt: 250.0,
      gpsAccuracy: 3.8,
      capturedAt: new Date('2024-02-20T08:15:00Z'),
      deviceInfo: JSON.stringify({ brand: 'Xiaomi', model: 'Redmi Note 11', os: 'Android 12' }),
    },
  });

  await prisma.location.create({
    data: {
      uploadId: upload2.id,
      lat: 30.3398,
      lng: 76.3869,
      address: 'Rampur Village, Patiala, Punjab',
      district: 'Patiala',
      state: 'Punjab',
      pincode: '147001',
      matchesBorrowerAddress: true,
      distanceKm: 0.8,
    },
  });

  const ver2 = await prisma.verification.create({
    data: {
      uploadId: upload2.id,
      loanId: loan2.id,
      officerId: officer1.id,
      status: 'APPROVED',
      officerComment: '3 dairy cattle confirmed. Tagging numbers visible. Approved.',
      processedAt: new Date('2024-02-20T09:00:00Z'),
      decidedAt: new Date('2024-02-21T10:00:00Z'),
    },
  });

  await prisma.aiResult.create({
    data: {
      verificationId: ver2.id,
      detectedObjects: JSON.stringify([
        { label: 'Livestock - Cattle', confidence: 0.95, boundingBox: { x: 100, y: 120, w: 400, h: 280 } },
        { label: 'Livestock - Cattle', confidence: 0.92, boundingBox: { x: 350, y: 130, w: 380, h: 260 } },
        { label: 'Livestock - Cattle', confidence: 0.88, boundingBox: { x: 20, y: 150, w: 200, h: 210 } },
      ]),
      fraudFlags: JSON.stringify([]),
      duplicateScore: 1.8,
      imageQualityScore: 88.2,
      metadataValid: true,
      gpsValid: true,
      timestampValid: true,
      assetMatchScore: 93.5,
      riskScore: 8,
      riskLevel: 'LOW',
      explanation: 'Three dairy cattle clearly identified in the image with high confidence scores. The livestock matches the stated loan purpose of dairy cattle purchase. GPS validation confirms the location is at the borrower\'s registered farm address in Patiala district. Image quality is good with no signs of manipulation or editing. Risk assessment: LOW.',
    },
  });

  // Upload 3 (high risk - pending review)
  const upload3 = await prisma.upload.create({
    data: {
      loanId: loan3.id,
      userId: beneficiary3.id,
      fileUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800',
      thumbnailUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400',
      fileType: 'IMAGE',
      mimeType: 'image/jpeg',
      fileSize: 3100000,
      fileName: 'commercial_vehicle.jpg',
      gpsLat: null,
      gpsLng: null,
      capturedAt: new Date('2024-03-15T14:22:00Z'),
      deviceInfo: JSON.stringify({ brand: 'Unknown', model: 'Unknown', os: 'Android 10' }),
    },
  });

  const ver3 = await prisma.verification.create({
    data: {
      uploadId: upload3.id,
      loanId: loan3.id,
      officerId: officer2.id,
      status: 'UNDER_REVIEW',
      processedAt: new Date('2024-03-15T15:00:00Z'),
    },
  });

  await prisma.aiResult.create({
    data: {
      verificationId: ver3.id,
      detectedObjects: JSON.stringify([
        { label: 'Commercial Vehicle', confidence: 0.78, boundingBox: { x: 50, y: 100, w: 700, h: 400 } },
      ]),
      fraudFlags: JSON.stringify([
        { type: 'METADATA_TAMPERED', severity: 'MEDIUM', description: 'GPS coordinates missing from image metadata' },
        { type: 'LOW_QUALITY', severity: 'LOW', description: 'Image resolution below recommended threshold' },
      ]),
      duplicateScore: 18.5,
      imageQualityScore: 61.3,
      metadataValid: false,
      gpsValid: false,
      timestampValid: true,
      assetMatchScore: 72.4,
      riskScore: 68,
      riskLevel: 'HIGH',
      explanation: 'A commercial vehicle is detected but with moderate confidence. CRITICAL: GPS coordinates are absent from the image metadata, making location verification impossible. The image quality score is below acceptable thresholds. Additionally, metadata analysis reveals the device information is incomplete. The duplicate similarity score of 18.5 suggests possible reuse of a previously submitted or internet-sourced image. RECOMMENDATION: Request additional geo-tagged photographs from the borrower before approval.',
    },
  });

  await prisma.officerComment.create({
    data: {
      verificationId: ver3.id,
      officerId: officer2.id,
      comment: 'GPS data missing. Vehicle plate not clearly visible. Need better quality photos with location enabled.',
    },
  });

  console.log('✅ Uploads and verifications seeded');

  // ── Seed Notifications ─────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: beneficiary1.id,
        type: 'VERIFICATION_APPROVED',
        title: 'Loan Verification Approved ✅',
        message: 'Your loan LL-2024-000001 proof of tractor purchase has been verified and approved by the loan officer.',
        isRead: true,
      },
      {
        userId: beneficiary3.id,
        type: 'MORE_EVIDENCE_REQUIRED',
        title: 'Additional Evidence Required 📸',
        message: 'Your uploaded proof for loan LL-2024-000003 requires additional geotagged photos. Please upload images with location enabled.',
        isRead: false,
      },
      {
        userId: officer2.id,
        type: 'AI_COMPLETE',
        title: 'AI Analysis Complete 🤖',
        message: 'AI has flagged a HIGH risk score (68/100) for loan LL-2024-000003. Immediate review required.',
        isRead: false,
      },
      {
        userId: admin.id,
        type: 'ALERT',
        title: 'Fraud Alert Detected ⚠️',
        message: 'Potential metadata tampering detected in upload for loan LL-2024-000003. Review recommended.',
        isRead: false,
      },
    ],
  });

  // ── Seed Audit Logs ────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: 'LOGIN', entityType: 'User', entityId: admin.id, ipAddress: '192.168.1.1', metadata: JSON.stringify({ browser: 'Chrome' }) },
      { userId: officer1.id, action: 'LOGIN', entityType: 'User', entityId: officer1.id, ipAddress: '192.168.1.5', metadata: JSON.stringify({ browser: 'Firefox' }) },
      { userId: beneficiary1.id, action: 'UPLOAD', entityType: 'Upload', entityId: upload1.id, ipAddress: '103.45.67.89', metadata: JSON.stringify({ fileName: 'tractor_front.jpg' }) },
      { userId: officer1.id, action: 'APPROVAL', entityType: 'Verification', entityId: ver1.id, ipAddress: '192.168.1.5', metadata: JSON.stringify({ comment: 'Approved' }) },
      { userId: beneficiary2.id, action: 'UPLOAD', entityType: 'Upload', entityId: upload2.id, ipAddress: '103.45.78.12', metadata: JSON.stringify({ fileName: 'dairy_cattle.jpg' }) },
      { userId: officer1.id, action: 'APPROVAL', entityType: 'Verification', entityId: ver2.id, ipAddress: '192.168.1.5', metadata: JSON.stringify({ comment: 'Approved' }) },
      { userId: beneficiary3.id, action: 'UPLOAD', entityType: 'Upload', entityId: upload3.id, ipAddress: '49.205.12.34', metadata: JSON.stringify({ fileName: 'commercial_vehicle.jpg' }) },
    ],
  });

  console.log('✅ Notifications and audit logs seeded');
  console.log('');
  console.log('🎉 SQLite Database seeded successfully!');
  console.log('');
  console.log('📋 Demo Credentials:');
  console.log('   Admin:        admin@loanlens.ai / Password@123');
  console.log('   Officer 1:    officer1@loanlens.ai / Password@123');
  console.log('   Officer 2:    officer2@loanlens.ai / Password@123');
  console.log('   Beneficiary:  farmer1@example.com / Password@123');
  console.log('   Beneficiary:  business1@example.com / Password@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
