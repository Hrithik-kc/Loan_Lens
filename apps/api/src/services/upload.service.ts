import { prisma } from '../config/database';
import { VerificationStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { firebaseStorage } from '../config/firebase';
import { mockAiService } from '../ai/mockAiService';
import { logger } from '../config/logger';

interface GeoData {
  gpsLat?: number;
  gpsLng?: number;
  gpsAlt?: number;
  gpsAccuracy?: number;
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
}

// Haversine formula to calculate distance between two lat/lng coordinates in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return parseFloat(d.toFixed(3));
}

export const uploadService = {
  async createUpload(
    loanId: string,
    userId: string,
    file: Express.Multer.File,
    geoData: GeoData
  ) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true },
    });

    if (!loan) throw new AppError('Loan not found', 404);
    if (loan.borrowerId !== userId) {
      throw new AppError('Unauthorized: This loan does not belong to you', 403);
    }

    // Determine upload type (image or video)
    const fileType = file.mimetype.startsWith('video/')
      ? 'VIDEO'
      : 'IMAGE';

    // 1. Upload file using Firebase/Mock Storage
    const pathName = `loans/${loanId}/${Date.now()}-${file.originalname}`;
    const fileUrl = await firebaseStorage.uploadFile(file.buffer, pathName, file.mimetype);

    // 2. Extract exif/gps metadata (simulating exif capture on backend if none was sent via client geolocation)
    // If client didn't supply lat/lng, we check if we can simulate one.
    // For a fully working demo, if coords are missing, we can randomly supply them or leave them null.
    // Let's rely on what was sent, but if sent we also create the Location record.
    const lat = geoData.gpsLat ? Number(geoData.gpsLat) : null;
    const lng = geoData.gpsLng ? Number(geoData.gpsLng) : null;
    const alt = geoData.gpsAlt ? Number(geoData.gpsAlt) : null;
    const acc = geoData.gpsAccuracy ? Number(geoData.gpsAccuracy) : null;

    // 3. Create database Upload record
    const upload = await prisma.upload.create({
      data: {
        loanId,
        userId,
        fileUrl,
        fileType,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.originalname,
        gpsLat: lat,
        gpsLng: lng,
        gpsAlt: alt,
        gpsAccuracy: acc,
        deviceInfo: geoData.deviceInfo ? JSON.stringify(geoData.deviceInfo) : undefined,
        ipAddress: geoData.ipAddress,
        userAgent: geoData.userAgent,
      },
    });

    // 4. Create Location details if coordinates exist
    let matchesBorrowerAddress = false;
    let distanceKm: number | null = null;

    if (lat !== null && lng !== null) {
      // Simulate borrower address coordinate calculation
      // For seed/demo purposes, we match close to Varanasi (25.3176, 82.9739) or Patiala (30.3398, 76.3869)
      // We calculate distance from a mock baseline address or register it as matching if within 5km.
      // Let's simulate a borrower registered address at:
      const borrowerLat = lat + (Math.random() - 0.5) * 0.05; // close to upload
      const borrowerLng = lng + (Math.random() - 0.5) * 0.05;

      distanceKm = calculateDistance(lat, lng, borrowerLat, borrowerLng);
      matchesBorrowerAddress = distanceKm <= 5.0; // matching if within 5 kilometers

      await prisma.location.create({
        data: {
          uploadId: upload.id,
          lat,
          lng,
          address: 'Captured Upload Location Address (Reverse Geocoded)',
          district: loan.borrower.district || 'District',
          state: loan.borrower.state || 'State',
          pincode: loan.borrower.pincode || 'Pincode',
          matchesBorrowerAddress,
          distanceKm,
        },
      });
    }

    // 5. Initialize verification record
    const verification = await prisma.verification.create({
      data: {
        uploadId: upload.id,
        loanId,
        status: VerificationStatus.PENDING,
      },
    });

    // 6. Trigger AI analysis pipeline asynchronously
    // Using simple microtask or process.nextTick for local dev background processing
    process.nextTick(async () => {
      try {
        await mockAiService.processUpload(upload.id);
      } catch (err) {
        logger.error(`Failed to process upload in background: ${upload.id}`, err);
      }
    });

    return { upload, verification };
  },

  async getUploadById(id: string) {
    const upload = await prisma.upload.findUnique({
      where: { id },
      include: { location: true, verification: { include: { aiResult: true } } },
    });
    if (!upload) throw new AppError('Upload record not found', 404);
    return upload;
  },

  async getUploadsByLoan(loanId: string) {
    return await prisma.upload.findMany({
      where: { loanId },
      include: { location: true, verification: { include: { aiResult: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async deleteUpload(id: string) {
    const upload = await prisma.upload.findUnique({ where: { id } });
    if (!upload) throw new AppError('Upload not found', 404);

    // Delete from storage
    await firebaseStorage.deleteFile(upload.fileUrl);

    // Delete record (cascade deletes verification & locations)
    await prisma.upload.delete({ where: { id } });

    return { success: true };
  },
};
